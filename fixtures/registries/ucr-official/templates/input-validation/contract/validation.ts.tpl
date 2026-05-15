import type {
  Create{{entityPascal}}Input,
  Update{{entityPascal}}Input,
} from "./model";
import {
  assertRecord,
  assertShape,
  toFieldErrors,
} from "{{utilityDirImport}}/validation-utility";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

type FieldValidation =
  | { ok: true; value: unknown }
  | { ok: false; message: string };

function invalidField(label: string, expectedType: string): FieldValidation {
  return {
    ok: false,
    message: `Field "${label}" must be ${expectedType}.`,
  };
}

function validateStringField(label: string, value: unknown): FieldValidation {
  return typeof value === "string"
    ? { ok: true, value }
    : invalidField(label, "a string");
}

function validateNumberField(label: string, value: unknown): FieldValidation {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? { ok: true, value }
      : invalidField(label, "a number");
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return invalidField(label, "a number");
  }

  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? { ok: true, value: parsed }
    : invalidField(label, "a number");
}

function validateBooleanField(label: string, value: unknown): FieldValidation {
  if (typeof value === "boolean") {
    return { ok: true, value };
  }

  if (value === "true") {
    return { ok: true, value: true };
  }

  if (value === "false") {
    return { ok: true, value: false };
  }

  return invalidField(label, "a boolean");
}

function validateDateField(label: string, value: unknown): FieldValidation {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? { ok: true, value }
    : invalidField(label, "a valid date string");
}

function validateField(
  label: string,
  inputType: string,
  value: unknown,
): FieldValidation {
  switch (inputType) {
    case "checkbox":
      return validateBooleanField(label, value);
    case "date":
      return validateDateField(label, value);
    case "number":
      return validateNumberField(label, value);
    default:
      return validateStringField(label, value);
  }
}

function validateShape<Value extends object>(
  input: unknown,
  mode: "create" | "update",
): ValidationResult<Value> {
  if (!assertRecord(input)) {
    return {
      ok: false,
      errors: toFieldErrors([
        {
          field: "form",
          message: "Input must be an object.",
        },
      ]),
    };
  }

  const record = input;

  const result = assertShape<Value>(record, [
{{#each fields}}    {
      name: "{{nameCamel}}",
      label: "{{label}}",
      required: mode === "create",
      coerce(value) {
        return validateField("{{label}}", "{{inputType}}", value);
      },
    },
{{/each}}  ]);

  return result.ok
    ? {
        ok: true,
        data: result.data as Value,
      }
    : result;
}

export function validateCreate{{entityPascal}}Input(
  input: unknown,
): ValidationResult<Create{{entityPascal}}Input> {
  return validateShape<Create{{entityPascal}}Input>(input, "create");
}

export function validateUpdate{{entityPascal}}Input(
  input: unknown,
): ValidationResult<Update{{entityPascal}}Input> {
  return validateShape<Update{{entityPascal}}Input>(input, "update");
}
