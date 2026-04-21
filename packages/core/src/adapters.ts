import { promises as fs } from "node:fs";
import path from "node:path";

import type { RegistryItem, RegistryOutput, RegistrySurface, RegistryTarget } from "@ucr/schema";

import { normalizeStatePath } from "./file-system";

export type ProjectAdapterId = "next-app-router" | "bun-http" | "node-http";
export type ProjectPackageManager = "bun" | "npm" | "pnpm";
export type ProjectTestRunner = "bun" | "unknown";

export interface ProjectProfile {
  adapterId: ProjectAdapterId;
  sourceRoot: string;
  appRoot: string | null;
  routeRoot: string;
  entrypointRoot: string;
  runtimeRoot: string;
  utilityRoot: string;
  presetRoot: string;
  packageManager: ProjectPackageManager;
  testRunner: ProjectTestRunner;
  capabilities: string[];
}

export interface AdapterBuildInput {
  profile: ProjectProfile;
  instanceId: string;
  resourceSegment: string;
}

export interface BuiltAdapterContext extends ProjectProfile {
  id: ProjectAdapterId;
  label: string;
  featureRoot: string;
  apiBasePath: string;
}

export interface ProjectAdapter {
  id: ProjectAdapterId;
  label: string;
  supportsSurface(surface: RegistrySurface): boolean;
  buildContext(input: AdapterBuildInput): Promise<BuiltAdapterContext>;
  mapTargetPath(
    item: RegistryItem,
    output: RegistryOutput,
    logicalTarget: string,
    context: BuiltAdapterContext,
  ): string;
}

interface PackageManifest {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readPackageManifest(targetRoot: string): Promise<PackageManifest | null> {
  try {
    const filePath = path.resolve(targetRoot, "package.json");
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as PackageManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function resolveSourceRoot(targetRoot: string): Promise<string> {
  const srcDir = path.resolve(targetRoot, "src");
  return (await pathExists(srcDir)) ? "src" : ".";
}

async function resolveNextAppRoot(targetRoot: string, sourceRoot: string): Promise<string> {
  const srcApp = path.resolve(targetRoot, "src", "app");
  if (await pathExists(srcApp)) {
    return normalizeStatePath(path.join("src", "app"));
  }

  const appDir = path.resolve(targetRoot, "app");
  if (await pathExists(appDir)) {
    return "app";
  }

  return sourceRoot === "."
    ? "app"
    : normalizeStatePath(path.join(sourceRoot, "app"));
}

async function detectProjectPackageManager(
  targetRoot: string,
  manifest: PackageManifest | null,
) : Promise<ProjectPackageManager> {
  const packageManager = manifest?.packageManager?.trim().toLowerCase() ?? "";
  if (packageManager.startsWith("bun@")) {
    return "bun";
  }

  if (packageManager.startsWith("npm@")) {
    return "npm";
  }

  if (packageManager.startsWith("pnpm@")) {
    return "pnpm";
  }

  const detectedManagers: ProjectPackageManager[] = [];

  if (
    (await pathExists(path.resolve(targetRoot, "bun.lock"))) ||
    (await pathExists(path.resolve(targetRoot, "bun.lockb")))
  ) {
    detectedManagers.push("bun");
  }

  if (await pathExists(path.resolve(targetRoot, "package-lock.json"))) {
    detectedManagers.push("npm");
  }

  if (await pathExists(path.resolve(targetRoot, "pnpm-lock.yaml"))) {
    detectedManagers.push("pnpm");
  }

  if (detectedManagers.length === 1) {
    return detectedManagers[0]!;
  }

  if (detectedManagers.length > 1) {
    throw new Error(
      "UCR could not determine the project package manager because multiple lockfiles are present. Set packageManager in package.json or keep only one supported lockfile.",
    );
  }

  throw new Error(
    "UCR requires a managed project. Set packageManager to bun, npm, or pnpm, or add a supported lockfile before running `ucr init`.",
  );
}

function createCapabilities(
  adapterId: ProjectAdapterId,
  manifest: PackageManifest | null,
  sourceRoot: string,
  packageManager: ProjectPackageManager,
  testRunner: ProjectTestRunner,
): string[] {
  const capabilities = new Set<string>([
    `adapter:${adapterId}`,
    `package-manager:${packageManager}`,
    `source-root:${sourceRoot}`,
  ]);

  if (packageManager === "bun") {
    capabilities.add("bun");
  } else {
    capabilities.add("node");
  }

  if (testRunner === "bun") {
    capabilities.add("bun:test");
  } else {
    capabilities.add("test-runner:unknown");
  }

  const allDependencies = {
    ...(manifest?.dependencies ?? {}),
    ...(manifest?.devDependencies ?? {}),
  };

  if ("next" in allDependencies) {
    capabilities.add("next");
    capabilities.add("react");
    capabilities.add("ui");
  }

  if (adapterId === "next-app-router") {
    capabilities.add("next-app-router");
    capabilities.add("transport");
    capabilities.add("ui");
  }

  if (adapterId === "bun-http") {
    capabilities.add("bun-http");
    capabilities.add("transport");
    capabilities.add("server");
  }

  if (adapterId === "node-http") {
    capabilities.add("node-http");
    capabilities.add("transport");
    capabilities.add("server");
  }

  return [...capabilities].sort();
}

const nextAppRouterAdapter: ProjectAdapter = {
  id: "next-app-router",
  label: "next-app-router",
  supportsSurface(surface): boolean {
    return surface !== "entrypoint";
  },
  async buildContext(input): Promise<BuiltAdapterContext> {
    const featureRoot =
      input.profile.sourceRoot === "."
        ? normalizeStatePath(path.join("ucr", input.instanceId))
        : normalizeStatePath(
            path.join(input.profile.sourceRoot, "ucr", input.instanceId),
          );

    return {
      ...input.profile,
      id: "next-app-router",
      label: "next-app-router",
      featureRoot,
      apiBasePath: `/api/${input.resourceSegment}`,
    };
  },
  mapTargetPath(item, output, logicalTarget, context): string {
    if (output.surface === "transport") {
      return normalizeStatePath(
        path.join(context.routeRoot, logicalTarget),
      );
    }

    if (output.surface === "ui") {
      if (!context.appRoot) {
        throw new Error("The next-app-router adapter requires an app directory.");
      }

      return normalizeStatePath(path.join(context.appRoot, logicalTarget));
    }

    if (output.surface === "entrypoint") {
      throw new Error('The "entrypoint" surface is not supported by next-app-router.');
    }

    if (output.surface === "utility") {
      const targetRoot =
        item.name === "ts-runtime" ? context.runtimeRoot : context.utilityRoot;
      return normalizeStatePath(path.join(targetRoot, logicalTarget));
    }

    if (output.surface === "preset") {
      return normalizeStatePath(path.join(context.presetRoot, logicalTarget));
    }

    return normalizeStatePath(
      path.join(context.featureRoot, output.surface, logicalTarget),
    );
  },
};

const bunHttpAdapter: ProjectAdapter = {
  id: "bun-http",
  label: "bun-http",
  supportsSurface(surface): boolean {
    return surface !== "ui";
  },
  async buildContext(input): Promise<BuiltAdapterContext> {
    const featureRoot =
      input.profile.sourceRoot === "."
        ? normalizeStatePath(path.join("ucr", input.instanceId))
        : normalizeStatePath(
            path.join(input.profile.sourceRoot, "ucr", input.instanceId),
          );

    return {
      ...input.profile,
      id: "bun-http",
      label: "bun-http",
      featureRoot,
      apiBasePath: `/${input.resourceSegment}`,
    };
  },
  mapTargetPath(item, output, logicalTarget, context): string {
    if (output.surface === "transport") {
      return normalizeStatePath(path.join(context.routeRoot, logicalTarget));
    }

    if (output.surface === "entrypoint") {
      return normalizeStatePath(
        path.join(context.entrypointRoot, logicalTarget),
      );
    }

    if (output.surface === "utility") {
      const targetRoot =
        item.name === "ts-runtime" ? context.runtimeRoot : context.utilityRoot;
      return normalizeStatePath(path.join(targetRoot, logicalTarget));
    }

    if (output.surface === "preset") {
      return normalizeStatePath(path.join(context.presetRoot, logicalTarget));
    }

    return normalizeStatePath(
      path.join(context.featureRoot, output.surface, logicalTarget),
    );
  },
};

const nodeHttpAdapter: ProjectAdapter = {
  id: "node-http",
  label: "node-http",
  supportsSurface(surface): boolean {
    return surface !== "ui";
  },
  async buildContext(input): Promise<BuiltAdapterContext> {
    const featureRoot =
      input.profile.sourceRoot === "."
        ? normalizeStatePath(path.join("ucr", input.instanceId))
        : normalizeStatePath(
            path.join(input.profile.sourceRoot, "ucr", input.instanceId),
          );

    return {
      ...input.profile,
      id: "node-http",
      label: "node-http",
      featureRoot,
      apiBasePath: `/${input.resourceSegment}`,
    };
  },
  mapTargetPath(item, output, logicalTarget, context): string {
    if (output.surface === "transport") {
      return normalizeStatePath(path.join(context.routeRoot, logicalTarget));
    }

    if (output.surface === "entrypoint") {
      return normalizeStatePath(
        path.join(context.entrypointRoot, logicalTarget),
      );
    }

    if (output.surface === "utility") {
      const targetRoot =
        item.name === "ts-runtime" ? context.runtimeRoot : context.utilityRoot;
      return normalizeStatePath(path.join(targetRoot, logicalTarget));
    }

    if (output.surface === "preset") {
      return normalizeStatePath(path.join(context.presetRoot, logicalTarget));
    }

    return normalizeStatePath(
      path.join(context.featureRoot, output.surface, logicalTarget),
    );
  },
};

const ADAPTERS: Record<ProjectAdapterId, ProjectAdapter> = {
  "next-app-router": nextAppRouterAdapter,
  "bun-http": bunHttpAdapter,
  "node-http": nodeHttpAdapter,
};

export function getProjectAdapter(adapterId: ProjectAdapterId): ProjectAdapter {
  return ADAPTERS[adapterId];
}

export function itemSupportsAdapter(
  targets: RegistryTarget[],
  adapterId: ProjectAdapterId,
): boolean {
  return targets.includes("shared") || targets.includes(adapterId);
}

export async function inspectProjectProfile(
  targetRoot: string,
  preferredAdapterId?: ProjectAdapterId,
): Promise<ProjectProfile> {
  const manifest = await readPackageManifest(targetRoot);
  const packageManager = await detectProjectPackageManager(targetRoot, manifest);
  const testRunner: ProjectTestRunner =
    packageManager === "bun" ? "bun" : "unknown";

  const sourceRoot = await resolveSourceRoot(targetRoot);
  const dependencyMap = {
    ...(manifest?.dependencies ?? {}),
    ...(manifest?.devDependencies ?? {}),
  };
  const isNextProject = "next" in dependencyMap;

  if (preferredAdapterId === "next-app-router" && !isNextProject) {
    throw new Error(
      'Adapter "next-app-router" requires a Next.js project.',
    );
  }

  if (preferredAdapterId === "bun-http" && packageManager !== "bun") {
    throw new Error(
      'Adapter "bun-http" requires a Bun-managed non-Next project.',
    );
  }

  if (preferredAdapterId === "bun-http" && isNextProject) {
    throw new Error(
      'Adapter "bun-http" is not available for Next.js projects.',
    );
  }

  if (preferredAdapterId === "node-http" && isNextProject) {
    throw new Error(
      'Adapter "node-http" is not available for Next.js projects.',
    );
  }

  if (preferredAdapterId === "node-http" && packageManager === "bun") {
    throw new Error(
      'Adapter "node-http" requires an npm- or pnpm-managed non-Next project.',
    );
  }

  const adapterId =
    preferredAdapterId ??
    (isNextProject
      ? "next-app-router"
      : packageManager === "bun"
        ? "bun-http"
        : "node-http");
  const appRoot =
    adapterId === "next-app-router"
      ? await resolveNextAppRoot(targetRoot, sourceRoot)
      : null;
  const routeRoot =
    adapterId === "next-app-router"
      ? normalizeStatePath(path.join(appRoot!, "api"))
      : sourceRoot === "."
        ? normalizeStatePath(path.join("server", "routes"))
        : normalizeStatePath(path.join(sourceRoot, "server", "routes"));
  const entrypointRoot =
    adapterId === "next-app-router"
      ? appRoot!
      : sourceRoot === "."
        ? normalizeStatePath("server")
        : normalizeStatePath(path.join(sourceRoot, "server"));
  const sharedRoot =
    sourceRoot === "."
      ? normalizeStatePath("ucr")
      : normalizeStatePath(path.join(sourceRoot, "ucr"));
  const runtimeRoot = normalizeStatePath(path.join(sharedRoot, "runtime"));
  const utilityRoot = normalizeStatePath(path.join(sharedRoot, "utilities"));
  const presetRoot = normalizeStatePath(path.join(sharedRoot, "presets"));

  return {
    adapterId,
    sourceRoot,
    appRoot,
    routeRoot,
    entrypointRoot,
    runtimeRoot,
    utilityRoot,
    presetRoot,
    packageManager,
    testRunner,
    capabilities: createCapabilities(
      adapterId,
      manifest,
      sourceRoot,
      packageManager,
      testRunner,
    ),
  };
}

export async function detectProjectAdapter(
  targetRoot: string,
  preferredAdapterId?: ProjectAdapterId,
): Promise<ProjectAdapter> {
  const profile = await inspectProjectProfile(targetRoot, preferredAdapterId);
  return getProjectAdapter(profile.adapterId);
}
