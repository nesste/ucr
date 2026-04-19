import { promises as fs } from "node:fs";
import path from "node:path";

import { assertValidRegistryDocument } from "../packages/schema/src/index";
import { OFFICIAL_REGISTRY_DOC_OVERLAY } from "./lib/official-registry-doc-overlay";
import {
  generateOfficialRegistryDoc,
  type OfficialRegistryDocExampleInstallSource,
  type OfficialRegistryDocExampleSource,
} from "./lib/official-registry-doc";

interface ExampleLockInstallRecord {
  itemName: string;
  instanceId: string;
  adapter: "shared" | "next-app-router" | "bun-http";
  files: string[];
}

interface ExampleLockFile {
  installs: Record<string, ExampleLockInstallRecord>;
}

const repoRoot = path.resolve(import.meta.dir, "..");
const registryFile = path.join(
  repoRoot,
  "fixtures",
  "registries",
  "ucr-official",
  "registry.json",
);
const examplesRoot = path.join(repoRoot, "examples");
const outputFile = path.join(
  repoRoot,
  "docs",
  "reference",
  "official-registry.md",
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseExampleLock(raw: unknown, exampleId: string): ExampleLockFile {
  if (!isRecord(raw) || !isRecord(raw.installs)) {
    throw new Error(`Example "${exampleId}" has an invalid .ucr/lock.json file.`);
  }

  const installs: Record<string, ExampleLockInstallRecord> = {};

  for (const [installKey, install] of Object.entries(raw.installs)) {
    if (!isRecord(install)) {
      throw new Error(`Example "${exampleId}" install "${installKey}" must be an object.`);
    }

    const { itemName, instanceId, adapter, files } = install;

    if (
      typeof itemName !== "string" ||
      typeof instanceId !== "string" ||
      (adapter !== "shared" &&
        adapter !== "next-app-router" &&
        adapter !== "bun-http") ||
      !Array.isArray(files) ||
      files.some((file) => typeof file !== "string")
    ) {
      throw new Error(
        `Example "${exampleId}" install "${installKey}" is missing required docs metadata.`,
      );
    }

    installs[installKey] = {
      itemName,
      instanceId,
      adapter,
      files,
    };
  }

  return {
    installs,
  };
}

async function loadExampleSources(): Promise<OfficialRegistryDocExampleSource[]> {
  const entries = await fs.readdir(examplesRoot, { withFileTypes: true });
  const sources: OfficialRegistryDocExampleSource[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const exampleId = entry.name;
    const lockFile = path.join(examplesRoot, exampleId, ".ucr", "lock.json");

    try {
      await fs.access(lockFile);
    } catch {
      continue;
    }

    const parsed = parseExampleLock(
      JSON.parse(await fs.readFile(lockFile, "utf8")) as unknown,
      exampleId,
    );
    const installs = Object.values(parsed.installs);

    if (installs.length === 0) {
      continue;
    }

    const adapters = new Set(installs.map((install) => install.adapter));

    if (adapters.size !== 1) {
      throw new Error(
        `Example "${exampleId}" must contain installs for exactly one adapter.`,
      );
    }

    const installSources: OfficialRegistryDocExampleInstallSource[] = installs.map(
      (install) => ({
        itemName: install.itemName,
        instanceId: install.instanceId,
        files: install.files,
      }),
    );

    sources.push({
      exampleId,
      adapter: installs[0]!.adapter,
      installs: installSources,
    });
  }

  return sources.sort((left, right) => left.exampleId.localeCompare(right.exampleId));
}

async function main(): Promise<void> {
  const registry = assertValidRegistryDocument(
    JSON.parse(await fs.readFile(registryFile, "utf8")) as unknown,
  );
  const exampleSources = await loadExampleSources();
  const content = generateOfficialRegistryDoc({
    registry,
    overlayByItemName: OFFICIAL_REGISTRY_DOC_OVERLAY,
    exampleSources,
  });

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, content, "utf8");

  console.log(`Built official registry docs page at ${outputFile}.`);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`docs-catalog: ${message}`);
  process.exitCode = 1;
});
