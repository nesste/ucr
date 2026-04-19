import { hashContent } from "./hash";
import { mergeText } from "./merge";
import { readTextFileIfExists, writeTextFile } from "./file-system";
import { getLockedInstall, readRegistryLock, upsertLockedInstall } from "./lock";
import { rerenderRegistryItem } from "./render";
import { getRegistryItem, resolveRegistryInstanceId } from "./resolve";
import {
  getInstalledSnapshot,
  getTrackedFile,
  readRegistryState,
  upsertInstalledSnapshot,
} from "./state";
import type { LoadedRegistry, UpgradePlan } from "./types";
import type { ProjectAdapterId } from "./adapters";

function createUpgradeSummary(): UpgradePlan["summary"] {
  return {
    create: 0,
    replace: 0,
    merge: 0,
    skip: 0,
    conflict: 0,
  };
}

export async function createUpgradePlan(
  loaded: LoadedRegistry,
  itemName: string,
  targetRoot: string,
  instanceId: string,
  configuredAdapterId?: ProjectAdapterId,
): Promise<UpgradePlan> {
  const effectiveInstanceId = resolveRegistryInstanceId(
    getRegistryItem(loaded, itemName),
    instanceId,
  );
  const lock = await readRegistryLock(targetRoot);
  const installed = getLockedInstall(lock, itemName, effectiveInstanceId);

  if (!installed) {
    throw new Error(
      `No tracked install found for "${itemName}" with instance "${instanceId}".`,
    );
  }

  if (configuredAdapterId && configuredAdapterId !== installed.adapter) {
    throw new Error(
      `Install instance "${instanceId}" was created with adapter "${installed.adapter}", not "${configuredAdapterId}".`,
    );
  }

  const state = await readRegistryState(targetRoot);
  const snapshot = getInstalledSnapshot(state, itemName, effectiveInstanceId);
  const rendered = await rerenderRegistryItem(
    loaded,
    itemName,
    effectiveInstanceId,
    installed.inputs,
    targetRoot,
    installed.adapter,
  );
  const operations: UpgradePlan["operations"] = [];
  const summary = createUpgradeSummary();

  for (const output of rendered.outputs) {
    const localContent = await readTextFileIfExists(output.targetPath);
    const trackedFile = getTrackedFile(snapshot, output.target);
    const upstreamHash = hashContent(output.content);
    const localHash = localContent === null ? null : hashContent(localContent);
    const trackedHash = trackedFile?.hash ?? null;
    const baseContent = trackedFile?.snapshot ?? null;

    let action: UpgradePlan["operations"][number]["action"];
    let reason: string;
    let trackAfterApply: boolean;
    let mergedContent: string | null = null;

    if (localHash === null) {
      action = "create";
      reason = "File is missing locally and will be created.";
      trackAfterApply = true;
    } else if (localHash === upstreamHash) {
      action = "skip";
      reason = "File is already current.";
      trackAfterApply = true;
    } else if (trackedHash === null) {
      action = "conflict";
      reason = "File differs from upstream and is not tracked for this install instance.";
      trackAfterApply = false;
    } else if (trackedHash === localHash) {
      action = "replace";
      reason = "Safe to update because local matches the last tracked upstream snapshot.";
      trackAfterApply = true;
    } else if (trackedHash === upstreamHash) {
      action = "skip";
      reason = "Only local changes were detected; upstream is unchanged.";
      trackAfterApply = false;
    } else if (baseContent === null) {
      action = "conflict";
      reason =
        "Both local and upstream changed, but no tracked upstream snapshot is available for smart merge.";
      trackAfterApply = false;
    } else {
      const mergeResult = mergeText(baseContent, localContent!, output.content);

      if (mergeResult.ok) {
        action = "merge";
        reason = mergeResult.reason;
        trackAfterApply = true;
        mergedContent = mergeResult.mergedContent;
      } else {
        action = "conflict";
        reason = mergeResult.reason;
        trackAfterApply = false;
      }
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
      baseContent,
      upstreamContent: output.content,
      localContent,
      mergedContent,
      action,
      reason,
      trackAfterApply,
    });
  }

  return {
    itemKind: installed.itemKind,
    itemName,
    instanceId: effectiveInstanceId,
    adapterId: installed.adapter,
    profile: rendered.profile,
    inputs: installed.inputs,
    compose: installed.compose,
    operations,
    skipped: rendered.skipped,
    requires: installed.requires,
    provides: installed.provides,
    summary,
  };
}

export async function applyUpgradePlan(
  loaded: LoadedRegistry,
  targetRoot: string,
  plan: UpgradePlan,
  options?: { force?: boolean },
): Promise<void> {
  const force = options?.force === true;
  const conflicts = plan.operations.filter((operation) => operation.action === "conflict");

  if (conflicts.length > 0 && !force) {
    throw new Error(
      `Upgrade aborted because ${conflicts.length} file(s) require manual review.`,
    );
  }

  const trackedFiles = [];
  const lockedFiles: string[] = [];

  for (const operation of plan.operations) {
    const shouldWrite =
      operation.action === "create" ||
      operation.action === "replace" ||
      operation.action === "merge" ||
      (force && operation.action === "conflict");

    if (shouldWrite) {
      const nextContent =
        operation.action === "merge" && operation.mergedContent !== null
          ? operation.mergedContent
          : operation.upstreamContent;
      await writeTextFile(operation.targetPath, nextContent);
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
