import { promises as fs } from "node:fs";
import path from "node:path";

import type { RegistrySurface } from "@ucr/schema";

import type { ProjectAdapterId } from "./adapters";
import { normalizeStatePath } from "./file-system";
import type { LoadedRegistry } from "./types";

export const REGISTRY_STATE_PATH = path.join(".ucr", "state.json");

export interface TrackedRegistryFile {
  template: string;
  surface: RegistrySurface;
  hash: string;
  snapshot: string;
  itemVersion: string;
  updatedAt: string;
}

export interface InstalledRegistrySnapshot {
  itemName: string;
  itemVersion: string;
  instanceId: string;
  adapter: ProjectAdapterId;
  files: Record<string, TrackedRegistryFile>;
  updatedAt: string;
}

export interface RegistryState {
  version: 4;
  registry: {
    name: string;
    version: string;
    source: string;
  };
  installs: Record<string, InstalledRegistrySnapshot>;
}

export interface TrackedFileUpdate {
  template: string;
  surface: RegistrySurface;
  target: string;
  hash: string;
  snapshot: string;
  itemVersion: string;
}

export interface InstalledSnapshotUpdate {
  itemName: string;
  itemVersion: string;
  instanceId: string;
  adapter: ProjectAdapterId;
  files: TrackedFileUpdate[];
}

function createState(loaded: LoadedRegistry): RegistryState {
  return {
    version: 4,
    registry: {
      name: loaded.document.name,
      version: loaded.document.version,
      source: loaded.registryFile,
    },
    installs: {},
  };
}

function getInstallKey(itemName: string, instanceId: string): string {
  return `${itemName}:${instanceId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readRegistryState(targetRoot: string): Promise<RegistryState | null> {
  const filePath = path.resolve(targetRoot, REGISTRY_STATE_PATH);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (
      !isRecord(parsed) ||
      parsed.version !== 4 ||
      !isRecord(parsed.registry) ||
      !isRecord(parsed.installs)
    ) {
      throw new Error(
        "Unsupported .ucr/state.json version. Delete it and reinstall the block with the current UCR.",
      );
    }

    return parsed as unknown as RegistryState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function upsertInstalledSnapshot(
  targetRoot: string,
  loaded: LoadedRegistry,
  update: InstalledSnapshotUpdate,
): Promise<void> {
  const state = (await readRegistryState(targetRoot)) ?? createState(loaded);
  state.registry = {
    name: loaded.document.name,
    version: loaded.document.version,
    source: loaded.registryFile,
  };

  const timestamp = new Date().toISOString();
  const files: Record<string, TrackedRegistryFile> = {};

  for (const trackedFile of update.files) {
    files[normalizeStatePath(trackedFile.target)] = {
      template: trackedFile.template,
      surface: trackedFile.surface,
      hash: trackedFile.hash,
      snapshot: trackedFile.snapshot,
      itemVersion: trackedFile.itemVersion,
      updatedAt: timestamp,
    };
  }

  state.installs[getInstallKey(update.itemName, update.instanceId)] = {
    itemName: update.itemName,
    itemVersion: update.itemVersion,
    instanceId: update.instanceId,
    adapter: update.adapter,
    files,
    updatedAt: timestamp,
  };

  const stateFile = path.resolve(targetRoot, REGISTRY_STATE_PATH);
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function getInstalledSnapshot(
  state: RegistryState | null,
  itemName: string,
  instanceId: string,
): InstalledRegistrySnapshot | null {
  if (!state) {
    return null;
  }

  return state.installs[getInstallKey(itemName, instanceId)] ?? null;
}

export function getTrackedFile(
  instance: InstalledRegistrySnapshot | null,
  target: string,
): TrackedRegistryFile | null {
  if (!instance) {
    return null;
  }

  return instance.files[normalizeStatePath(target)] ?? null;
}
