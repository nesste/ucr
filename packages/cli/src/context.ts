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
  requestHeaders: Record<string, string> | undefined;
}

const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

export function resolveRegistryRequestHeaders(): Record<string, string> | undefined {
  const rawHeader = process.env.UCR_REGISTRY_AUTH_HEADER?.trim();

  if (!rawHeader) {
    return undefined;
  }

  const separatorIndex = rawHeader.indexOf(":");

  if (separatorIndex <= 0) {
    throw new Error(
      'UCR_REGISTRY_AUTH_HEADER must use the format "Header-Name: value".',
    );
  }

  const headerName = rawHeader.slice(0, separatorIndex).trim();
  const headerValue = rawHeader.slice(separatorIndex + 1).trim();

  if (!HEADER_NAME_PATTERN.test(headerName) || headerValue.length === 0) {
    throw new Error(
      'UCR_REGISTRY_AUTH_HEADER must use the format "Header-Name: value".',
    );
  }

  if (/[\r\n]/.test(headerValue)) {
    throw new Error(
      "UCR_REGISTRY_AUTH_HEADER must not contain newline characters.",
    );
  }

  return {
    [headerName]: headerValue,
  };
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
  const requestHeaders = resolveRegistryRequestHeaders();

  return {
    registryRef,
    registryBaseDir,
    adapterId,
    requestHeaders,
  };
}
