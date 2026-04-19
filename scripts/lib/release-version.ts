export interface ReleaseVersion {
  major: number;
  minor: number;
  patch: number;
}

const RELEASE_VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseReleaseVersionTag(tag: string): ReleaseVersion | null {
  const match = tag.trim().match(RELEASE_VERSION_PATTERN);

  if (!match) {
    return null;
  }

  const [, major, minor, patch] = match;

  if (!major || !minor || !patch) {
    return null;
  }

  return {
    major: Number.parseInt(major, 10),
    minor: Number.parseInt(minor, 10),
    patch: Number.parseInt(patch, 10),
  };
}

export function compareReleaseVersions(
  left: ReleaseVersion,
  right: ReleaseVersion,
): number {
  if (left.major !== right.major) {
    return left.major - right.major;
  }

  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }

  return left.patch - right.patch;
}

export function formatReleaseVersion(version: ReleaseVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

export function computeNextPatchReleaseVersion(tags: readonly string[]): string {
  const versions = tags
    .map((tag) => parseReleaseVersionTag(tag))
    .filter((version): version is ReleaseVersion => version !== null)
    .sort(compareReleaseVersions);

  const latest = versions.at(-1);

  if (!latest) {
    return "0.0.1";
  }

  return formatReleaseVersion({
    major: latest.major,
    minor: latest.minor,
    patch: latest.patch + 1,
  });
}
