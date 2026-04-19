import path from "node:path";

import {
  getSynchronizedReleaseManifestVersion,
  readReleaseManifests,
} from "./lib/release-manifests";

async function main(): Promise<void> {
  const repoRoot = path.resolve(import.meta.dir, "..");
  const manifests = await readReleaseManifests(repoRoot);
  const version = getSynchronizedReleaseManifestVersion(manifests);

  if (version) {
    console.log(version);
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`release-manifests: ${message}`);
  process.exitCode = 1;
});
