import type {
  CreatePostInput,
  UpdatePostInput,
} from "./model";
import {
  assertRecord,
  assertShape,
  toFieldErrors,
} from "../../utilities/validation-utility";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

function validateCreateField(
  fieldName: string,
  label: string,
  value: unknown,
): { ok: true; value: unknown } | { ok: false; message: string } {
  if (fieldName === "title") {
    return typeof value === "string"
      ? { ok: true, value }
      : { ok: false, message: 'Field "Title" must be a string.' };
  }
  if (fieldName === "views") {
    if (typeof value === "number" && Number.isFinite(value)) {
      return { ok: true, value };
    }

    if (
      typeof value === "string" &&
      value.trim().length > 0 &&
      Number.isFinite(Number(value))
    ) {
      return { ok: true, value: Number(value) };
    }

    return { ok: false, message: 'Field "Views" must be a number.' };
  }
  if (fieldName === "published") {
    if (typeof value === "boolean") {
      return { ok: true, value };
    }

    if (value === "true") {
      return { ok: true, value: true };
    }

    if (value === "false") {
      return { ok: true, value: false };
    }

    return { ok: false, message: 'Field "Published" must be a boolean.' };
  }
  if (fieldName === "publishedAt") {
    return typeof value === "string" && Number.isFinite(Date.parse(value))
      ? { ok: true, value }
      : { ok: false, message: 'Field "Published At" must be a valid date string.' };
  }

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
    {
      name: "title",
      label: "Title",
      required: mode === "create" ? true : false,
      coerce(value) {
        return validateCreateField("title", "Title", value);
      },
    },
    {
      name: "views",
      label: "Views",
      required: mode === "create" ? true : false,
      coerce(value) {
        return validateCreateField("views", "Views", value);
      },
    },
    {
      name: "published",
      label: "Published",
      required: mode === "create" ? true : false,
      coerce(value) {
        return validateCreateField("published", "Published", value);
      },
    },
    {
      name: "publishedAt",
      label: "Published At",
      required: mode === "create" ? false : false,
      coerce(value) {
        return validateCreateField("publishedAt", "Published At", value);
      },
    },
  ]);

  return result.ok
    ? {
        ok: true,
        data: result.data as Value,
      }
    : result;
}

export function validateCreatePostInput(
  input: unknown,
): ValidationResult<CreatePostInput> {
  return validateShape<CreatePostInput>(input, "create");
}

export function validateUpdatePostInput(
  input: unknown,
): ValidationResult<UpdatePostInput> {
  return validateShape<UpdatePostInput>(input, "update");
}
