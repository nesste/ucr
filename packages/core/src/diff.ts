import { hashContent } from "./hash";
import { readTextFileIfExists } from "./file-system";
import { getLockedInstall, readRegistryLock } from "./lock";
import { rerenderRegistryItem } from "./render";
import { getRegistryItem, resolveRegistryInstanceId } from "./resolve";
import { getInstalledSnapshot, getTrackedFile, readRegistryState } from "./state";
import type { DiffEntry, DiffReport, LoadedRegistry } from "./types";
import type { ProjectAdapterId } from "./adapters";

function createDiffSummary(): DiffReport["summary"] {
  return {
    missing: 0,
    identical: 0,
    modified: 0,
    behind: 0,
    conflict: 0,
    untracked: 0,
  };
}

function classifyDiffEntry(
  entry: Omit<DiffEntry, "status" | "reason">,
): Pick<DiffEntry, "status" | "reason"> {
  if (entry.localHash === null) {
    return {
      status: "missing",
      reason: "File is missing locally.",
    };
  }

  if (entry.localHash === entry.upstreamHash) {
    return {
      status: "identical",
      reason: "File matches the rendered upstream source.",
    };
  }

  if (entry.trackedHash === null) {
    return {
      status: "untracked",
      reason: "File differs from upstream and is not tracked for this install instance.",
    };
  }

  if (entry.trackedHash === entry.localHash) {
    return {
      status: "behind",
      reason: "Local file is unchanged since install, but upstream has advanced.",
    };
  }

  if (entry.trackedHash === entry.upstreamHash) {
    return {
      status: "modified",
      reason: "Only local changes were detected.",
    };
  }

  return {
    status: "conflict",
    reason: "Both local and upstream changed since the last tracked upstream snapshot.",
  };
}

export async function createDiffReport(
  loaded: LoadedRegistry,
  itemName: string,
  targetRoot: string,
  instanceId: string,
  configuredAdapterId?: ProjectAdapterId,
): Promise<DiffReport> {
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
  const entries: DiffEntry[] = [];
  const summary = createDiffSummary();

  for (const output of rendered.outputs) {
    const localContent = await readTextFileIfExists(output.targetPath);
    const trackedFile = getTrackedFile(snapshot, output.target);

    const partialEntry = {
      itemName: output.itemName,
      itemVersion: output.itemVersion,
      instanceId: output.instanceId,
      template: output.template,
      surface: output.surface,
      sourcePath: output.sourcePath,
      target: output.target,
      targetPath: output.targetPath,
      trackedHash: trackedFile?.hash ?? null,
      localHash: localContent === null ? null : hashContent(localContent),
      upstreamHash: hashContent(output.content),
    };

    const classified = classifyDiffEntry(partialEntry);
    summary[classified.status] += 1;
    entries.push({
      ...partialEntry,
      ...classified,
    });
  }

  return {
    itemKind: installed.itemKind,
    itemName,
    instanceId: effectiveInstanceId,
    adapterId: installed.adapter,
    profile: rendered.profile,
    compose: installed.compose,
    entries,
    skipped: rendered.skipped,
    requires: installed.requires,
    provides: installed.provides,
    summary,
  };
}
