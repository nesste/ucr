import type {
  CreatePostInput,
  UpdatePostInput,
  Post,
} from "../contract/model";
import { retry, withTimeout } from "../../utilities/async-utility";

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

const basePath = "/api/posts";

export async function listPosts(): Promise<Post[]> {
  const payload = await readJson<{ items: Post[] }>(
    await sendRequest(basePath, {
      cache: "no-store",
    }),
  );

  return payload.items;
}

export async function getPost(id: string): Promise<Post> {
  const payload = await readJson<{ item: Post }>(
    await sendRequest(`${basePath}/${id}`, {
      cache: "no-store",
    }),
  );

  return payload.item;
}

export async function createPost(
  input: CreatePostInput,
): Promise<Post> {
  const payload = await readJson<{ item: Post }>(
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

export async function updatePost(
  id: string,
  input: UpdatePostInput,
): Promise<Post> {
  const payload = await readJson<{ item: Post }>(
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

export async function removePost(id: string): Promise<void> {
  await readJson<{ ok: true }>(
    await sendRequest(`${basePath}/${id}`, {
      method: "DELETE",
    }),
  );
}
