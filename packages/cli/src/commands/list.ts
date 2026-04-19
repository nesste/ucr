import { itemSupportsAdapter, loadRegistryDocument } from "@ucr/core";

import { resolveRegistryOptions } from "../context";

export interface ListCommandContext {
  registryRef: string | undefined;
  targetRoot: string;
}

export async function runListCommand(context: ListCommandContext): Promise<void> {
  const resolved = await resolveRegistryOptions(context);
  const registry = await loadRegistryDocument(resolved.registryRef, {
    baseDir: resolved.registryBaseDir,
  });

  console.log(`Registry: ${registry.document.name}`);
  console.log(`Version: ${registry.document.version}`);
  console.log(`Adapter: ${resolved.adapterId}`);
  console.log("");

  for (const item of registry.document.items) {
    const inputCount = (item.inputs ?? []).length;
    const composeCount = (item.compose ?? []).length;
    const compatibility = itemSupportsAdapter(item.targets, resolved.adapterId)
      ? "compatible"
      : "incompatible";
    console.log(
      `${item.name.padEnd(22)} ${item.kind.padEnd(7)} v${item.version} outputs=${item.outputs.length} inputs=${inputCount} compose=${composeCount} ${compatibility}`,
    );
  }
}
