import { promises as fs } from "node:fs";
import path from "node:path";

import { parseReleaseVersionTag } from "./release-version";

export interface ReleaseManifestRecord {
  relativePath: string;
  name: string;
  version: string;
}

export const RELEASE_MANIFEST_PATHS = [
  "package.json",
  "packages/cli/package.json",
  "packages/core/package.json",
  "packages/schema/package.json",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateManifest(
  input: unknown,
  relativePath: string,
): ReleaseManifestRecord {
  if (!isRecord(input)) {
    throw new Error(`Release manifest "${relativePath}" must be a JSON object.`);
  }

  const { name, version } = input;

  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error(`Release manifest "${relativePath}" must include a non-empty "name".`);
  }

  if (typeof version !== "string" || version.trim().length === 0) {
    throw new Error(
      `Release manifest "${relativePath}" must include a non-empty "version".`,
    );
  }

  return {
    relativePath,
    name,
    version,
  };
}

export async function readReleaseManifests(
  repoRoot: string,
): Promise<ReleaseManifestRecord[]> {
  const records: ReleaseManifestRecord[] = [];

  for (const relativePath of RELEASE_MANIFEST_PATHS) {
    const absolutePath = path.join(repoRoot, relativePath);
    const parsed = JSON.parse(await fs.readFile(absolutePath, "utf8")) as unknown;
    records.push(validateManifest(parsed, relativePath));
  }

  return records;
}

export function getSynchronizedReleaseManifestVersion(
  manifests: readonly ReleaseManifestRecord[],
): string | null {
  if (manifests.length === 0) {
    return null;
  }

  const expectedVersion = manifests[0]?.version;

  if (!expectedVersion || parseReleaseVersionTag(expectedVersion) === null) {
    return null;
  }

  if (manifests.some((manifest) => manifest.version !== expectedVersion)) {
    return null;
  }

  return expectedVersion;
}

export async function writeReleaseManifestVersion(
  repoRoot: string,
  nextVersion: string,
): Promise<void> {
  if (parseReleaseVersionTag(nextVersion) === null) {
    throw new Error(
      `Release version "${nextVersion}" must use numeric semver like 0.0.2.`,
    );
  }

  for (const relativePath of RELEASE_MANIFEST_PATHS) {
    const absolutePath = path.join(repoRoot, relativePath);
    const parsed = JSON.parse(await fs.readFile(absolutePath, "utf8")) as Record<
      string,
      unknown
    >;
    parsed.version = nextVersion;
    await fs.writeFile(absolutePath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  }
}
