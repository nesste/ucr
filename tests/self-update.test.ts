import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";

import {
  resolveReleaseAsset,
  resolveStandaloneBinaryPath,
  selfUpdateBinary,
} from "../packages/cli/src/commands/self-update";

async function createReleaseServer(options: {
  assetName: string;
  binaryBytes: Uint8Array;
  checksum: string;
  releaseTag?: string;
}): Promise<{
  close: () => Promise<void>;
  releaseBaseUrl: string;
}> {
  const releaseTag = options.releaseTag ?? "latest";
  const server = createServer((request, response) => {
    const assetPath =
      releaseTag === "latest"
        ? `/latest/download/${options.assetName}`
        : `/download/${releaseTag}/${options.assetName}`;

    if (request.url === assetPath) {
      response.statusCode = 200;
      response.end(Buffer.from(options.binaryBytes));
      return;
    }

    if (request.url === `${assetPath}.sha256`) {
      response.statusCode = 200;
      response.end(`${options.checksum}  binaries/${options.assetName}\n`);
      return;
    }

    response.statusCode = 404;
    response.end("not found");
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Failed to start self-update test server.");
  }

  return {
    releaseBaseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
}

test("self-update replaces the standalone binary for non-Windows targets", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ucr-self-update-"));
  const targetPath = path.join(tempDir, "ucr");
  const binaryBytes = Buffer.from("new-ucr-binary", "utf8");
  const checksum = createHash("sha256").update(binaryBytes).digest("hex");
  const server = await createReleaseServer({
    assetName: "ucr-linux-x64",
    binaryBytes,
    checksum,
  });

  await fs.writeFile(targetPath, "old-ucr-binary", "utf8");

  try {
    const result = await selfUpdateBinary({
      requestedVersion: "latest",
      execPath: targetPath,
      platform: "linux",
      arch: "x64",
      releaseBaseUrl: server.releaseBaseUrl,
    });

    expect(result.mode).toBe("applied");
    expect(result.assetName).toBe("ucr-linux-x64");
    expect(await fs.readFile(targetPath, "utf8")).toBe("new-ucr-binary");
  } finally {
    await server.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("self-update rejects checksum mismatches without replacing the binary", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ucr-self-update-"));
  const targetPath = path.join(tempDir, "ucr");
  const binaryBytes = Buffer.from("new-ucr-binary", "utf8");
  const server = await createReleaseServer({
    assetName: "ucr-linux-x64",
    binaryBytes,
    checksum: "0".repeat(64),
  });

  await fs.writeFile(targetPath, "old-ucr-binary", "utf8");

  try {
    await expect(
      selfUpdateBinary({
        requestedVersion: "latest",
        execPath: targetPath,
        platform: "linux",
        arch: "x64",
        releaseBaseUrl: server.releaseBaseUrl,
      }),
    ).rejects.toThrow("Checksum mismatch");
    expect(await fs.readFile(targetPath, "utf8")).toBe("old-ucr-binary");
  } finally {
    await server.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("self-update schedules Windows replacements against the current executable path", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ucr-self-update-"));
  const targetPath = path.join(tempDir, "ucr.exe");
  const binaryBytes = Buffer.from("new-ucr-windows-binary", "utf8");
  const checksum = createHash("sha256").update(binaryBytes).digest("hex");
  const server = await createReleaseServer({
    assetName: "ucr-windows-x64.exe",
    binaryBytes,
    checksum,
  });
  let scheduledSourcePath = "";
  let scheduledTargetPath = "";

  await fs.writeFile(targetPath, "old-ucr-windows-binary", "utf8");

  try {
    const result = await selfUpdateBinary({
      requestedVersion: "latest",
      execPath: targetPath,
      platform: "win32",
      arch: "x64",
      releaseBaseUrl: server.releaseBaseUrl,
      scheduleWindowsReplace: async (sourcePath, destinationPath) => {
        scheduledSourcePath = sourcePath;
        scheduledTargetPath = destinationPath;
        await fs.rename(sourcePath, destinationPath);
      },
    });

    expect(result.mode).toBe("scheduled");
    expect(scheduledTargetPath).toBe(targetPath);
    expect(path.dirname(scheduledSourcePath)).toBe(tempDir);
    expect(await fs.readFile(targetPath, "utf8")).toBe("new-ucr-windows-binary");
  } finally {
    await server.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("self-update resolves supported assets and rejects non-standalone exec paths", () => {
  expect(resolveReleaseAsset("win32", "x64")).toEqual({
    assetName: "ucr-windows-x64.exe",
    platformLabel: "windows-x64",
  });
  expect(resolveReleaseAsset("darwin", "arm64")).toEqual({
    assetName: "ucr-darwin-arm64",
    platformLabel: "darwin-arm64",
  });
  expect(resolveStandaloneBinaryPath("C:\\Users\\raoul\\AppData\\Local\\ucr\\bin\\ucr.exe")).toBe(
    "C:\\Users\\raoul\\AppData\\Local\\ucr\\bin\\ucr.exe",
  );
  expect(() => resolveStandaloneBinaryPath("/usr/local/bin/node")).toThrow(
    "standalone ucr binary",
  );
});
