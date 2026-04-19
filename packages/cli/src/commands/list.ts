import {
  getRegistryCatalogOrder,
  getRegistryCatalogSection,
  itemSupportsAdapter,
  loadRegistryDocument,
  type RegistryCatalogSection,
} from "@ucr/core";

import { resolveRegistryOptions } from "../context";

export interface ListCommandContext {
  registryRef: string | undefined;
  targetRoot: string;
}

const SECTION_ORDER: RegistryCatalogSection[] = [
  "foundation",
  "entity-api",
  "admin-ui",
  "building-block",
];

const SECTION_LABELS: Record<RegistryCatalogSection, string> = {
  foundation: "Project Foundations",
  "entity-api": "Entity/API Flows",
  "admin-ui": "Admin UI",
  "building-block": "Building Blocks",
};

interface ListedRegistryItem {
  item: {
    name: string;
    kind: string;
    version: string;
    description?: string;
    tags?: string[];
  };
  catalogOrder: string | null;
  catalogSection: RegistryCatalogSection | null;
  compatibility: "compatible" | "incompatible";
  index: number;
}

function collapseWhitespace(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "-";
}

function formatTags(tags: readonly string[] | undefined): string {
  return tags && tags.length > 0 ? tags.join(", ") : "-";
}

function formatItemRow(entry: ListedRegistryItem): string {
  return `${entry.item.name.padEnd(22)} ${entry.item.kind.padEnd(7)} v${entry.item.version} ${collapseWhitespace(entry.item.description)} tags=${formatTags(entry.item.tags)} ${entry.compatibility}`;
}

function compareCatalogEntries(left: ListedRegistryItem, right: ListedRegistryItem): number {
  const sectionOrder =
    SECTION_ORDER.indexOf(left.catalogSection!) - SECTION_ORDER.indexOf(right.catalogSection!);

  if (sectionOrder !== 0) {
    return sectionOrder;
  }

  const catalogOrder = (left.catalogOrder ?? "").localeCompare(right.catalogOrder ?? "");

  if (catalogOrder !== 0) {
    return catalogOrder;
  }

  const nameOrder = left.item.name.localeCompare(right.item.name, "en", {
    sensitivity: "base",
  });

  if (nameOrder !== 0) {
    return nameOrder;
  }

  return left.index - right.index;
}

function registryUsesCatalog(listedItems: readonly ListedRegistryItem[]): boolean {
  return listedItems.every(
    (entry) =>
      entry.catalogSection !== null &&
      entry.catalogOrder !== null,
  );
}

export async function runListCommand(context: ListCommandContext): Promise<void> {
  const resolved = await resolveRegistryOptions(context);
  const registry = await loadRegistryDocument(resolved.registryRef, {
    baseDir: resolved.registryBaseDir,
    requestHeaders: resolved.requestHeaders,
  });

  console.log(`Registry: ${registry.document.name}`);
  console.log(`Version: ${registry.document.version}`);
  console.log(`Adapter: ${resolved.adapterId}`);
  console.log("");

  const listedItems = registry.document.items.map((item, index) => ({
    item,
    catalogOrder: getRegistryCatalogOrder(item),
    catalogSection: getRegistryCatalogSection(item),
    compatibility: itemSupportsAdapter(item.targets, resolved.adapterId)
      ? "compatible"
      : "incompatible",
    index,
  })) satisfies ListedRegistryItem[];

  if (!registryUsesCatalog(listedItems)) {
    for (const entry of listedItems) {
      console.log(formatItemRow(entry));
    }

    return;
  }

  const compatibleItems = listedItems
    .filter((entry) => entry.compatibility === "compatible")
    .sort(compareCatalogEntries);
  const incompatibleItems = listedItems
    .filter((entry) => entry.compatibility === "incompatible")
    .sort(compareCatalogEntries);

  for (const section of SECTION_ORDER) {
    const sectionItems = compatibleItems.filter(
      (entry) => entry.catalogSection === section,
    );

    if (sectionItems.length === 0) {
      continue;
    }

    console.log(SECTION_LABELS[section]);

    for (const entry of sectionItems) {
      console.log(formatItemRow(entry));
    }

    console.log("");
  }

  if (incompatibleItems.length > 0) {
    console.log("Incompatible");

    for (const entry of incompatibleItems) {
      console.log(formatItemRow(entry));
    }
  }
}
