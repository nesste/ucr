import { defineUtility } from "{{runtimeDirImport}}";

export function createAsyncState<Value>(initial: Value) {
  return {
    status: "idle" as "idle" | "loading" | "success" | "error",
    data: initial,
    error: null as string | null,
  };
}

export function createFormState<Value extends Record<string, unknown>>(
  initial: Value,
) {
  return {
    values: initial,
    isSubmitting: false,
    error: null as string | null,
  };
}

export function reduceEvent<Value extends Record<string, unknown>>(
  state: Value,
  patch: Partial<Value>,
): Value {
  return {
    ...state,
    ...patch,
  };
}

export const stateUtility = defineUtility("state-utility", {
  createAsyncState,
  createFormState,
  reduceEvent,
});
