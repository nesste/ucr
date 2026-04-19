import {
  applyInstallPlan,
  createInstallPlan,
  loadRegistryDocument,
} from "@ucr/core";

import { resolveRegistryOptions } from "../context";

export interface CommandContext {
  registryRef: string | undefined;
  targetRoot: string;
  itemName: string;
  instanceId: string;
  rawInputs: Record<string, string>;
  force: boolean;
}

export async function runAddCommand(context: CommandContext): Promise<void> {
  const resolved = await resolveRegistryOptions(context);
  const registry = await loadRegistryDocument(resolved.registryRef, {
    baseDir: resolved.registryBaseDir,
    requestHeaders: resolved.requestHeaders,
  });
  const plan = await createInstallPlan(
    registry,
    context.itemName,
    context.targetRoot,
    context.instanceId,
    context.rawInputs,
    resolved.adapterId,
  );

  await applyInstallPlan(registry, context.targetRoot, plan, {
    force: context.force,
  });

  console.log(
    `Installed ${plan.itemKind} "${context.itemName}" as instance "${plan.instanceId}" using ${plan.adapterId}.`,
  );
  console.log(
    `Files: +${plan.summary.create} ~${plan.summary.overwrite} =${plan.summary.skip} !${plan.summary.conflict}`,
  );
  if (plan.compose.length > 0) {
    console.log(`Compose: ${plan.compose.join(", ")}`);
  }

  for (const skipped of plan.skipped) {
    console.log(`skip      ${skipped.surface}/${skipped.target}  ${skipped.reason}`);
  }

  for (const operation of plan.operations) {
    console.log(`${operation.action.padEnd(9)} ${operation.target}  ${operation.reason}`);
  }
}
