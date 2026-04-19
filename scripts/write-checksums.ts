import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const repoRoot = path.resolve(import.meta.dir, "..");
const releaseRoot = path.join(repoRoot, "dist", "release");

async function collectFiles(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }

    if (
      entry.name.endsWith(".sha256") ||
      entry.name === "SHA256SUMS.txt"
    ) {
      continue;
    }

    files.push(absolutePath);
  }

  return files;
}

async function hashFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

async function main(): Promise<void> {
  const releaseFiles = await collectFiles(releaseRoot);
  const checksumLines: string[] = [];

  for (const filePath of releaseFiles.sort()) {
    const checksum = await hashFile(filePath);
    const relativePath = path.relative(releaseRoot, filePath).split(path.sep).join("/");
    const checksumLine = `${checksum}  ${relativePath}`;

    checksumLines.push(checksumLine);
    await fs.writeFile(`${filePath}.sha256`, `${checksumLine}\n`, "utf8");
  }

  await fs.writeFile(
    path.join(releaseRoot, "SHA256SUMS.txt"),
    `${checksumLines.join("\n")}\n`,
    "utf8",
  );

  console.log(`Wrote checksum files for ${releaseFiles.length} release asset(s).`);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`checksums: ${message}`);
  process.exitCode = 1;
});
