import type {
  RegistryDocument,
  RegistryItem,
  RegistryItemKind,
  RegistryTarget,
} from "../../packages/schema/src/index";

export interface OfficialRegistryDocOverlayEntry {
  itemName: string;
  useWhen: string;
  sampleInstanceId?: string;
  sampleInputs?: Record<string, string>;
  sampleInputFiles?: Record<string, string>;
  recipeNote?: string;
  exampleNote?: string;
}

export interface OfficialRegistryDocExampleSource {
  exampleId: string;
  adapter: RegistryTarget;
  installs: OfficialRegistryDocExampleInstallSource[];
}

export interface OfficialRegistryDocExampleInstallSource {
  itemName: string;
  instanceId: string;
  files: string[];
}

export interface OfficialRegistryDocExampleInstall {
  exampleId: string;
  adapter: RegistryTarget;
  instanceId: string;
  files: string[];
}

export interface GenerateOfficialRegistryDocOptions {
  registry: RegistryDocument;
  overlayByItemName: Record<string, OfficialRegistryDocOverlayEntry>;
  exampleSources: OfficialRegistryDocExampleSource[];
}

type CatalogSection = "foundation" | "entity-api" | "admin-ui" | "building-block";

const ALLOWED_OVERLAY_KEYS = new Set([
  "itemName",
  "useWhen",
  "sampleInstanceId",
  "sampleInputs",
  "sampleInputFiles",
  "recipeNote",
  "exampleNote",
]);

const KIND_ORDER: RegistryItemKind[] = ["utility", "preset", "block"];
const TARGET_ORDER: RegistryTarget[] = ["shared", "next-app-router", "bun-http"];
const KIND_LABELS: Record<RegistryItemKind, string> = {
  utility: "Utilities",
  preset: "Presets",
  block: "Blocks",
};
const CATALOG_SECTION_ORDER: CatalogSection[] = [
  "foundation",
  "entity-api",
  "admin-ui",
  "building-block",
];
const CATALOG_SECTION_LABELS: Record<CatalogSection, string> = {
  foundation: "Project Foundations",
  "entity-api": "Entity/API Flows",
  "admin-ui": "Admin UI",
  "building-block": "Building Blocks",
};
const VALID_CATALOG_SECTIONS = new Set<CatalogSection>(CATALOG_SECTION_ORDER);

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "en", {
    sensitivity: "base",
  });
}

function toPosixPath(value: string): string {
  return value.replaceAll("\\", "/");
}

function formatCodeList(values: readonly string[]): string {
  return values.map((value) => `\`${value}\``).join(", ");
}

function formatTable(headers: readonly string[], rows: readonly string[][]): string {
  const headerLine = `| ${headers.join(" | ")} |`;
  const dividerLine = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.join(" | ")} |`);

  return [headerLine, dividerLine, ...body].join("\n");
}

function formatRequiredFlag(required?: boolean): string {
  return required === false ? "no" : "yes";
}

function parseExports(item: RegistryItem): string[] {
  const rawExports = item.metadata?.exports;

  if (!rawExports) {
    return [];
  }

  return rawExports
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function getImportPath(item: RegistryItem): string | null {
  if (item.kind === "utility") {
    if (item.name === "ts-runtime") {
      return "<ucr-root>/runtime";
    }

    return `<ucr-root>/utilities/${item.name}`;
  }

  if (item.kind === "preset") {
    return `<ucr-root>/presets/${item.name}`;
  }

  return null;
}

function getCatalogSection(item: RegistryItem): CatalogSection | null {
  const rawValue = item.metadata?.catalogSection?.trim();

  if (!rawValue || !VALID_CATALOG_SECTIONS.has(rawValue as CatalogSection)) {
    return null;
  }

  return rawValue as CatalogSection;
}

function getCatalogOrder(item: RegistryItem): string | null {
  const rawValue = item.metadata?.catalogOrder?.trim();
  return rawValue && rawValue.length > 0 ? rawValue : null;
}

function getTargetCount(registry: RegistryDocument, target: RegistryTarget): number {
  return registry.items.filter((item) => item.targets.includes(target)).length;
}

function getCategoryCounts(
  registry: RegistryDocument,
): Array<{ kind: RegistryItemKind; category: string; count: number }> {
  const counts = new Map<string, { kind: RegistryItemKind; category: string; count: number }>();

  for (const item of registry.items) {
    const key = `${item.kind}:${item.category}`;
    const existing = counts.get(key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    counts.set(key, {
      kind: item.kind,
      category: item.category,
      count: 1,
    });
  }

  return [...counts.values()].sort((left, right) => {
    const kindOrder =
      KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind);

    if (kindOrder !== 0) {
      return kindOrder;
    }

    return compareText(left.category, right.category);
  });
}

function validateOverlayEntry(
  key: string,
  entry: OfficialRegistryDocOverlayEntry | undefined,
  errors: string[],
): void {
  if (!entry) {
    errors.push(`Missing docs overlay entry for "${key}".`);
    return;
  }

  if (entry.itemName !== key) {
    errors.push(
      `Docs overlay entry "${key}" must repeat the same item name in "itemName".`,
    );
  }

  if (entry.useWhen.trim().length === 0) {
    errors.push(`Docs overlay entry "${key}" must include non-empty "useWhen".`);
  }

  for (const fieldName of Object.keys(entry)) {
    if (!ALLOWED_OVERLAY_KEYS.has(fieldName)) {
      errors.push(`Docs overlay entry "${key}" includes unsupported field "${fieldName}".`);
    }
  }
}

export function validateOfficialRegistryDocOverlay(
  registry: RegistryDocument,
  overlayByItemName: Record<string, OfficialRegistryDocOverlayEntry>,
): string[] {
  const errors: string[] = [];
  const registryItemNames = new Set(registry.items.map((item) => item.name));

  for (const itemName of registryItemNames) {
    validateOverlayEntry(itemName, overlayByItemName[itemName], errors);
  }

  for (const overlayName of Object.keys(overlayByItemName).sort(compareText)) {
    if (!registryItemNames.has(overlayName)) {
      errors.push(
        `Docs overlay entry "${overlayName}" does not exist in the official registry manifest.`,
      );
    }
  }

  return errors;
}

export function collectExampleInstallsByItemName(
  exampleSources: readonly OfficialRegistryDocExampleSource[],
): Record<string, OfficialRegistryDocExampleInstall[]> {
  const installsByItemName = new Map<string, OfficialRegistryDocExampleInstall[]>();

  for (const source of exampleSources) {
    for (const install of source.installs) {
      const current = installsByItemName.get(install.itemName) ?? [];
      current.push({
        exampleId: source.exampleId,
        adapter: source.adapter,
        instanceId: install.instanceId,
        files: install.files.map(toPosixPath).sort(compareText),
      });
      installsByItemName.set(install.itemName, current);
    }
  }

  const result: Record<string, OfficialRegistryDocExampleInstall[]> = {};

  for (const [itemName, installs] of installsByItemName.entries()) {
    result[itemName] = installs.sort((left, right) => {
      const exampleOrder = compareText(left.exampleId, right.exampleId);

      if (exampleOrder !== 0) {
        return exampleOrder;
      }

      return compareText(left.instanceId, right.instanceId);
    });
  }

  return result;
}

function buildCommandRecipe(
  item: RegistryItem,
  overlay: OfficialRegistryDocOverlayEntry,
): string {
  const command = ["ucr", "add", item.name, "--target", "."];

  if (item.kind === "block") {
    command.push("--instance", overlay.sampleInstanceId ?? "sample");
  }

  if (item.inputs) {
    const sampleInputs = overlay.sampleInputs ?? {};
    const sampleInputFiles = overlay.sampleInputFiles ?? {};

    for (const input of item.inputs) {
      if (sampleInputFiles[input.name]) {
        command.push("--input-file", `${input.name}=${sampleInputFiles[input.name]}`);
        continue;
      }

      if (sampleInputs[input.name]) {
        command.push("--input", `${input.name}=${sampleInputs[input.name]}`);
        continue;
      }

      if (input.required !== false) {
        throw new Error(
          `Docs overlay entry "${item.name}" is missing a sample value for required input "${input.name}".`,
        );
      }
    }
  }

  return command.join(" ");
}

function renderListField(label: string, values: readonly string[] | undefined): string {
  if (!values || values.length === 0) {
    return `- ${label}: -`;
  }

  return `- ${label}: ${formatCodeList(values)}`;
}

function compareCatalogItems(left: RegistryItem, right: RegistryItem): number {
  const leftSection = getCatalogSection(left);
  const rightSection = getCatalogSection(right);

  if (leftSection && rightSection) {
    const sectionOrder =
      CATALOG_SECTION_ORDER.indexOf(leftSection) -
      CATALOG_SECTION_ORDER.indexOf(rightSection);

    if (sectionOrder !== 0) {
      return sectionOrder;
    }
  }

  const orderComparison = (getCatalogOrder(left) ?? "").localeCompare(
    getCatalogOrder(right) ?? "",
  );

  if (orderComparison !== 0) {
    return orderComparison;
  }

  return compareText(left.name, right.name);
}

function renderExampleInstalls(
  examples: readonly OfficialRegistryDocExampleInstall[],
  overlay: OfficialRegistryDocOverlayEntry,
): string[] {
  if (examples.length === 0) {
    return [
      "**Checked-in examples**",
      "",
      overlay.exampleNote ??
        "No checked-in example install yet. Use `ucr show` against your target project to confirm the resolved output paths before installing it.",
    ];
  }

  return [
    "**Checked-in examples**",
    "",
    ...examples.map((example) => {
      const files = example.files.map((file) => `\`${file}\``).join(", ");
      return `- \`${example.exampleId}\` (${example.adapter}, instance \`${example.instanceId}\`): ${files}`;
    }),
  ];
}

function renderInputs(item: RegistryItem): string[] {
  if (!item.inputs || item.inputs.length === 0) {
    return ["**Inputs**", "", "This item does not declare typed inputs."];
  }

  const rows = item.inputs.map((input) => [
    `\`${input.name}\``,
    `\`${input.type}\``,
    formatRequiredFlag(input.required),
    input.description ?? "-",
  ]);

  return [
    "**Inputs**",
    "",
    formatTable(["Name", "Type", "Required", "Description"], rows),
  ];
}

function renderOutputs(item: RegistryItem): string[] {
  const rows = item.outputs.map((output) => [
    `\`${output.surface}\``,
    `\`${output.target}\``,
    `\`${output.template}\``,
  ]);

  return [
    "**Outputs**",
    "",
    formatTable(["Surface", "Logical target", "Template"], rows),
  ];
}

function renderImportDetails(item: RegistryItem): string[] {
  const importPath = getImportPath(item);
  const exportedHelpers = parseExports(item);

  if (!importPath) {
    return [];
  }

  const lines = [`- Import path: \`${importPath}\``];

  if (exportedHelpers.length > 0) {
    lines.push(`- Exported helpers: ${formatCodeList(exportedHelpers)}`);
  }

  return lines;
}

function renderItemSection(
  item: RegistryItem,
  overlay: OfficialRegistryDocOverlayEntry,
  examples: readonly OfficialRegistryDocExampleInstall[],
): string[] {
  const lines = [
    `### \`${item.name}\``,
    "",
    item.description ?? "No description provided.",
    "",
    `**When to use it:** ${overlay.useWhen}`,
    "",
    "- Kind: " + `\`${item.kind}\``,
    "- Category: " + `\`${item.category}\``,
    "- Targets: " + formatCodeList(item.targets),
    renderListField("Tags", item.tags),
    ...renderImportDetails(item),
    renderListField("Requires", item.requires),
    renderListField("Provides", item.provides),
  ];

  if (item.compose) {
    lines.push(renderListField("Composes", item.compose));
  }

  if (item.entrypoints) {
    lines.push(renderListField("Entrypoints", item.entrypoints));
  }

  lines.push(
    "",
    ...renderInputs(item),
    "",
    ...renderOutputs(item),
    "",
    "**Usage recipe**",
    "",
    "```bash",
    buildCommandRecipe(item, overlay),
    "```",
  );

  if (overlay.recipeNote) {
    lines.push("", overlay.recipeNote);
  }

  lines.push("", ...renderExampleInstalls(examples, overlay), "");

  return lines;
}

function renderRecommendedByWorkflow(
  registry: RegistryDocument,
  overlayByItemName: Record<string, OfficialRegistryDocOverlayEntry>,
): string[] {
  const catalogItems = registry.items.filter(
    (item) => getCatalogSection(item) !== null && getCatalogOrder(item) !== null,
  );

  if (catalogItems.length === 0) {
    return [];
  }

  const lines = [
    "## Recommended By Workflow",
    "",
    "Use this section as the default browsing path in `ucr list`: foundations first, adapter-specific API flows second, and admin UI last for Next projects.",
    "",
  ];

  for (const section of CATALOG_SECTION_ORDER) {
    const sectionItems = catalogItems
      .filter((item) => getCatalogSection(item) === section)
      .sort(compareCatalogItems);

    if (sectionItems.length === 0) {
      continue;
    }

    lines.push(`### ${CATALOG_SECTION_LABELS[section]}`, "");

    for (const item of sectionItems) {
      lines.push(
        `- \`${item.name}\`: ${overlayByItemName[item.name]?.useWhen ?? item.description ?? "No description provided."}`,
      );
    }

    lines.push("");
  }

  return lines;
}

function renderSummary(registry: RegistryDocument): string[] {
  const kindRows = KIND_ORDER.map((kind) => [
    `\`${kind}\``,
    String(registry.items.filter((item) => item.kind === kind).length),
  ]);
  const categoryRows = getCategoryCounts(registry).map((entry) => [
    `\`${entry.kind}\``,
    `\`${entry.category}\``,
    String(entry.count),
  ]);
  const targetRows = TARGET_ORDER.map((target) => [
    `\`${target}\``,
    String(getTargetCount(registry, target)),
  ]);

  return [
    "## Summary",
    "",
    `The published \`${registry.name}\` manifest currently contains **${registry.items.length}** installable items.`,
    "",
    "**By kind**",
    "",
    formatTable(["Kind", "Count"], kindRows),
    "",
    "**By category**",
    "",
    formatTable(["Kind", "Category", "Count"], categoryRows),
    "",
    "**By target**",
    "",
    formatTable(["Target", "Count"], targetRows),
    "",
  ];
}

export function generateOfficialRegistryDoc(
  options: GenerateOfficialRegistryDocOptions,
): string {
  const overlayErrors = validateOfficialRegistryDocOverlay(
    options.registry,
    options.overlayByItemName,
  );

  if (overlayErrors.length > 0) {
    throw new Error(overlayErrors.join("\n"));
  }

  const examplesByItemName = collectExampleInstallsByItemName(options.exampleSources);
  const lines = [
    "# Official Registry",
    "",
    "> Generated by `bun run docs:catalog:build`. Edit the docs generator or overlay data instead of editing this file directly.",
    "",
    `This page documents the shipped \`${options.registry.name}\` catalog from \`fixtures/registries/ucr-official/registry.json\`. It complements \`ucr list\` and \`ucr show\` with concrete guidance on what each utility, preset, and block is for.`,
    "",
    "Use `<ucr-root>` below as shorthand for the adapter-managed shared UCR root. In the checked-in examples that is `ucr` for Bun HTTP and `src/ucr` for the Next app.",
    "",
    "Blocks always require an explicit `--instance`, even when their generated files land at fixed logical paths.",
    "",
    ...renderRecommendedByWorkflow(options.registry, options.overlayByItemName),
    ...renderSummary(options.registry),
  ];

  for (const kind of KIND_ORDER) {
    const items = options.registry.items
      .filter((item) => item.kind === kind)
      .sort((left, right) => {
        const categoryOrder = compareText(left.category, right.category);

        if (categoryOrder !== 0) {
          return categoryOrder;
        }

        return compareText(left.name, right.name);
      });

    lines.push(`## ${KIND_LABELS[kind]}`, "");

    for (const item of items) {
      const overlay = options.overlayByItemName[item.name];

      if (!overlay) {
        throw new Error(`Missing docs overlay entry for "${item.name}".`);
      }

      lines.push(
        ...renderItemSection(item, overlay, examplesByItemName[item.name] ?? []),
      );
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
