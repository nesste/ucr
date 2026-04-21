import {
  inspectProjectProfile,
  loadRegistryDocument,
  resolveProjectRegistryPath,
  toProjectRegistryReference,
  writeProjectConfig,
} from "@ucr/core";

import type { ProjectAdapterId } from "@ucr/core";

import { resolveRegistryRequestHeaders } from "../context";
import { OFFICIAL_REGISTRY_URL } from "../official-registry";

export interface InitCommandContext {
  registryRef: string | undefined;
  targetRoot: string;
  adapterId: ProjectAdapterId | undefined;
}

export async function runInitCommand(context: InitCommandContext): Promise<void> {
  const profile = await inspectProjectProfile(context.targetRoot, context.adapterId);
  const selectedRegistryRef = context.registryRef ?? OFFICIAL_REGISTRY_URL;
  const resolvedRegistryRef = resolveProjectRegistryPath(
    process.cwd(),
    selectedRegistryRef,
  );

  const registry = context.registryRef
    ? await loadRegistryDocument(context.registryRef, {
        baseDir: process.cwd(),
        requestHeaders: resolveRegistryRequestHeaders(),
      })
    : null;

  await writeProjectConfig(context.targetRoot, {
    version: 5,
    registry: toProjectRegistryReference(context.targetRoot, resolvedRegistryRef),
    adapter: profile.adapterId,
    packageManager: profile.packageManager,
    testRunner: profile.testRunner,
    sourceRoot: profile.sourceRoot,
    appRoot: profile.appRoot,
    runtimeRoot: profile.runtimeRoot,
    utilityRoot: profile.utilityRoot,
    presetRoot: profile.presetRoot,
    capabilities: profile.capabilities,
  });

  console.log(`Initialized UCR project config in ${context.targetRoot}.`);
  if (registry) {
    console.log(`Registry: ${registry.document.name}`);
  } else {
    console.log(`Registry: ${selectedRegistryRef}`);
  }
  console.log(`Adapter: ${profile.adapterId}`);
  console.log(`Source Root: ${profile.sourceRoot}`);
  if (profile.appRoot) {
    console.log(`App Root: ${profile.appRoot}`);
  }
  console.log(`Runtime Root: ${profile.runtimeRoot}`);
  console.log(`Utility Root: ${profile.utilityRoot}`);
  console.log(`Preset Root: ${profile.presetRoot}`);
}
