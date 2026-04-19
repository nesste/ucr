import { defineUtility } from "{{runtimeDirImport}}";

export interface FieldIssue {
  field: string;
  message: string;
}

export interface ShapeRule {
  name: string;
  label?: string;
  required?: boolean;
  coerce(value: unknown): { ok: true; value: unknown } | { ok: false; message: string };
}

export type ShapeResult<Value extends object> =
  | { ok: true; data: Partial<Value> }
  | { ok: false; errors: Record<string, string> };

export function assertRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toFieldErrors(
  issues: readonly FieldIssue[],
): Record<string, string> {
  const output: Record<string, string> = {};

  for (const issue of issues) {
    output[issue.field] = issue.message;
  }

  return output;
}

export function assertShape<Value extends object>(
  input: Record<string, unknown>,
  rules: ShapeRule[],
): ShapeResult<Value> {
  const issues: FieldIssue[] = [];
  const output: Partial<Value> = {};

  for (const rule of rules) {
    const rawValue = input[rule.name];

    if (rawValue === undefined || rawValue === null || rawValue === "") {
      if (rule.required) {
        issues.push({
          field: rule.name,
          message: `Field "${rule.label ?? rule.name}" is required.`,
        });
      }
      continue;
    }

    const parsed = rule.coerce(rawValue);

    if (parsed.ok) {
      (output as Record<string, unknown>)[rule.name] = parsed.value;
    } else {
      issues.push({
        field: rule.name,
        message: parsed.message,
      });
    }
  }

  return issues.length > 0
    ? {
        ok: false,
        errors: toFieldErrors(issues),
      }
    : {
        ok: true,
        data: output,
      };
}

export const validationUtility = defineUtility("validation-utility", {
  assertRecord,
  assertShape,
  toFieldErrors,
});
