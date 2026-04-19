import {
  createEmpty{{entityPascal}}Input,
  merge{{entityPascal}}Update,
  type Create{{entityPascal}}Input,
  type Update{{entityPascal}}Input,
  type {{entityPascal}},
} from "../contract/model";
import { indexBy, mergeDefined, sortBy } from "{{presetDirImport}}/endpoint-preset";
import type { {{entityPascal}}Repository } from "./repository";

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneItem(item: {{entityPascal}}): {{entityPascal}} {
  return {
    ...item,
  };
}

export function createInMemory{{entityPascal}}Repository(
  seed: {{entityPascal}}[] = [],
): {{entityPascal}}Repository {
  const storage = new Map<string, {{entityPascal}}>(
    Object.entries(indexBy(seed, (item) => item.id)).map(([id, item]) => [
      id,
      cloneItem(item),
    ]),
  );

  return {
    async list(): Promise<{{entityPascal}}[]> {
      return sortBy(Array.from(storage.values()), (item) => item.createdAt).map(
        cloneItem,
      );
    },
    async get(id: string): Promise<{{entityPascal}} | null> {
      const item = storage.get(id);
      return item ? cloneItem(item) : null;
    },
    async create(input: Create{{entityPascal}}Input): Promise<{{entityPascal}}> {
      const timestamp = new Date().toISOString();
      const created: {{entityPascal}} = {
        id: createId(),
        createdAt: timestamp,
        updatedAt: timestamp,
        ...createEmpty{{entityPascal}}Input(),
        ...input,
      };

      storage.set(created.id, created);
      return cloneItem(created);
    },
    async update(
      id: string,
      input: Update{{entityPascal}}Input,
    ): Promise<{{entityPascal}} | null> {
      const current = storage.get(id);
      if (!current) {
        return null;
      }

      const updated = merge{{entityPascal}}Update(
        current,
        mergeDefined({} as Update{{entityPascal}}Input, input),
      );
      storage.set(id, updated);
      return cloneItem(updated);
    },
    async remove(id: string): Promise<boolean> {
      return storage.delete(id);
    },
  };
}
