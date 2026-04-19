import {
  inspectProjectProfile,
  readProjectConfig,
} from "@ucr/core";

import type { ProjectAdapterId } from "@ucr/core";

import { OFFICIAL_REGISTRY_URL } from "./official-registry";

export interface RegistryResolutionInput {
  registryRef: string | undefined;
  targetRoot: string;
}

export interface ResolvedRegistryOptions {
  registryRef: string;
  registryBaseDir: string;
  adapterId: ProjectAdapterId;
}

export async function resolveRegistryOptions(
  input: RegistryResolutionInput,
): Promise<ResolvedRegistryOptions> {
  const projectConfig = await readProjectConfig(input.targetRoot);
  const envRegistryRef = process.env.UCR_REGISTRY?.trim();
  const registryRef =
    input.registryRef ??
    projectConfig?.registry ??
    envRegistryRef ??
    OFFICIAL_REGISTRY_URL;
  const registryBaseDir =
    input.registryRef !== undefined
      ? process.cwd()
      : projectConfig?.registry
        ? input.targetRoot
        : process.cwd();

  const adapterId = projectConfig
    ? projectConfig.adapter
    : (await inspectProjectProfile(input.targetRoot)).adapterId;

  return {
    registryRef,
    registryBaseDir,
    adapterId,
  };
}
