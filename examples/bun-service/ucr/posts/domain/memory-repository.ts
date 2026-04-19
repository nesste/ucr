import {
  createEmptyPostInput,
  mergePostUpdate,
  type CreatePostInput,
  type UpdatePostInput,
  type Post,
} from "../contract/model";
import { indexBy, mergeDefined, sortBy } from "../../presets/endpoint-preset";
import type { PostRepository } from "./repository";

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneItem(item: Post): Post {
  return {
    ...item,
  };
}

export function createInMemoryPostRepository(
  seed: Post[] = [],
): PostRepository {
  const storage = new Map<string, Post>(
    Object.entries(indexBy(seed, (item) => item.id)).map(([id, item]) => [
      id,
      cloneItem(item),
    ]),
  );

  return {
    async list(): Promise<Post[]> {
      return sortBy(Array.from(storage.values()), (item) => item.createdAt).map(
        cloneItem,
      );
    },
    async get(id: string): Promise<Post | null> {
      const item = storage.get(id);
      return item ? cloneItem(item) : null;
    },
    async create(input: CreatePostInput): Promise<Post> {
      const timestamp = new Date().toISOString();
      const created: Post = {
        id: createId(),
        createdAt: timestamp,
        updatedAt: timestamp,
        ...createEmptyPostInput(),
        ...input,
      };

      storage.set(created.id, created);
      return cloneItem(created);
    },
    async update(
      id: string,
      input: UpdatePostInput,
    ): Promise<Post | null> {
      const current = storage.get(id);
      if (!current) {
        return null;
      }

      const updated = mergePostUpdate(
        current,
        mergeDefined({} as UpdatePostInput, input),
      );
      storage.set(id, updated);
      return cloneItem(updated);
    },
    async remove(id: string): Promise<boolean> {
      return storage.delete(id);
    },
  };
}
