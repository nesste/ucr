import { promises as fs } from "node:fs";
import path from "node:path";

import type { RegistryItemKind } from "@ucr/schema";

import type { ProjectAdapterId } from "./adapters";
import { normalizeStatePath } from "./file-system";
import type { LoadedRegistry, ResolvedRegistryInputs } from "./types";

export const REGISTRY_LOCK_PATH = path.join(".ucr", "lock.json");

export interface LockedRegistryInstall {
  itemKind: RegistryItemKind;
  itemName: string;
  itemVersion: string;
  instanceId: string;
  adapter: ProjectAdapterId;
  inputs: ResolvedRegistryInputs;
  compose: string[];
  requires: string[];
  provides: string[];
  files: string[];
  updatedAt: string;
}

export interface RegistryLock {
  version: 2;
  registry: {
    name: string;
    version: string;
    source: string;
  };
  installs: Record<string, LockedRegistryInstall>;
}

export interface LockedRegistryInstallUpdate {
  itemKind: RegistryItemKind;
  itemName: string;
  itemVersion: string;
  instanceId: string;
  adapter: ProjectAdapterId;
  inputs: ResolvedRegistryInputs;
  compose: string[];
  requires: string[];
  provides: string[];
  files: string[];
}

function createLock(loaded: LoadedRegistry): RegistryLock {
  return {
    version: 2,
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

export async function readRegistryLock(targetRoot: string): Promise<RegistryLock | null> {
  const filePath = path.resolve(targetRoot, REGISTRY_LOCK_PATH);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (
      !isRecord(parsed) ||
      (parsed.version !== 1 && parsed.version !== 2) ||
      !isRecord(parsed.registry) ||
      !isRecord(parsed.installs)
    ) {
      throw new Error(
        "Unsupported .ucr/lock.json version. Delete it and reinstall with the current UCR.",
      );
    }

    const installs: RegistryLock["installs"] = {};

    for (const [installKey, rawInstall] of Object.entries(parsed.installs)) {
      if (!isRecord(rawInstall)) {
        continue;
      }

      installs[installKey] = {
        itemKind:
          rawInstall.itemKind === "block" ||
          rawInstall.itemKind === "utility" ||
          rawInstall.itemKind === "preset"
            ? rawInstall.itemKind
            : "block",
        itemName: String(rawInstall.itemName ?? ""),
        itemVersion: String(rawInstall.itemVersion ?? ""),
        instanceId: String(rawInstall.instanceId ?? ""),
        adapter:
          rawInstall.adapter === "next-app-router"
            ? "next-app-router"
            : "bun-http",
        inputs:
          (rawInstall.inputs as ResolvedRegistryInputs | undefined) ?? {},
        compose: Array.isArray(rawInstall.compose)
          ? rawInstall.compose
              .filter((entry): entry is string => typeof entry === "string")
              .sort()
          : [],
        requires: Array.isArray(rawInstall.requires)
          ? rawInstall.requires
              .filter((entry): entry is string => typeof entry === "string")
              .sort()
          : [],
        provides: Array.isArray(rawInstall.provides)
          ? rawInstall.provides
              .filter((entry): entry is string => typeof entry === "string")
              .sort()
          : [],
        files: Array.isArray(rawInstall.files)
          ? rawInstall.files
              .filter((entry): entry is string => typeof entry === "string")
              .map(normalizeStatePath)
              .sort()
          : [],
        updatedAt: String(rawInstall.updatedAt ?? ""),
      };
    }

    return {
      version: 2,
      registry: {
        name: String((parsed.registry as Record<string, unknown>).name ?? ""),
        version: String((parsed.registry as Record<string, unknown>).version ?? ""),
        source: String((parsed.registry as Record<string, unknown>).source ?? ""),
      },
      installs,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function upsertLockedInstall(
  targetRoot: string,
  loaded: LoadedRegistry,
  update: LockedRegistryInstallUpdate,
): Promise<void> {
  const lock = (await readRegistryLock(targetRoot)) ?? createLock(loaded);
  lock.registry = {
    name: loaded.document.name,
    version: loaded.document.version,
    source: loaded.registryFile,
  };

  const timestamp = new Date().toISOString();
  lock.installs[getInstallKey(update.itemName, update.instanceId)] = {
    itemKind: update.itemKind,
    itemName: update.itemName,
    itemVersion: update.itemVersion,
    instanceId: update.instanceId,
    adapter: update.adapter,
    inputs: update.inputs,
    compose: [...new Set(update.compose)].sort(),
    requires: [...update.requires].sort(),
    provides: [...update.provides].sort(),
    files: [...new Set(update.files.map(normalizeStatePath))].sort(),
    updatedAt: timestamp,
  };

  const lockFile = path.resolve(targetRoot, REGISTRY_LOCK_PATH);
  await fs.mkdir(path.dirname(lockFile), { recursive: true });
  await fs.writeFile(lockFile, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
}

export function getLockedInstall(
  lock: RegistryLock | null,
  itemName: string,
  instanceId: string,
): LockedRegistryInstall | null {
  if (!lock) {
    return null;
  }

  return lock.installs[getInstallKey(itemName, instanceId)] ?? null;
}

export function collectProvidedCapabilities(lock: RegistryLock | null): Set<string> {
  const capabilities = new Set<string>();

  if (!lock) {
    return capabilities;
  }

  for (const install of Object.values(lock.installs)) {
    for (const capability of install.provides) {
      capabilities.add(capability);
    }
  }

  return capabilities;
}
