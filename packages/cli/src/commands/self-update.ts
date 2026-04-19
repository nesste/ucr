import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_GITHUB_REPOSITORY = "nesste/ucr";

export interface SelfUpdateCommandContext {
  requestedVersion: string | undefined;
}

export interface ReleaseAssetDescriptor {
  assetName: string;
  platformLabel: string;
}

export interface SelfUpdateResult {
  targetPath: string;
  assetName: string;
  requestedVersion: string;
  binaryUrl: string;
  checksum: string;
  mode: "applied" | "scheduled";
}

export interface SelfUpdateOptions {
  requestedVersion?: string;
  execPath?: string;
  platform?: NodeJS.Platform;
  arch?: string;
  repository?: string;
  releaseBaseUrl?: string;
  fetchImpl?: typeof fetch;
  scheduleWindowsReplace?: (
    sourcePath: string,
    targetPath: string,
  ) => Promise<void>;
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function parseChecksumFile(content: string): string {
  const match = content.trim().match(/^([0-9a-f]{64})\b/i);

  if (!match) {
    throw new Error("Invalid checksum file format.");
  }

  const checksum = match[1];

  if (!checksum) {
    throw new Error("Invalid checksum file format.");
  }

  return checksum.toLowerCase();
}

async function fetchBytes(
  url: string,
  fetchImpl: typeof fetch,
): Promise<Uint8Array> {
  const response = await fetchImpl(url);

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function fetchText(
  url: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const response = await fetchImpl(url);

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function writeExecutableFile(
  filePath: string,
  content: Uint8Array,
): Promise<void> {
  await fs.writeFile(filePath, content);

  if (process.platform !== "win32") {
    await fs.chmod(filePath, 0o755);
  }
}

async function scheduleWindowsBinaryReplacement(
  sourcePath: string,
  targetPath: string,
): Promise<void> {
  const scriptPath = path.join(
    os.tmpdir(),
    `ucr-self-update-${process.pid}-${Date.now()}.cmd`,
  );
  const script = [
    "@echo off",
    "setlocal",
    `set "SOURCE=${sourcePath}"`,
    `set "TARGET=${targetPath}"`,
    "for /L %%I in (1,1,60) do (",
    '  move /y "%SOURCE%" "%TARGET%" >nul 2>nul && goto done',
    "  ping 127.0.0.1 -n 2 >nul",
    ")",
    "echo ucr self-update: failed to replace the binary. 1>&2",
    ":done",
    'del "%~f0" >nul 2>nul',
  ].join("\r\n");

  await fs.writeFile(scriptPath, script, "utf8");

  const child = spawn("cmd.exe", ["/d", "/c", scriptPath], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });

  child.unref();
}

export function resolveReleaseAsset(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): ReleaseAssetDescriptor {
  if (platform === "win32" && arch === "x64") {
    return {
      assetName: "ucr-windows-x64.exe",
      platformLabel: "windows-x64",
    };
  }

  if (platform === "linux" && arch === "x64") {
    return {
      assetName: "ucr-linux-x64",
      platformLabel: "linux-x64",
    };
  }

  if (platform === "darwin" && arch === "x64") {
    return {
      assetName: "ucr-darwin-x64",
      platformLabel: "darwin-x64",
    };
  }

  if (platform === "darwin" && arch === "arm64") {
    return {
      assetName: "ucr-darwin-arm64",
      platformLabel: "darwin-arm64",
    };
  }

  throw new Error(`self-update is not supported on ${platform}/${arch}.`);
}

export function resolveStandaloneBinaryPath(
  execPath: string = process.execPath,
): string {
  const executableNames = [
    path.posix.basename(execPath).toLowerCase(),
    path.win32.basename(execPath).toLowerCase(),
  ];

  if (!executableNames.some((entry) => entry.startsWith("ucr"))) {
    throw new Error(
      "self-update is only available from the installed standalone ucr binary.",
    );
  }

  return execPath;
}

export function resolveReleaseBaseUrl(
  repository: string = process.env.UCR_GITHUB_REPOSITORY?.trim() ||
    DEFAULT_GITHUB_REPOSITORY,
  explicitBaseUrl: string | undefined = process.env.UCR_RELEASE_BASE_URL?.trim(),
): string {
  if (explicitBaseUrl && explicitBaseUrl.length > 0) {
    return trimTrailingSlashes(explicitBaseUrl);
  }

  return `https://github.com/${repository}/releases`;
}

export async function selfUpdateBinary(
  options: SelfUpdateOptions = {},
): Promise<SelfUpdateResult> {
  const requestedVersion = options.requestedVersion?.trim() || "latest";
  const targetPath = resolveStandaloneBinaryPath(options.execPath);
  const fetchImpl = options.fetchImpl ?? fetch;
  const asset = resolveReleaseAsset(options.platform, options.arch);
  const releaseBaseUrl = resolveReleaseBaseUrl(
    options.repository,
    options.releaseBaseUrl,
  );
  const binaryUrl =
    requestedVersion === "latest"
      ? `${releaseBaseUrl}/latest/download/${asset.assetName}`
      : `${releaseBaseUrl}/download/${requestedVersion}/${asset.assetName}`;
  const checksumUrl = `${binaryUrl}.sha256`;

  console.log(`Downloading ${binaryUrl}`);
  const [binaryBytes, checksumText] = await Promise.all([
    fetchBytes(binaryUrl, fetchImpl),
    fetchText(checksumUrl, fetchImpl),
  ]);
  const expectedChecksum = parseChecksumFile(checksumText);
  const actualChecksum = hashBytes(binaryBytes);

  if (actualChecksum !== expectedChecksum) {
    throw new Error(
      `Checksum mismatch for ${asset.assetName}. Expected ${expectedChecksum}, received ${actualChecksum}.`,
    );
  }

  const tempPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.next-${process.pid}-${Date.now()}`,
  );

  try {
    await writeExecutableFile(tempPath, binaryBytes);

    if ((options.platform ?? process.platform) === "win32") {
      const scheduleReplace =
        options.scheduleWindowsReplace ?? scheduleWindowsBinaryReplacement;
      await scheduleReplace(tempPath, targetPath);
      return {
        targetPath,
        assetName: asset.assetName,
        requestedVersion,
        binaryUrl,
        checksum: actualChecksum,
        mode: "scheduled",
      };
    }

    await fs.rename(tempPath, targetPath);
    return {
      targetPath,
      assetName: asset.assetName,
      requestedVersion,
      binaryUrl,
      checksum: actualChecksum,
      mode: "applied",
    };
  } catch (error) {
    await fs.rm(tempPath, { force: true });
    throw error;
  }
}

export async function runSelfUpdateCommand(
  context: SelfUpdateCommandContext,
): Promise<void> {
  const result = await selfUpdateBinary(
    context.requestedVersion
      ? {
          requestedVersion: context.requestedVersion,
        }
      : {},
  );

  console.log(`Verified SHA-256 ${result.checksum}.`);

  if (result.mode === "scheduled") {
    console.log(`Queued the updated binary for ${result.targetPath}.`);
    console.log("Run `ucr` again after this command exits.");
    return;
  }

  console.log(`Updated ucr in ${result.targetPath}.`);
}
