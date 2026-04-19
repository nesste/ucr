import { expect, test } from "bun:test";

import {
  compareReleaseVersions,
  computeNextPatchReleaseVersion,
  formatReleaseVersion,
  parseReleaseVersionTag,
} from "../scripts/lib/release-version";

test("parseReleaseVersionTag accepts plain numeric semver tags", () => {
  expect(parseReleaseVersionTag("0.0.1")).toEqual({
    major: 0,
    minor: 0,
    patch: 1,
  });
  expect(parseReleaseVersionTag("1.24.3")).toEqual({
    major: 1,
    minor: 24,
    patch: 3,
  });
});

test("parseReleaseVersionTag rejects non-numeric or prefixed tags", () => {
  expect(parseReleaseVersionTag("")).toBeNull();
  expect(parseReleaseVersionTag("v0.0.1")).toBeNull();
  expect(parseReleaseVersionTag("release-0.0.1")).toBeNull();
  expect(parseReleaseVersionTag("0.0")).toBeNull();
});

test("compareReleaseVersions orders versions from lowest to highest", () => {
  const ordered = [
    { major: 0, minor: 0, patch: 9 },
    { major: 0, minor: 1, patch: 0 },
    { major: 1, minor: 0, patch: 0 },
  ].sort(compareReleaseVersions);

  expect(ordered.map(formatReleaseVersion)).toEqual([
    "0.0.9",
    "0.1.0",
    "1.0.0",
  ]);
});

test("computeNextPatchReleaseVersion starts at 0.0.1 and ignores unrelated tags", () => {
  expect(computeNextPatchReleaseVersion([])).toBe("0.0.1");
  expect(
    computeNextPatchReleaseVersion([
      "docs-v1",
      "v0.0.9",
      "0.0.9",
      "latest",
    ]),
  ).toBe("0.0.10");
});
