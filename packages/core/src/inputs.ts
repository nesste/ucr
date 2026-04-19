import type { RegistryInputDefinition, RegistryItem } from "@ucr/schema";

import type { ResolvedRegistryInputs } from "./types";

function parseBoolean(rawValue: string): boolean {
  const normalized = rawValue.trim().toLowerCase();

  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean value "${rawValue}".`);
}

function resolveInputValue(
  definition: RegistryInputDefinition,
  rawValue: string,
): unknown {
  switch (definition.type) {
    case "string":
      return rawValue;
    case "number": {
      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed)) {
        throw new Error(`Input "${definition.name}" must be a finite number.`);
      }

      return parsed;
    }
    case "boolean":
      return parseBoolean(rawValue);
    case "json":
      return JSON.parse(rawValue) as unknown;
  }
}

export function resolveItemInputs(
  item: RegistryItem,
  rawInputs: Record<string, string>,
): ResolvedRegistryInputs {
  const definitions = item.inputs ?? [];
  const knownNames = new Set(definitions.map((definition) => definition.name));
  const resolved: ResolvedRegistryInputs = {};

  for (const inputName of Object.keys(rawInputs)) {
    if (!knownNames.has(inputName)) {
      throw new Error(`Unknown input "${inputName}" for item "${item.name}".`);
    }
  }

  for (const definition of definitions) {
    const rawValue = rawInputs[definition.name];
    const isRequired = definition.required ?? true;

    if (rawValue === undefined) {
      if (isRequired) {
        throw new Error(
          `Missing required input "${definition.name}" for item "${item.name}".`,
        );
      }
      continue;
    }

    try {
      resolved[definition.name] = resolveInputValue(definition, rawValue);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to resolve "${definition.name}": ${message}`);
    }
  }

  return resolved;
}
