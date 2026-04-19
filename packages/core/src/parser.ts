import { promises as fs } from "node:fs";
import path from "node:path";

import { assertValidRegistryDocument } from "@ucr/schema";

import type { LoadedRegistry } from "./types";

export async function loadRegistryDocument(registryPath: string): Promise<LoadedRegistry> {
  const absoluteRegistryPath = path.resolve(registryPath);
  const raw = await fs.readFile(absoluteRegistryPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  const document = assertValidRegistryDocument(parsed);

  return {
    document,
    registryFile: absoluteRegistryPath,
    rootDir: path.dirname(absoluteRegistryPath),
  };
}
