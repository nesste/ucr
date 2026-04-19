import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { unzipSync } from "fflate";

import { assertValidRegistryDocument } from "@ucr/schema";

import { hashBytes, hashContent } from "./hash";
import type {
  LoadedRegistry,
  LoadedRegistrySource,
  RegistryTransport,
} from "./types";

export interface LoadRegistryDocumentOptions {
  baseDir?: string;
}

interface CachedRegistryMetadata {
  transport: RegistryTransport;
  source: string;
  manifestUrl: string;
  bundleUrl: string;
  bundleChecksum: string;
  registryName: string;
  registryVersion: string;
  fetchedAt: string;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function getRegistryTransport(value: string): RegistryTransport {
  if (value.startsWith("https://")) {
    return "https";
  }

  if (value.startsWith("http://")) {
    return "http";
  }

  return "file";
}

function getRegistryCacheRoot(): string {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA?.trim();

    if (localAppData) {
      return path.join(localAppData, "ucr", "registries");
    }
  }

  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Caches", "ucr", "registries");
  }

  const xdgCacheHome = process.env.XDG_CACHE_HOME?.trim();

  if (xdgCacheHome) {
    return path.join(xdgCacheHome, "ucr", "registries");
  }

  return path.join(os.homedir(), ".cache", "ucr", "registries");
}

function resolveRegistryFilePath(
  registryReference: string,
  options?: LoadRegistryDocumentOptions,
): string {
  if (path.isAbsolute(registryReference)) {
    return registryReference;
  }

  return path.resolve(options?.baseDir ?? process.cwd(), registryReference);
}

function getRegistryCacheBase(manifestUrl: string): string {
  return path.join(getRegistryCacheRoot(), hashContent(manifestUrl));
}

function createLoadedRegistry(
  registryFile: string,
  raw: string,
  source: LoadedRegistrySource,
): LoadedRegistry {
  const parsed = JSON.parse(raw) as unknown;
  const document = assertValidRegistryDocument(parsed);

  return {
    document,
    registryFile,
    rootDir: path.dirname(registryFile),
    source,
  };
}

async function fileExists(candidatePath: string): Promise<boolean> {
  try {
    await fs.access(candidatePath);
    return true;
  } catch {
    return false;
  }
}

function sanitizeZipEntryPath(entryName: string): string {
  const normalized = entryName.replace(/\\/g, "/");

  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.split("/").some((segment) => segment === "..")
  ) {
    throw new Error(`Registry bundle contains an unsafe path: ${entryName}`);
  }

  return normalized;
}

async function writeZipEntries(
  targetDir: string,
  zipContents: Record<string, Uint8Array>,
): Promise<void> {
  for (const [entryName, content] of Object.entries(zipContents)) {
    const safeRelativePath = sanitizeZipEntryPath(entryName);

    if (safeRelativePath.endsWith("/")) {
      await fs.mkdir(path.join(targetDir, safeRelativePath), { recursive: true });
      continue;
    }

    const outputPath = path.join(targetDir, safeRelativePath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content);
  }
}

async function removeDirectoryIfExists(targetDir: string): Promise<void> {
  await fs.rm(targetDir, { recursive: true, force: true });
}

async function readCachedMetadata(
  cacheDir: string,
): Promise<CachedRegistryMetadata | null> {
  const metadataFile = path.join(cacheDir, ".ucr-cache.json");

  try {
    const raw = await fs.readFile(metadataFile, "utf8");
    return JSON.parse(raw) as CachedRegistryMetadata;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function loadRegistryFromCacheDir(cacheDir: string): Promise<LoadedRegistry> {
  const registryFile = path.join(cacheDir, "registry.json");
  const raw = await fs.readFile(registryFile, "utf8");
  const metadata = await readCachedMetadata(cacheDir);

  if (!metadata) {
    throw new Error(`Cached registry at ${cacheDir} is missing metadata.`);
  }

  return createLoadedRegistry(registryFile, raw, {
    transport: metadata.transport,
    source: metadata.source,
    manifestUrl: metadata.manifestUrl,
    bundleUrl: metadata.bundleUrl,
    bundleChecksum: metadata.bundleChecksum,
    cacheDir,
  });
}

async function findNewestCachedRegistry(manifestUrl: string): Promise<string | null> {
  const sourceBaseDir = getRegistryCacheBase(manifestUrl);

  try {
    const versionEntries = await fs.readdir(sourceBaseDir, { withFileTypes: true });
    let newestCacheDir: string | null = null;
    let newestTimestamp = 0;

    for (const versionEntry of versionEntries) {
      if (!versionEntry.isDirectory()) {
        continue;
      }

      const versionDir = path.join(sourceBaseDir, versionEntry.name);
      const checksumEntries = await fs.readdir(versionDir, { withFileTypes: true });

      for (const checksumEntry of checksumEntries) {
        if (!checksumEntry.isDirectory()) {
          continue;
        }

        const cacheDir = path.join(versionDir, checksumEntry.name);
        const metadata = await readCachedMetadata(cacheDir);

        if (!metadata) {
          continue;
        }

        const timestamp = Date.parse(metadata.fetchedAt);

        if (Number.isFinite(timestamp) && timestamp > newestTimestamp) {
          newestCacheDir = cacheDir;
          newestTimestamp = timestamp;
        }
      }
    }

    return newestCacheDir;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function readLocalRegistry(
  registryReference: string,
  options?: LoadRegistryDocumentOptions,
): Promise<LoadedRegistry> {
  const registryFile = resolveRegistryFilePath(registryReference, options);
  const raw = await fs.readFile(registryFile, "utf8");

  return createLoadedRegistry(registryFile, raw, {
    transport: "file",
    source: registryReference,
    manifestUrl: registryFile,
    bundleUrl: null,
    bundleChecksum: null,
    cacheDir: null,
  });
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed for ${url} (${response.status} ${response.statusText}).`);
  }

  return await response.text();
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed for ${url} (${response.status} ${response.statusText}).`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function hydrateRemoteRegistry(
  registryReference: string,
): Promise<LoadedRegistry> {
  const manifestUrl = registryReference;
  const cacheBase = getRegistryCacheBase(manifestUrl);
  let manifestRaw: string;

  try {
    manifestRaw = await fetchText(manifestUrl);
  } catch (error) {
    const cachedDir = await findNewestCachedRegistry(manifestUrl);

    if (!cachedDir) {
      throw error;
    }

    console.warn(
      `ucr: Failed to refresh ${manifestUrl}; using the newest cached registry instead.`,
    );
    return await loadRegistryFromCacheDir(cachedDir);
  }

  const manifest = createLoadedRegistry(
    path.join(cacheBase, "latest", "registry.json"),
    manifestRaw,
    {
      transport: getRegistryTransport(manifestUrl),
      source: registryReference,
      manifestUrl,
      bundleUrl: null,
      bundleChecksum: null,
      cacheDir: null,
    },
  );

  if (!manifest.document.distribution) {
    throw new Error(
      `Remote registry ${manifestUrl} is missing "distribution" metadata.`,
    );
  }

  const bundleUrl = new URL(
    manifest.document.distribution.bundleUrl,
    manifestUrl,
  ).toString();
  const bundleChecksum = manifest.document.distribution.checksum;
  const cacheDir = path.join(cacheBase, manifest.document.version, bundleChecksum);
  const cachedRegistryFile = path.join(cacheDir, "registry.json");

  if (await fileExists(cachedRegistryFile)) {
    const cached = await loadRegistryFromCacheDir(cacheDir);

    if (
      cached.source.bundleChecksum === bundleChecksum &&
      cached.document.version === manifest.document.version
    ) {
      return cached;
    }
  }

  const bundleBytes = await fetchBytes(bundleUrl);
  const actualChecksum = hashBytes(bundleBytes);

  if (actualChecksum !== bundleChecksum) {
    throw new Error(
      `Registry bundle checksum mismatch for ${bundleUrl}. Expected ${bundleChecksum}, received ${actualChecksum}.`,
    );
  }

  const tempDir = `${cacheDir}.tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const metadata: CachedRegistryMetadata = {
    transport: getRegistryTransport(manifestUrl),
    source: registryReference,
    manifestUrl,
    bundleUrl,
    bundleChecksum,
    registryName: manifest.document.name,
    registryVersion: manifest.document.version,
    fetchedAt: new Date().toISOString(),
  };

  await removeDirectoryIfExists(tempDir);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    await writeZipEntries(tempDir, unzipSync(bundleBytes));
    await fs.writeFile(
      path.join(tempDir, "registry.json"),
      `${JSON.stringify(
        {
          ...manifest.document,
          distribution: {
            ...manifest.document.distribution,
            bundleUrl,
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await fs.writeFile(
      path.join(tempDir, ".ucr-cache.json"),
      `${JSON.stringify(metadata, null, 2)}\n`,
      "utf8",
    );

    await fs.mkdir(path.dirname(cacheDir), { recursive: true });

    try {
      await fs.rename(tempDir, cacheDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }

      await removeDirectoryIfExists(tempDir);
    }
  } catch (error) {
    await removeDirectoryIfExists(tempDir);
    throw error;
  }

  return await loadRegistryFromCacheDir(cacheDir);
}

export async function loadRegistryDocument(
  registryReference: string,
  options?: LoadRegistryDocumentOptions,
): Promise<LoadedRegistry> {
  if (isHttpUrl(registryReference)) {
    return await hydrateRemoteRegistry(registryReference);
  }

  return await readLocalRegistry(registryReference, options);
}
