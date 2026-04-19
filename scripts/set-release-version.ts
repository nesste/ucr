import path from "node:path";

import { writeReleaseManifestVersion } from "./lib/release-manifests";

async function main(): Promise<void> {
  const nextVersion = process.argv[2]?.trim();

  if (!nextVersion) {
    throw new Error("Usage: bun run scripts/set-release-version.ts <version>");
  }

  const repoRoot = path.resolve(import.meta.dir, "..");
  await writeReleaseManifestVersion(repoRoot, nextVersion);
  console.log(`Updated release manifests to ${nextVersion}.`);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`release-manifests: ${message}`);
  process.exitCode = 1;
});
