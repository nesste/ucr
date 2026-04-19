import { defineUtility } from "../runtime";

export type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return {
    ok: true,
    data,
  };
}

export function err<E>(error: E): Result<never, E> {
  return {
    ok: false,
    error,
  };
}

export function mapResult<T, NextValue, E>(
  result: Result<T, E>,
  mapper: (value: T) => NextValue,
): Result<NextValue, E> {
  return result.ok ? ok(mapper(result.data)) : result;
}

export function mapError<T, E, NextError>(
  result: Result<T, E>,
  mapper: (value: E) => NextError,
): Result<T, NextError> {
  return result.ok ? result : err(mapper(result.error));
}

export function matchResult<T, E, Output>(
  result: Result<T, E>,
  handlers: {
    ok(value: T): Output;
    err(value: E): Output;
  },
): Output {
  return result.ok
    ? handlers.ok(result.data)
    : handlers.err(result.error);
}

export const resultUtility = defineUtility("result-utility", {
  ok,
  err,
  mapResult,
  mapError,
  matchResult,
});
