import { execFileSync } from "node:child_process";

import { computeNextPatchReleaseVersion } from "./lib/release-version";

function readGitTags(): string[] {
  const output = execFileSync("git", ["tag"], {
    encoding: "utf8",
  });

  return output
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function main(): void {
  const nextVersion = computeNextPatchReleaseVersion(readGitTags());
  console.log(nextVersion);
}

main();
