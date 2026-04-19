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

function validateCreateField(
  fieldName: string,
  label: string,
  value: unknown,
): { ok: true; value: unknown } | { ok: false; message: string } {
{{#each fields}}  if (fieldName === "{{nameCamel}}") {
{{#if isString}}    return typeof value === "string"
      ? { ok: true, value }
      : { ok: false, message: 'Field "{{label}}" must be a string.' };
{{/if}}{{#if isNumber}}    if (typeof value === "number" && Number.isFinite(value)) {
      return { ok: true, value };
    }

    if (
      typeof value === "string" &&
      value.trim().length > 0 &&
      Number.isFinite(Number(value))
    ) {
      return { ok: true, value: Number(value) };
    }

    return { ok: false, message: 'Field "{{label}}" must be a number.' };
{{/if}}{{#if isBoolean}}    if (typeof value === "boolean") {
      return { ok: true, value };
    }

    if (value === "true") {
      return { ok: true, value: true };
    }

    if (value === "false") {
      return { ok: true, value: false };
    }

    return { ok: false, message: 'Field "{{label}}" must be a boolean.' };
{{/if}}{{#if isDate}}    return typeof value === "string" && Number.isFinite(Date.parse(value))
      ? { ok: true, value }
      : { ok: false, message: 'Field "{{label}}" must be a valid date string.' };
{{/if}}  }
{{/each}}
  return {
    ok: false,
    message: `Field "${label}" is not supported.`,
  };
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
      required: mode === "create" ? {{required}} : false,
      coerce(value) {
        return validateCreateField("{{nameCamel}}", "{{label}}", value);
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
