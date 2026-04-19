import path from "node:path";

export const REGISTRY_SCHEMA_FILENAME = "registry.schema.json";
export const REGISTRY_SCHEMA_FILE = path.resolve(
  __dirname,
  "..",
  REGISTRY_SCHEMA_FILENAME,
);

export type RegistryItemKind = "block" | "utility" | "preset";
export type RegistryTarget = "shared" | "next-app-router" | "bun-http";
export type RegistrySurface =
  | "contract"
  | "domain"
  | "transport"
  | "ui"
  | "test"
  | "config"
  | "entrypoint"
  | "utility"
  | "preset";
export type RegistryInputType = "string" | "number" | "boolean" | "json";

export interface RegistryInputDefinition {
  name: string;
  type: RegistryInputType;
  description?: string;
  required?: boolean;
}

export interface RegistryOutput {
  template: string;
  target: string;
  surface: RegistrySurface;
  description?: string;
  overwrite?: boolean;
}

export interface RegistryItem {
  name: string;
  kind: RegistryItemKind;
  version: string;
  category: string;
  description?: string;
  inputs?: RegistryInputDefinition[];
  outputs: RegistryOutput[];
  targets: RegistryTarget[];
  compose?: string[];
  requires?: string[];
  provides?: string[];
  tags?: string[];
  entrypoints?: string[];
  metadata?: Record<string, string>;
}

export interface RegistryDocument {
  $schema?: string;
  name: string;
  version: string;
  items: RegistryItem[];
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: string[] };

const VALID_ITEM_KINDS: Set<RegistryItemKind> = new Set([
  "block",
  "utility",
  "preset",
]);
const VALID_TARGETS: Set<RegistryTarget> = new Set([
  "shared",
  "next-app-router",
  "bun-http",
]);
const VALID_SURFACES: Set<RegistrySurface> = new Set([
  "contract",
  "domain",
  "transport",
  "ui",
  "test",
  "config",
  "entrypoint",
  "utility",
  "preset",
]);
const VALID_INPUT_TYPES: Set<RegistryInputType> = new Set([
  "string",
  "number",
  "boolean",
  "json",
]);
const LEGACY_ITEM_KEYS = [
  "files",
  "dependencies",
  "packageDependencies",
  "devDependencies",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRegistryItemKind(value: string): value is RegistryItemKind {
  return VALID_ITEM_KINDS.has(value as RegistryItemKind);
}

function isRegistryTarget(value: string): value is RegistryTarget {
  return VALID_TARGETS.has(value as RegistryTarget);
}

function isRegistrySurface(value: string): value is RegistrySurface {
  return VALID_SURFACES.has(value as RegistrySurface);
}

function isRegistryInputType(value: string): value is RegistryInputType {
  return VALID_INPUT_TYPES.has(value as RegistryInputType);
}

function validateStringArray(
  input: unknown,
  errors: string[],
  label: string,
  options?: { required?: boolean; minItems?: number; allowed?: Set<string> },
): input is string[] {
  const required = options?.required === true;
  const minItems = options?.minItems ?? 0;

  if (input === undefined) {
    if (required) {
      errors.push(`${label} is required.`);
      return false;
    }

    return true;
  }

  if (!Array.isArray(input)) {
    errors.push(`${label} must be an array.`);
    return false;
  }

  if (input.length < minItems) {
    errors.push(`${label} must contain at least ${minItems} item(s).`);
  }

  const seen = new Set<string>();

  input.forEach((value, index) => {
    if (!isNonEmptyString(value)) {
      errors.push(`${label} entry #${index + 1} must be a non-empty string.`);
      return;
    }

    if (seen.has(value)) {
      errors.push(`${label} entry "${value}" is duplicated.`);
    } else {
      seen.add(value);
    }

    if (options?.allowed && !options.allowed.has(value)) {
      errors.push(`${label} entry "${value}" is not supported.`);
    }
  });

  return errors.length === 0;
}

function validateInputs(
  input: unknown,
  errors: string[],
  itemName: string,
): input is RegistryInputDefinition[] {
  if (input === undefined) {
    return true;
  }

  if (!Array.isArray(input)) {
    errors.push(`Item "${itemName}" has an invalid "inputs" collection.`);
    return false;
  }

  const inputNames = new Set<string>();

  input.forEach((definition, inputIndex) => {
    if (!isRecord(definition)) {
      errors.push(
        `Item "${itemName}" input #${inputIndex + 1} must be an object.`,
      );
      return;
    }

    if (!isNonEmptyString(definition.name)) {
      errors.push(
        `Item "${itemName}" input #${inputIndex + 1} must include a non-empty "name".`,
      );
    } else if (inputNames.has(definition.name)) {
      errors.push(
        `Item "${itemName}" input "${definition.name}" is duplicated.`,
      );
    } else {
      inputNames.add(definition.name);
    }

    if (
      !isNonEmptyString(definition.type) ||
      !isRegistryInputType(definition.type)
    ) {
      errors.push(
        `Item "${itemName}" input #${inputIndex + 1} has an invalid "type".`,
      );
    }

    if ("required" in definition && typeof definition.required !== "boolean") {
      errors.push(
        `Item "${itemName}" input #${inputIndex + 1} has an invalid "required" flag.`,
      );
    }
  });

  return errors.length === 0;
}

function validateOutputs(
  input: unknown,
  errors: string[],
  itemName: string,
): input is RegistryOutput[] {
  if (!Array.isArray(input) || input.length === 0) {
    errors.push(`Item "${itemName}" must define at least one output.`);
    return false;
  }

  const outputKeys = new Set<string>();

  input.forEach((output, outputIndex) => {
    if (!isRecord(output)) {
      errors.push(
        `Item "${itemName}" output #${outputIndex + 1} must be an object.`,
      );
      return;
    }

    if (!isNonEmptyString(output.template)) {
      errors.push(
        `Item "${itemName}" output #${outputIndex + 1} must include a non-empty "template".`,
      );
    }

    if (!isNonEmptyString(output.target)) {
      errors.push(
        `Item "${itemName}" output #${outputIndex + 1} must include a non-empty "target".`,
      );
    }

    if (
      !isNonEmptyString(output.surface) ||
      !isRegistrySurface(output.surface)
    ) {
      errors.push(
        `Item "${itemName}" output #${outputIndex + 1} has an invalid "surface".`,
      );
    }

    if ("overwrite" in output && typeof output.overwrite !== "boolean") {
      errors.push(
        `Item "${itemName}" output #${outputIndex + 1} has an invalid "overwrite" flag.`,
      );
    }

    if (
      isNonEmptyString(output.surface) &&
      isRegistrySurface(output.surface) &&
      isNonEmptyString(output.target)
    ) {
      const outputKey = `${output.surface}:${output.target}`;
      if (outputKeys.has(outputKey)) {
        errors.push(
          `Item "${itemName}" has duplicate output "${outputKey}".`,
        );
      } else {
        outputKeys.add(outputKey);
      }
    }
  });

  return errors.length === 0;
}

function validateItem(
  input: unknown,
  errors: string[],
  itemIndex: number,
): input is RegistryItem {
  if (!isRecord(input)) {
    errors.push(`Item #${itemIndex + 1} must be an object.`);
    return false;
  }

  const itemName = isNonEmptyString(input.name) ? input.name : `#${itemIndex + 1}`;

  if (!isNonEmptyString(input.name)) {
    errors.push(`Item #${itemIndex + 1} must include a non-empty "name".`);
  }

  if (!isNonEmptyString(input.kind) || !isRegistryItemKind(input.kind)) {
    errors.push(
      `Item "${itemName}" has an invalid "kind". UCR v1 supports "block", "utility", and "preset".`,
    );
  }

  if (!isNonEmptyString(input.version)) {
    errors.push(`Item "${itemName}" must include a non-empty "version".`);
  }

  if (!isNonEmptyString(input.category)) {
    errors.push(`Item "${itemName}" must include a non-empty "category".`);
  }

  for (const legacyKey of LEGACY_ITEM_KEYS) {
    if (legacyKey in input) {
      errors.push(
        `Item "${itemName}" uses legacy "${legacyKey}" fields. UCR only accepts source-owned block outputs.`,
      );
    }
  }

  validateStringArray(input.targets, errors, `Item "${itemName}" targets`, {
    required: true,
    minItems: 1,
    allowed: VALID_TARGETS,
  });
  validateStringArray(input.requires, errors, `Item "${itemName}" requires`);
  validateStringArray(input.provides, errors, `Item "${itemName}" provides`);
  validateStringArray(input.tags, errors, `Item "${itemName}" tags`);
  validateStringArray(input.compose, errors, `Item "${itemName}" compose`);
  validateStringArray(
    input.entrypoints,
    errors,
    `Item "${itemName}" entrypoints`,
  );
  validateInputs(input.inputs, errors, itemName);
  validateOutputs(input.outputs, errors, itemName);

  if (input.kind === "preset") {
    if (!Array.isArray(input.compose) || input.compose.length === 0) {
      errors.push(
        `Item "${itemName}" must include a non-empty "compose" array when kind is "preset".`,
      );
    }
  } else if ("compose" in input) {
    errors.push(
      `Item "${itemName}" may only define "compose" when kind is "preset".`,
    );
  }

  if (
    "metadata" in input &&
    (!isRecord(input.metadata) ||
      Object.values(input.metadata).some((value) => !isNonEmptyString(value)))
  ) {
    errors.push(`Item "${itemName}" has invalid "metadata".`);
  }

  return errors.length === 0;
}

export function validateRegistryDocument(
  input: unknown,
): ValidationResult<RegistryDocument> {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return {
      ok: false,
      errors: ["Registry document must be a JSON object."],
    };
  }

  if (!isNonEmptyString(input.name)) {
    errors.push('Registry document must include a non-empty "name".');
  }

  if (!isNonEmptyString(input.version)) {
    errors.push('Registry document must include a non-empty "version".');
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    errors.push('Registry document must include a non-empty "items" array.');
  } else {
    const itemNames = new Set<string>();

    input.items.forEach((item, itemIndex) => {
      validateItem(item, errors, itemIndex);

      if (isRecord(item) && isNonEmptyString(item.name)) {
        if (itemNames.has(item.name)) {
          errors.push(`Registry document contains duplicate item "${item.name}".`);
        } else {
          itemNames.add(item.name);
        }
      }
    });
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    data: input as unknown as RegistryDocument,
  };
}

export function assertValidRegistryDocument(input: unknown): RegistryDocument {
  const result = validateRegistryDocument(input);

  if (!result.ok) {
    throw new Error(result.errors.join("\n"));
  }

  return result.data;
}
