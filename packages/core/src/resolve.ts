import type { RegistryItem, RegistryItemKind } from "@ucr/schema";

import type { LoadedRegistry } from "./types";
import { renderTemplate } from "./template";

export interface ResolvedComposeDependency {
  capability: string;
  item: RegistryItem;
  exports: string[];
}

export interface ResolvedComposeGraph {
  direct: string[];
  resolved: string[];
  dependencies: ResolvedComposeDependency[];
  duplicateExports: string[];
}

export function getRegistryItem(
  loaded: LoadedRegistry,
  itemName: string,
): RegistryItem {
  const item = loaded.document.items.find((candidate) => candidate.name === itemName);

  if (!item) {
    throw new Error(`Registry item "${itemName}" was not found.`);
  }

  return item;
}

export function isReusableRegistryItem(item: RegistryItem): boolean {
  return item.kind === "utility" || item.kind === "preset";
}

export function resolveRegistryInstanceId(
  item: RegistryItem,
  instanceId: string,
): string {
  const trimmed = instanceId.trim();

  if (trimmed.length > 0) {
    return trimmed;
  }

  if (isReusableRegistryItem(item)) {
    return item.name;
  }

  throw new Error(`Missing instance id for block "${item.name}".`);
}

export function getRegistryItemCapability(
  item: Pick<RegistryItem, "kind" | "name">,
): string | null {
  if (item.kind === "utility") {
    return item.name === "ts-runtime" ? "runtime:ts" : `utility:${item.name}`;
  }

  if (item.kind === "preset") {
    return `preset:${item.name}`;
  }

  return null;
}

export function parseRegistryMetadataList(
  item: RegistryItem,
  key: string,
): string[] {
  const rawValue = item.metadata?.[key];

  if (!rawValue) {
    return [];
  }

  return [...new Set(
    rawValue
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  )];
}

export function resolveRegistryComposeNames(
  item: RegistryItem,
  context: Record<string, unknown>,
): string[] {
  if (!item.compose) {
    return [];
  }

  return [...new Set(item.compose
    .map((entry) => renderTemplate(entry, context).trim())
    .filter((entry) => entry.length > 0))];
}

function collectComposeExports(
  loaded: LoadedRegistry,
  itemNames: string[],
  trail: string[] = [],
): ResolvedComposeGraph {
  const resolved: string[] = [];
  const dependencies: ResolvedComposeDependency[] = [];
  const duplicateExports = new Set<string>();
  const seenItems = new Set<string>();
  const seenExports = new Set<string>();
  const stack: string[] = [];

  function visit(itemName: string, nextTrail: string[]): void {
    const item = getRegistryItem(loaded, itemName);

    if (!isReusableRegistryItem(item)) {
      throw new Error(
        `Preset composition only supports utility or preset items. "${item.name}" is a "${item.kind}".`,
      );
    }

    if (stack.includes(itemName)) {
      throw new Error(
        `Preset composition cycle detected: ${[...stack, itemName].join(" -> ")}.`,
      );
    }

    stack.push(itemName);

    for (const composedName of item.compose ?? []) {
      visit(composedName, [...nextTrail, itemName]);
    }

    stack.pop();

    if (seenItems.has(item.name)) {
      return;
    }

    const capability = getRegistryItemCapability(item);
    if (!capability) {
      throw new Error(`Unable to resolve install capability for "${item.name}".`);
    }

    const exportedSymbols = parseRegistryMetadataList(item, "exports");
    for (const exportedSymbol of exportedSymbols) {
      if (seenExports.has(exportedSymbol)) {
        duplicateExports.add(exportedSymbol);
      } else {
        seenExports.add(exportedSymbol);
      }
    }

    seenItems.add(item.name);
    resolved.push(item.name);
    dependencies.push({
      capability,
      item,
      exports: exportedSymbols,
    });
  }

  for (const itemName of itemNames) {
    visit(itemName, trail);
  }

  return {
    direct: [...itemNames],
    resolved,
    dependencies,
    duplicateExports: [...duplicateExports].sort(),
  };
}

export function resolveRegistryComposeGraph(
  loaded: LoadedRegistry,
  item: RegistryItem,
  composeNames: string[],
): ResolvedComposeGraph {
  if (item.kind !== "preset") {
    return {
      direct: [],
      resolved: [],
      dependencies: [],
      duplicateExports: [],
    };
  }

  return collectComposeExports(loaded, composeNames, [item.name]);
}

export function getRegistryItemKindLabel(
  kind: RegistryItemKind,
): string {
  switch (kind) {
    case "block":
      return "block";
    case "utility":
      return "utility";
    case "preset":
      return "preset";
  }
}
