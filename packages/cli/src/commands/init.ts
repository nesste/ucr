import {
  inspectProjectProfile,
  loadRegistryDocument,
  toProjectRegistryReference,
  writeProjectConfig,
} from "@ucr/core";

import type { ProjectAdapterId } from "@ucr/core";

export interface InitCommandContext {
  registryPath: string | undefined;
  targetRoot: string;
  adapterId: ProjectAdapterId | undefined;
}

export async function runInitCommand(context: InitCommandContext): Promise<void> {
  const profile = await inspectProjectProfile(context.targetRoot, context.adapterId);

  const registry = context.registryPath
    ? await loadRegistryDocument(context.registryPath)
    : null;

  await writeProjectConfig(context.targetRoot, {
    version: 4,
    ...(context.registryPath
      ? { registry: toProjectRegistryReference(context.targetRoot, context.registryPath) }
      : {}),
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
    console.log(
      'Registry: (not set — use --registry, set "registry" in .ucr/config.json, set UCR_REGISTRY, or rely on fixture discovery)',
    );
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
