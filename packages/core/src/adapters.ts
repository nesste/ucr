import { promises as fs } from "node:fs";
import path from "node:path";

import type { RegistryItem, RegistryOutput, RegistrySurface, RegistryTarget } from "@ucr/schema";

import { normalizeStatePath } from "./file-system";

export type ProjectAdapterId = "next-app-router" | "bun-http";

export interface ProjectProfile {
  adapterId: ProjectAdapterId;
  sourceRoot: string;
  appRoot: string | null;
  routeRoot: string;
  entrypointRoot: string;
  runtimeRoot: string;
  utilityRoot: string;
  presetRoot: string;
  packageManager: "bun";
  testRunner: "bun";
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

async function isBunManagedProject(
  targetRoot: string,
  manifest: PackageManifest | null,
): Promise<boolean> {
  const packageManager = manifest?.packageManager?.trim().toLowerCase() ?? "";
  if (packageManager.startsWith("bun@")) {
    return true;
  }

  return (
    (await pathExists(path.resolve(targetRoot, "bun.lock"))) ||
    (await pathExists(path.resolve(targetRoot, "bun.lockb")))
  );
}

function createCapabilities(
  adapterId: ProjectAdapterId,
  manifest: PackageManifest | null,
  sourceRoot: string,
): string[] {
  const capabilities = new Set<string>([
    "bun",
    "bun:test",
    `adapter:${adapterId}`,
    `source-root:${sourceRoot}`,
  ]);

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

const ADAPTERS: Record<ProjectAdapterId, ProjectAdapter> = {
  "next-app-router": nextAppRouterAdapter,
  "bun-http": bunHttpAdapter,
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

  if (!(await isBunManagedProject(targetRoot, manifest))) {
    throw new Error(
      "UCR v1 requires a Bun-managed project. Add bun.lock or set packageManager to bun before running `ucr init`.",
    );
  }

  const sourceRoot = await resolveSourceRoot(targetRoot);
  const dependencyMap = {
    ...(manifest?.dependencies ?? {}),
    ...(manifest?.devDependencies ?? {}),
  };
  const isNextProject = "next" in dependencyMap;

  if (preferredAdapterId === "next-app-router" && !isNextProject) {
    throw new Error(
      'Adapter "next-app-router" requires a Bun-managed Next.js project.',
    );
  }

  const adapterId = preferredAdapterId ?? (isNextProject ? "next-app-router" : "bun-http");
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
    packageManager: "bun",
    testRunner: "bun",
    capabilities: createCapabilities(adapterId, manifest, sourceRoot),
  };
}

export async function detectProjectAdapter(
  targetRoot: string,
  preferredAdapterId?: ProjectAdapterId,
): Promise<ProjectAdapter> {
  const profile = await inspectProjectProfile(targetRoot, preferredAdapterId);
  return getProjectAdapter(profile.adapterId);
}
