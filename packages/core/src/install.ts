import { hashContent } from "./hash";
import { readTextFileIfExists, writeTextFile } from "./file-system";
import { collectProvidedCapabilities, readRegistryLock, upsertLockedInstall } from "./lock";
import { renderRegistryItem } from "./render";
import {
  getRegistryItem,
  resolveRegistryComposeGraph,
  resolveRegistryInstanceId,
} from "./resolve";
import { upsertInstalledSnapshot } from "./state";
import type { LoadedRegistry, InstallPlan } from "./types";
import type { ProjectAdapterId } from "./adapters";

function createInstallSummary(): InstallPlan["summary"] {
  return {
    create: 0,
    overwrite: 0,
    skip: 0,
    conflict: 0,
  };
}

export async function createInstallPlan(
  loaded: LoadedRegistry,
  itemName: string,
  targetRoot: string,
  instanceId: string,
  rawInputs: Record<string, string>,
  preferredAdapterId?: ProjectAdapterId,
): Promise<InstallPlan> {
  const effectiveInstanceId = resolveRegistryInstanceId(
    getRegistryItem(loaded, itemName),
    instanceId,
  );
  const rendered = await renderRegistryItem(
    loaded,
    itemName,
    effectiveInstanceId,
    rawInputs,
    targetRoot,
    preferredAdapterId,
  );
  const existingLock = await readRegistryLock(targetRoot);
  const providedCapabilities = collectProvidedCapabilities(existingLock);
  const composeGraph = resolveRegistryComposeGraph(
    loaded,
    rendered.item,
    rendered.compose,
  );
  const missingRequirements = rendered.requires.filter(
    (capability) => !providedCapabilities.has(capability),
  );
  const missingComposeCapabilities = composeGraph.dependencies
    .map((dependency) => dependency.capability)
    .filter((capability) => !providedCapabilities.has(capability));

  if (composeGraph.duplicateExports.length > 0) {
    throw new Error(
      `Preset "${itemName}" has duplicate composed exports: ${composeGraph.duplicateExports.join(", ")}.`,
    );
  }

  const missingCapabilities = [
    ...missingRequirements,
    ...missingComposeCapabilities,
  ];

  if (missingCapabilities.length > 0) {
    throw new Error(
      `${rendered.item.kind} "${itemName}" requires missing capabilities: ${[...new Set(missingCapabilities)].join(", ")}.`,
    );
  }

  const operations: InstallPlan["operations"] = [];
  const summary = createInstallSummary();

  for (const output of rendered.outputs) {
    const localContent = await readTextFileIfExists(output.targetPath);

    let action: InstallPlan["operations"][number]["action"];
    let reason: string;
    let trackAfterApply: boolean;

    if (localContent === null) {
      action = "create";
      reason = "File will be created.";
      trackAfterApply = true;
    } else if (localContent === output.content) {
      action = "skip";
      reason = "File already matches the rendered upstream source.";
      trackAfterApply = true;
    } else if (output.overwrite) {
      action = "overwrite";
      reason = "Registry output is marked as overwrite-safe.";
      trackAfterApply = true;
    } else {
      action = "conflict";
      reason = "Local file already exists and differs from the rendered upstream source.";
      trackAfterApply = false;
    }

    summary[action] += 1;
    operations.push({
      itemName: output.itemName,
      itemVersion: output.itemVersion,
      instanceId: output.instanceId,
      template: output.template,
      surface: output.surface,
      sourcePath: output.sourcePath,
      target: output.target,
      targetPath: output.targetPath,
      upstreamContent: output.content,
      localContent,
      action,
      reason,
      trackAfterApply,
    });
  }

  return {
    itemKind: rendered.item.kind,
    itemName,
    instanceId: rendered.instanceId,
    adapterId: rendered.adapterId,
    profile: rendered.profile,
    inputs: rendered.inputs,
    compose: composeGraph.resolved,
    operations,
    skipped: rendered.skipped,
    requires: rendered.requires,
    provides: rendered.provides,
    summary,
  };
}

export async function applyInstallPlan(
  loaded: LoadedRegistry,
  targetRoot: string,
  plan: InstallPlan,
  options?: { force?: boolean },
): Promise<void> {
  const force = options?.force === true;
  const conflicts = plan.operations.filter((operation) => operation.action === "conflict");

  if (conflicts.length > 0 && !force) {
    throw new Error(
      `Install aborted because ${conflicts.length} file(s) would overwrite local changes.`,
    );
  }

  const trackedFiles = [];
  const lockedFiles: string[] = [];

  for (const operation of plan.operations) {
    const shouldWrite =
      operation.action === "create" ||
      operation.action === "overwrite" ||
      (force && operation.action === "conflict");

    if (shouldWrite) {
      await writeTextFile(operation.targetPath, operation.upstreamContent);
    }

    if (operation.trackAfterApply || shouldWrite) {
      trackedFiles.push({
        template: operation.template,
        surface: operation.surface,
        target: operation.target,
        hash: hashContent(operation.upstreamContent),
        snapshot: operation.upstreamContent,
        itemVersion: operation.itemVersion,
      });
      lockedFiles.push(operation.target);
    }
  }

  if (trackedFiles.length > 0) {
    await upsertLockedInstall(targetRoot, loaded, {
      itemKind: plan.itemKind,
      itemName: plan.itemName,
      itemVersion: plan.operations[0]!.itemVersion,
      instanceId: plan.instanceId,
      adapter: plan.adapterId,
      inputs: plan.inputs,
      compose: plan.compose,
      requires: plan.requires,
      provides: plan.provides,
      files: lockedFiles,
    });
    await upsertInstalledSnapshot(targetRoot, loaded, {
      itemName: plan.itemName,
      itemVersion: plan.operations[0]!.itemVersion,
      instanceId: plan.instanceId,
      adapter: plan.adapterId,
      files: trackedFiles,
    });
  }
}
