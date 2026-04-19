import type {
  Create{{entityPascal}}Input,
  Update{{entityPascal}}Input,
  {{entityPascal}},
} from "../contract/model";
import { retry, withTimeout } from "{{utilityDirImport}}/async-utility";

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(
      payload?.error ?? `Request failed with status ${response.status}.`,
    );
  }

  return (await response.json()) as T;
}

async function sendRequest(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  return withTimeout(
    () =>
      retry(() => fetch(input, init), {
        attempts: 2,
        delayMs: 25,
      }),
    3000,
  );
}

const basePath = "{{apiBasePath}}";

export async function list{{pluralPascal}}(): Promise<{{entityPascal}}[]> {
  const payload = await readJson<{ items: {{entityPascal}}[] }>(
    await sendRequest(basePath, {
      cache: "no-store",
    }),
  );

  return payload.items;
}

export async function get{{entityPascal}}(id: string): Promise<{{entityPascal}}> {
  const payload = await readJson<{ item: {{entityPascal}} }>(
    await sendRequest(`${basePath}/${id}`, {
      cache: "no-store",
    }),
  );

  return payload.item;
}

export async function create{{entityPascal}}(
  input: Create{{entityPascal}}Input,
): Promise<{{entityPascal}}> {
  const payload = await readJson<{ item: {{entityPascal}} }>(
    await sendRequest(basePath, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    }),
  );

  return payload.item;
}

export async function update{{entityPascal}}(
  id: string,
  input: Update{{entityPascal}}Input,
): Promise<{{entityPascal}}> {
  const payload = await readJson<{ item: {{entityPascal}} }>(
    await sendRequest(`${basePath}/${id}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    }),
  );

  return payload.item;
}

export async function remove{{entityPascal}}(id: string): Promise<void> {
  await readJson<{ ok: true }>(
    await sendRequest(`${basePath}/${id}`, {
      method: "DELETE",
    }),
  );
}
