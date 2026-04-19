import { defineUtility } from "{{runtimeDirImport}}";

export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  run: () => Promise<T> | T,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 2);
  const delayMs = Math.max(0, options.delayMs ?? 0);
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1 && delayMs > 0) {
        await delay(delayMs);
      }
    }
  }

  throw lastError;
}

export async function parallel<
  const Tasks extends readonly (() => Promise<unknown> | unknown)[],
>(
  tasks: Tasks,
): Promise<{ [Index in keyof Tasks]: Awaited<ReturnType<Tasks[Index]>> }> {
  return Promise.all(tasks.map((task) => task())) as Promise<{
    [Index in keyof Tasks]: Awaited<ReturnType<Tasks[Index]>>;
  }>;
}

export async function sequence<T>(
  steps: Array<() => Promise<T> | T>,
): Promise<T[]> {
  const output: T[] = [];

  for (const step of steps) {
    output.push(await step());
  }

  return output;
}

export async function withTimeout<T>(
  run: Promise<T> | (() => Promise<T> | T),
  timeoutMs: number,
  message = `Timed out after ${timeoutMs}ms.`,
): Promise<T> {
  const pending =
    typeof run === "function"
      ? Promise.resolve().then(run)
      : run;

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      pending,
      new Promise<T>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export const asyncUtility = defineUtility("async-utility", {
  retry,
  parallel,
  sequence,
  withTimeout,
});
