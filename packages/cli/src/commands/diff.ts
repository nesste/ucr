import { createDiffReport, loadRegistryDocument } from "@ucr/core";

import { resolveRegistryOptions } from "../context";
import type { CommandContext } from "./add";

export async function runDiffCommand(context: CommandContext): Promise<void> {
  const resolved = await resolveRegistryOptions(context);
  const registry = await loadRegistryDocument(resolved.registryRef, {
    baseDir: resolved.registryBaseDir,
  });
  const report = await createDiffReport(
    registry,
    context.itemName,
    context.targetRoot,
    context.instanceId,
    resolved.adapterId,
  );

  console.log(
    `Diff for block "${context.itemName}" instance "${context.instanceId}" from ${registry.document.name}.`,
  );
  console.log(
    `Status: =${report.summary.identical} behind=${report.summary.behind} modified=${report.summary.modified} missing=${report.summary.missing} conflict=${report.summary.conflict} untracked=${report.summary.untracked}`,
  );

  for (const skipped of report.skipped) {
    console.log(`skip       ${skipped.surface}/${skipped.target}  ${skipped.reason}`);
  }

  for (const entry of report.entries) {
    console.log(`${entry.status.padEnd(10)} ${entry.target}  ${entry.reason}`);
  }
}
