import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

import { zipSync } from "fflate";

import { assertValidRegistryDocument } from "../packages/schema/src";

const repoRoot = path.resolve(import.meta.dir, "..");
const sourceRegistryRoot = path.join(
  repoRoot,
  "fixtures",
  "registries",
  "ucr-official",
);
const sourceRegistryFile = path.join(sourceRegistryRoot, "registry.json");
const outputRegistryRoot = path.join(
  repoRoot,
  "docs",
  "public",
  "registry",
  "ucr-official",
);
const docsPublicRoot = path.join(repoRoot, "docs", "public");
const installScriptRoot = path.join(repoRoot, "scripts", "release");

async function collectTemplateFiles(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectTemplateFiles(absolutePath)));
      continue;
    }

    files.push(absolutePath);
  }

  return files;
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

async function main(): Promise<void> {
  const rawRegistry = await fs.readFile(sourceRegistryFile, "utf8");
  const sourceDocument = assertValidRegistryDocument(
    JSON.parse(rawRegistry) as unknown,
  );
  const { $schema: _ignoredSchema, ...manifestBase } = sourceDocument;
  const versionDirName = `v${sourceDocument.version}`;
  const versionDir = path.join(outputRegistryRoot, versionDirName);
  const latestDir = path.join(outputRegistryRoot, "latest");
  const templateFiles = await collectTemplateFiles(path.join(sourceRegistryRoot, "templates"));
  const zipEntries: Record<string, Uint8Array> = {};

  for (const templateFile of templateFiles) {
    const relativePath = toPosixPath(path.relative(sourceRegistryRoot, templateFile));
    zipEntries[relativePath] = await fs.readFile(templateFile);
  }

  const versionedManifest = {
    ...manifestBase,
    distribution: {
      format: "zip" as const,
      bundleUrl: "bundle.zip",
      checksum: "",
    },
  };

  zipEntries["registry.json"] = Buffer.from(
    `${JSON.stringify(versionedManifest, null, 2)}\n`,
    "utf8",
  );

  const bundleBytes = zipSync(zipEntries, {
    level: 9,
  });
  const bundleChecksum = hashBytes(bundleBytes);

  versionedManifest.distribution.checksum = bundleChecksum;

  const latestManifest = {
    ...versionedManifest,
    distribution: {
      ...versionedManifest.distribution,
      bundleUrl: `../${versionDirName}/bundle.zip`,
    },
  };

  await fs.rm(outputRegistryRoot, { recursive: true, force: true });
  await fs.mkdir(versionDir, { recursive: true });
  await fs.mkdir(latestDir, { recursive: true });

  await fs.writeFile(path.join(versionDir, "bundle.zip"), bundleBytes);
  await fs.writeFile(
    path.join(versionDir, "registry.json"),
    `${JSON.stringify(versionedManifest, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(latestDir, "registry.json"),
    `${JSON.stringify(latestManifest, null, 2)}\n`,
    "utf8",
  );
  await fs.mkdir(docsPublicRoot, { recursive: true });
  await fs.copyFile(
    path.join(installScriptRoot, "install.sh"),
    path.join(docsPublicRoot, "install.sh"),
  );
  await fs.copyFile(
    path.join(installScriptRoot, "install.ps1"),
    path.join(docsPublicRoot, "install.ps1"),
  );

  console.log(
    `Built registry assets for ${sourceDocument.name} ${sourceDocument.version} in ${outputRegistryRoot}.`,
  );
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`registry: ${message}`);
  process.exitCode = 1;
});
