import { getProjectAdapter, itemSupportsAdapter, loadRegistryDocument } from "@ucr/core";

import { resolveRegistryOptions } from "../context";

export interface ShowCommandContext {
  registryRef: string | undefined;
  targetRoot: string;
  itemName: string;
}

export async function runShowCommand(context: ShowCommandContext): Promise<void> {
  const resolved = await resolveRegistryOptions(context);
  const registry = await loadRegistryDocument(resolved.registryRef, {
    baseDir: resolved.registryBaseDir,
    requestHeaders: resolved.requestHeaders,
  });
  const item = registry.document.items.find((candidate) => candidate.name === context.itemName);

  if (!item) {
    throw new Error(`Registry item "${context.itemName}" was not found.`);
  }

  console.log(`Item: ${item.name}`);
  console.log(`Kind: ${item.kind}`);
  console.log(`Version: ${item.version}`);
  console.log(`Category: ${item.category}`);
  console.log(`Adapter: ${resolved.adapterId}`);
  console.log(
    `Compatibility: ${itemSupportsAdapter(item.targets, resolved.adapterId) ? "compatible" : "incompatible"}`,
  );

  if (item.description) {
    console.log(`Description: ${item.description}`);
  }

  console.log(`Targets: ${item.targets.join(", ")}`);
  console.log(`Compose: ${(item.compose ?? []).join(", ") || "-"}`);
  console.log(`Requires: ${(item.requires ?? []).join(", ") || "-"}`);
  console.log(`Provides: ${(item.provides ?? []).join(", ") || "-"}`);
  console.log("");
  console.log("Inputs:");

  for (const input of item.inputs ?? []) {
    const requiredLabel = input.required ?? true ? "required" : "optional";
    console.log(
      `  ${input.name.padEnd(12)} ${input.type.padEnd(7)} ${requiredLabel}  ${input.description ?? ""}`.trimEnd(),
    );
  }

  console.log("");
  console.log("Outputs:");
  const adapter = getProjectAdapter(resolved.adapterId);

  for (const output of item.outputs) {
    const support = adapter.supportsSurface(output.surface)
      ? "supported"
      : "unsupported";
    console.log(
      `  ${output.surface.padEnd(10)} ${output.target.padEnd(18)} ${support}`,
    );
  }
}
