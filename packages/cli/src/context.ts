import { promises as fs } from "node:fs";
import path from "node:path";

import {
  inspectProjectProfile,
  readProjectConfig,
  resolveProjectRegistryPath,
} from "@ucr/core";

import type { ProjectAdapterId } from "@ucr/core";

export interface RegistryResolutionInput {
  registryPath: string | undefined;
  targetRoot: string;
}

export interface ResolvedRegistryOptions {
  registryPath: string;
  adapterId: ProjectAdapterId;
}

const OFFICIAL_FIXTURE_REL_SEGMENTS = [
  "fixtures",
  "registries",
  "ucr-official",
  "registry.json",
] as const;

async function fileExists(candidatePath: string): Promise<boolean> {
  try {
    await fs.access(candidatePath);
    return true;
  } catch {
    return false;
  }
}

async function findOfficialFixtureUpward(startDir: string): Promise<string | null> {
  let current = path.resolve(startDir);

  for (let depth = 0; depth < 40; depth += 1) {
    const candidate = path.join(current, ...OFFICIAL_FIXTURE_REL_SEGMENTS);

    if (await fileExists(candidate)) {
      return candidate;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      return null;
    }

    current = parent;
  }

  return null;
}

async function resolveRegistryFromEnvAndDiscovery(targetRoot: string): Promise<string | null> {
  const fromEnv = process.env.UCR_REGISTRY?.trim();

  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
  }

  const roots = [path.resolve(targetRoot), path.resolve(process.cwd())];

  for (const startDir of new Set(roots)) {
    const discovered = await findOfficialFixtureUpward(startDir);

    if (discovered) {
      return discovered;
    }
  }

  return null;
}

export async function resolveRegistryOptions(
  input: RegistryResolutionInput,
): Promise<ResolvedRegistryOptions> {
  const projectConfig = await readProjectConfig(input.targetRoot);

  const registryPath =
    input.registryPath ??
    (projectConfig?.registry
      ? resolveProjectRegistryPath(input.targetRoot, projectConfig.registry)
      : await resolveRegistryFromEnvAndDiscovery(input.targetRoot));

  if (!registryPath) {
    throw new Error(
      'No registry found. Pass "--registry <path>", set "registry" in .ucr/config.json, set UCR_REGISTRY, or run from a checkout that contains fixtures/registries/ucr-official/registry.json.',
    );
  }

  const adapterId = projectConfig
    ? projectConfig.adapter
    : (await inspectProjectProfile(input.targetRoot)).adapterId;

  return {
    registryPath,
    adapterId,
  };
}
