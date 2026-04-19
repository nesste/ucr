import { promises as fs } from "node:fs";
import path from "node:path";

import type { ProjectAdapterId, ProjectProfile } from "./adapters";

export const PROJECT_CONFIG_PATH = path.join(".ucr", "config.json");

export interface ProjectConfig {
  version: 4;
  registry?: string;
  adapter: ProjectAdapterId;
  packageManager: ProjectProfile["packageManager"];
  testRunner: ProjectProfile["testRunner"];
  sourceRoot: string;
  appRoot?: string | null;
  runtimeRoot: string;
  utilityRoot: string;
  presetRoot: string;
  capabilities: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

export function getProjectConfigFile(targetRoot: string): string {
  return path.resolve(targetRoot, PROJECT_CONFIG_PATH);
}

export async function readProjectConfig(
  targetRoot: string,
): Promise<ProjectConfig | null> {
  const configFile = getProjectConfigFile(targetRoot);

  try {
    const raw = await fs.readFile(configFile, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) {
      throw new Error("Project config must be a JSON object.");
    }

    if (parsed.version !== 3 && parsed.version !== 4) {
      throw new Error(
        "Unsupported .ucr/config.json version. Delete it and run `ucr init` again.",
      );
    }

    if (
      "registry" in parsed &&
      parsed.registry !== undefined &&
      parsed.registry !== null &&
      !isNonEmptyString(parsed.registry)
    ) {
      throw new Error('Project config "registry" must be a non-empty string when set.');
    }

    if (parsed.adapter !== "next-app-router" && parsed.adapter !== "bun-http") {
      throw new Error(
        'Project config must include a supported "adapter" value.',
      );
    }

    if (parsed.packageManager !== "bun") {
      throw new Error('Project config must include "packageManager": "bun".');
    }

    if (parsed.testRunner !== "bun") {
      throw new Error('Project config must include "testRunner": "bun".');
    }

    if (!isNonEmptyString(parsed.sourceRoot)) {
      throw new Error('Project config must include a non-empty "sourceRoot" value.');
    }

    if (
      "appRoot" in parsed &&
      parsed.appRoot !== null &&
      !isNonEmptyString(parsed.appRoot)
    ) {
      throw new Error('Project config "appRoot" must be a string or null.');
    }

    if (!isStringArray(parsed.capabilities)) {
      throw new Error('Project config must include a "capabilities" string array.');
    }

    const defaultSharedRoot =
      parsed.sourceRoot === "."
        ? "ucr"
        : `${parsed.sourceRoot}/ucr`;
    const runtimeRoot = isNonEmptyString(parsed.runtimeRoot)
      ? parsed.runtimeRoot
      : `${defaultSharedRoot}/runtime`;
    const utilityRoot = isNonEmptyString(parsed.utilityRoot)
      ? parsed.utilityRoot
      : `${defaultSharedRoot}/utilities`;
    const presetRoot = isNonEmptyString(parsed.presetRoot)
      ? parsed.presetRoot
      : `${defaultSharedRoot}/presets`;

    return {
      ...(parsed as unknown as Omit<ProjectConfig, "version" | "runtimeRoot" | "utilityRoot" | "presetRoot">),
      version: 4,
      runtimeRoot,
      utilityRoot,
      presetRoot,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function writeProjectConfig(
  targetRoot: string,
  config: ProjectConfig,
): Promise<void> {
  const configFile = getProjectConfigFile(targetRoot);
  await fs.mkdir(path.dirname(configFile), { recursive: true });
  await fs.writeFile(configFile, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function resolveProjectRegistryPath(
  targetRoot: string,
  registryReference: string,
): string {
  if (/^https?:\/\//i.test(registryReference)) {
    return registryReference;
  }

  if (path.isAbsolute(registryReference)) {
    return registryReference;
  }

  return path.resolve(targetRoot, registryReference);
}

export function toProjectRegistryReference(
  targetRoot: string,
  registryPath: string,
): string {
  if (/^https?:\/\//i.test(registryPath)) {
    return registryPath;
  }

  const absoluteRegistryPath = path.resolve(registryPath);
  const relativeRegistryPath = path.relative(targetRoot, absoluteRegistryPath);

  if (relativeRegistryPath.length === 0) {
    return path.basename(absoluteRegistryPath);
  }

  return relativeRegistryPath.split(path.sep).join("/");
}
