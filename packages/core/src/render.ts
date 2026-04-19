import { promises as fs } from "node:fs";
import path from "node:path";

import type { RegistryItem } from "@ucr/schema";

import type { ProjectAdapterId } from "./adapters";
import {
  getProjectAdapter,
  inspectProjectProfile,
  itemSupportsAdapter,
  type BuiltAdapterContext,
} from "./adapters";
import { resolveItemInputs } from "./inputs";
import {
  getRegistryItem,
  resolveRegistryComposeNames,
  resolveRegistryInstanceId,
} from "./resolve";
import { renderTemplate } from "./template";
import type {
  JsonValue,
  LoadedRegistry,
  RenderedRegistryItem,
  RenderedRegistryOutput,
  ResolvedRegistryInputs,
  SkippedRegistryOutput,
} from "./types";

type TemplateContext = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function toPascalCase(input: string): string {
  return toWords(input).map(capitalize).join("");
}

function toCamelCase(input: string): string {
  const pascal = toPascalCase(input);
  return pascal.length === 0
    ? pascal
    : pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(input: string): string {
  return toWords(input).map((part) => part.toLowerCase()).join("-");
}

function toSnakeCase(input: string): string {
  return toWords(input).map((part) => part.toLowerCase()).join("_");
}

function toTitleCase(input: string): string {
  return toWords(input).map(capitalize).join(" ");
}

function addStringVariants(
  target: Record<string, unknown>,
  key: string,
  value: string,
): void {
  target[key] = value;
  target[`${key}Camel`] = toCamelCase(value);
  target[`${key}Pascal`] = toPascalCase(value);
  target[`${key}Kebab`] = toKebabCase(value);
  target[`${key}Snake`] = toSnakeCase(value);
  target[`${key}Title`] = toTitleCase(value);
}

function normalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJsonValue(entry));
  }

  if (isRecord(value)) {
    const normalized: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      const nextValue = normalizeJsonValue(entry);
      normalized[key] = nextValue;

      if (typeof nextValue === "string") {
        addStringVariants(normalized, key, nextValue);
      }
    }

    return normalized;
  }

  return value;
}

function toRelativeImport(fromFile: string, toPath: string): string {
  const fromDir = path.posix.dirname(fromFile);
  let relativePath = path.posix.relative(fromDir, toPath);

  relativePath = relativePath.replace(/\.(tsx?|jsx?)$/, "");

  if (!relativePath.startsWith(".")) {
    relativePath = `./${relativePath}`;
  }

  return relativePath;
}

function createBaseContext(
  item: RegistryItem,
  instanceId: string,
  inputs: ResolvedRegistryInputs,
  adapterContext: BuiltAdapterContext,
): TemplateContext {
  const context: TemplateContext = {
    adapterId: adapterContext.id,
    apiBasePath: adapterContext.apiBasePath,
    appRoot: adapterContext.appRoot ?? "",
    capabilities: adapterContext.capabilities,
    category: item.category,
    entrypointRoot: adapterContext.entrypointRoot,
    featureRoot: adapterContext.featureRoot,
    itemName: item.name,
    itemVersion: item.version,
    itemKind: item.kind,
    routeRoot: adapterContext.routeRoot,
    runtimeRoot: adapterContext.runtimeRoot,
    sourceRoot: adapterContext.sourceRoot,
    utilityRoot: adapterContext.utilityRoot,
    presetRoot: adapterContext.presetRoot,
    targets: item.targets,
  };

  addStringVariants(context, "instanceId", instanceId);
  addStringVariants(context, "itemName", item.name);
  addStringVariants(context, "category", item.category);

  for (const [key, value] of Object.entries(inputs)) {
    const normalizedValue = normalizeJsonValue(value);
    context[key] = normalizedValue;

    if (typeof normalizedValue === "string") {
      addStringVariants(context, key, normalizedValue);
    }
  }

  const resourceBase =
    typeof inputs.plural === "string"
      ? inputs.plural
      : typeof inputs.entity === "string"
        ? `${inputs.entity}s`
        : instanceId;
  addStringVariants(context, "resource", String(resourceBase));

  return context;
}

function createOutputContext(
  baseContext: TemplateContext,
  output: RenderedRegistryOutput,
  adapterContext: BuiltAdapterContext,
): TemplateContext {
  const contractRoot = path.posix.join(adapterContext.featureRoot, "contract");
  const domainRoot = path.posix.join(adapterContext.featureRoot, "domain");
  const configRoot = path.posix.join(adapterContext.featureRoot, "config");
  const testRoot = path.posix.join(adapterContext.featureRoot, "test");
  const entrypointRoot = adapterContext.entrypointRoot;
  const routeRoot = adapterContext.routeRoot;
  const uiRoot = adapterContext.appRoot ?? "";
  const runtimeRoot = adapterContext.runtimeRoot;
  const utilityRoot = adapterContext.utilityRoot;
  const presetRoot = adapterContext.presetRoot;

  return {
    ...baseContext,
    contractDirImport: toRelativeImport(output.target, contractRoot),
    currentSurface: output.surface,
    currentTarget: output.target,
    domainDirImport: toRelativeImport(output.target, domainRoot),
    configDirImport: toRelativeImport(output.target, configRoot),
    entrypointDirImport: toRelativeImport(output.target, entrypointRoot),
    runtimeDirImport: toRelativeImport(output.target, runtimeRoot),
    routeDirImport: toRelativeImport(output.target, routeRoot),
    testDirImport: toRelativeImport(output.target, testRoot),
    uiDirImport: uiRoot.length === 0 ? "" : toRelativeImport(output.target, uiRoot),
    utilityDirImport: toRelativeImport(output.target, utilityRoot),
    presetDirImport: toRelativeImport(output.target, presetRoot),
  };
}

function resolveCapabilities(
  values: string[] | undefined,
  context: TemplateContext,
): string[] {
  if (!values) {
    return [];
  }

  return [...new Set(values.map((value) => renderTemplate(value, context).trim()))]
    .filter((value) => value.length > 0)
    .sort();
}

async function renderBlockItem(
  loaded: LoadedRegistry,
  item: RegistryItem,
  instanceId: string,
  inputs: ResolvedRegistryInputs,
  adapterId: ProjectAdapterId | undefined,
  targetRoot: string,
): Promise<RenderedRegistryItem> {
  const profile = await inspectProjectProfile(targetRoot, adapterId);
  const adapter = getProjectAdapter(profile.adapterId);

  if (!itemSupportsAdapter(item.targets, adapter.id)) {
    throw new Error(
      `Block "${item.name}" is not compatible with adapter "${adapter.id}".`,
    );
  }

  const resourceSegment =
    typeof inputs.plural === "string"
      ? toKebabCase(inputs.plural)
      : typeof inputs.entity === "string"
        ? toKebabCase(`${inputs.entity}s`)
        : toKebabCase(instanceId);
  const adapterContext = await adapter.buildContext({
    profile,
    instanceId,
    resourceSegment,
  });
  const baseContext = createBaseContext(item, instanceId, inputs, adapterContext);
  const compose = resolveRegistryComposeNames(item, baseContext);
  const outputs: RenderedRegistryOutput[] = [];
  const skipped: SkippedRegistryOutput[] = [];

  for (const output of item.outputs) {
    const logicalTarget = renderTemplate(output.target, baseContext).trim();

    if (!adapter.supportsSurface(output.surface)) {
      skipped.push({
        surface: output.surface,
        target: logicalTarget,
        reason: `Adapter "${adapter.id}" does not support the "${output.surface}" surface.`,
      });
      continue;
    }

    const target = adapter.mapTargetPath(item, output, logicalTarget, adapterContext);
    outputs.push({
      itemName: item.name,
      itemVersion: item.version,
      instanceId,
      template: output.template,
      surface: output.surface,
      logicalTarget,
      target,
      targetPath: path.resolve(targetRoot, target),
      sourcePath: path.resolve(loaded.rootDir, output.template),
      content: "",
      overwrite: output.overwrite === true,
    });
  }

  const requires = resolveCapabilities(item.requires, baseContext);
  const provides = resolveCapabilities(item.provides, baseContext);

  for (const output of outputs) {
    const templateRaw = await fs.readFile(output.sourcePath, "utf8");
    output.content = renderTemplate(
      templateRaw,
      createOutputContext(baseContext, output, adapterContext),
    );
  }

  return {
    item,
    instanceId,
    inputs,
    compose,
    outputs,
    skipped,
    adapterId: adapter.id,
    profile,
    requires,
    provides,
  };
}

export async function renderRegistryItem(
  loaded: LoadedRegistry,
  itemName: string,
  instanceId: string,
  rawInputs: Record<string, string>,
  targetRoot: string,
  preferredAdapterId?: ProjectAdapterId,
): Promise<RenderedRegistryItem> {
  const item = getRegistryItem(loaded, itemName);
  const nextInstanceId = resolveRegistryInstanceId(item, instanceId);
  const inputs = resolveItemInputs(item, rawInputs);

  return renderBlockItem(
    loaded,
    item,
    nextInstanceId,
    inputs,
    preferredAdapterId,
    targetRoot,
  );
}

export async function rerenderRegistryItem(
  loaded: LoadedRegistry,
  itemName: string,
  instanceId: string,
  inputs: ResolvedRegistryInputs,
  targetRoot: string,
  adapterId: ProjectAdapterId,
): Promise<RenderedRegistryItem> {
  const item = getRegistryItem(loaded, itemName);

  return renderBlockItem(
    loaded,
    item,
    instanceId,
    inputs,
    adapterId,
    targetRoot,
  );
}

export function normalizeRenderedInputValue(value: unknown): JsonValue | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeRenderedInputValue(entry))
      .filter((entry): entry is JsonValue => entry !== undefined);
  }

  if (isRecord(value)) {
    const normalized: Record<string, JsonValue> = {};

    for (const [key, entry] of Object.entries(value)) {
      const nextValue = normalizeRenderedInputValue(entry);
      if (nextValue !== undefined) {
        normalized[key] = nextValue;
      }
    }

    return normalized;
  }

  return undefined;
}
