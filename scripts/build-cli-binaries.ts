import { promises as fs } from "node:fs";
import path from "node:path";

const DEFAULT_OFFICIAL_REGISTRY_URL =
  "https://ucr.network/registry/ucr-official/latest/registry.json";

const repoRoot = path.resolve(import.meta.dir, "..");
const releaseRoot = path.join(repoRoot, "dist", "release");
const binaryRoot = path.join(releaseRoot, "binaries");
const entrypoint = path.join(repoRoot, "packages", "cli", "src", "bin.ts");
const installScriptRoot = path.join(repoRoot, "scripts", "release");

const targets = [
  {
    label: "linux-x64",
    bunTarget: "bun-linux-x64",
    filename: "ucr-linux-x64",
    extraArgs: [] as string[],
  },
  {
    label: "windows-x64",
    bunTarget: "bun-windows-x64",
    filename: "ucr-windows-x64.exe",
    extraArgs: ["--windows-hide-console"],
  },
  {
    label: "darwin-x64",
    bunTarget: "bun-darwin-x64",
    filename: "ucr-darwin-x64",
    extraArgs: [] as string[],
  },
  {
    label: "darwin-arm64",
    bunTarget: "bun-darwin-aarch64",
    filename: "ucr-darwin-arm64",
    extraArgs: [] as string[],
  },
];

async function main(): Promise<void> {
  const officialRegistryUrl =
    process.env.UCR_OFFICIAL_REGISTRY_URL?.trim() ||
    DEFAULT_OFFICIAL_REGISTRY_URL;
  const requestedTargets = (process.env.UCR_RELEASE_TARGETS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const activeTargets =
    requestedTargets.length > 0
      ? targets.filter((target) => requestedTargets.includes(target.label))
      : targets;

  if (activeTargets.length === 0) {
    throw new Error(
      `No release targets matched UCR_RELEASE_TARGETS=${process.env.UCR_RELEASE_TARGETS}.`,
    );
  }

  await fs.rm(releaseRoot, { recursive: true, force: true });
  await fs.mkdir(binaryRoot, { recursive: true });
  await fs.copyFile(
    path.join(installScriptRoot, "install.sh"),
    path.join(releaseRoot, "install.sh"),
  );
  await fs.copyFile(
    path.join(installScriptRoot, "install.ps1"),
    path.join(releaseRoot, "install.ps1"),
  );

  for (const target of activeTargets) {
    const outputFile = path.join(binaryRoot, target.filename);
    const command = [
      "bun",
      "build",
      "--compile",
      `--target=${target.bunTarget}`,
      `--outfile=${outputFile}`,
      "--env=UCR_OFFICIAL_REGISTRY_URL*",
      ...target.extraArgs,
      entrypoint,
    ];
    const result = Bun.spawnSync({
      cmd: command,
      cwd: repoRoot,
      env: {
        ...process.env,
        UCR_OFFICIAL_REGISTRY_URL: officialRegistryUrl,
      },
      stdout: "inherit",
      stderr: "inherit",
    });

    if (result.exitCode !== 0) {
      throw new Error(`Binary build failed for ${target.label}.`);
    }
  }

  console.log(`Built CLI binaries in ${binaryRoot}.`);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`release: ${message}`);
  process.exitCode = 1;
});
