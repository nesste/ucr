import { expect, test } from "bun:test";

import { getSynchronizedReleaseManifestVersion } from "../scripts/lib/release-manifests";

test("getSynchronizedReleaseManifestVersion returns the shared numeric version", () => {
  expect(
    getSynchronizedReleaseManifestVersion([
      {
        relativePath: "package.json",
        name: "root",
        version: "0.0.2",
      },
      {
        relativePath: "packages/cli/package.json",
        name: "@ucr/cli",
        version: "0.0.2",
      },
    ]),
  ).toBe("0.0.2");
});

test("getSynchronizedReleaseManifestVersion rejects unsynced or unsupported values", () => {
  expect(
    getSynchronizedReleaseManifestVersion([
      {
        relativePath: "package.json",
        name: "root",
        version: "0.0.2",
      },
      {
        relativePath: "packages/cli/package.json",
        name: "@ucr/cli",
        version: "0.0.3",
      },
    ]),
  ).toBeNull();

  expect(
    getSynchronizedReleaseManifestVersion([
      {
        relativePath: "package.json",
        name: "root",
        version: "v0.0.2",
      },
    ]),
  ).toBeNull();
});
