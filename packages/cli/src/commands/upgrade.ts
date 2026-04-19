import { applyUpgradePlan, createUpgradePlan, loadRegistryDocument } from "@ucr/core";

import { resolveRegistryOptions } from "../context";
import type { CommandContext } from "./add";

export async function runUpgradeCommand(context: CommandContext): Promise<void> {
  const resolved = await resolveRegistryOptions(context);
  const registry = await loadRegistryDocument(resolved.registryRef, {
    baseDir: resolved.registryBaseDir,
  });
  const plan = await createUpgradePlan(
    registry,
    context.itemName,
    context.targetRoot,
    context.instanceId,
    resolved.adapterId,
  );

  console.log(
    `Upgrade plan for block "${context.itemName}" instance "${context.instanceId}" from ${registry.document.name}.`,
  );
  console.log(
    `Files: +${plan.summary.create} ~${plan.summary.replace} m${plan.summary.merge} =${plan.summary.skip} !${plan.summary.conflict}`,
  );

  for (const skipped of plan.skipped) {
    console.log(`skip      ${skipped.surface}/${skipped.target}  ${skipped.reason}`);
  }

  for (const operation of plan.operations) {
    console.log(`${operation.action.padEnd(9)} ${operation.target}  ${operation.reason}`);
  }

  if (!context.force) {
    const conflicts = plan.operations.filter((operation) => operation.action === "conflict");

    for (const conflict of conflicts) {
      console.error(`conflict   ${conflict.target}  ${conflict.reason}`);
    }
  }

  await applyUpgradePlan(registry, context.targetRoot, plan, {
    force: context.force,
  });
}
