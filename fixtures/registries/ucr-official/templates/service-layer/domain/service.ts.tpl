import type {
  Create{{entityPascal}}Input,
  Update{{entityPascal}}Input,
  {{entityPascal}},
} from "../contract/model";
import { withTimeout } from "{{presetDirImport}}/service-preset";
import type { {{entityPascal}}Repository } from "./repository";

export interface {{entityPascal}}Service {
  list{{pluralPascal}}(): Promise<{{entityPascal}}[]>;
  get{{entityPascal}}(id: string): Promise<{{entityPascal}} | null>;
  create{{entityPascal}}(
    input: Create{{entityPascal}}Input,
  ): Promise<{{entityPascal}}>;
  update{{entityPascal}}(
    id: string,
    input: Update{{entityPascal}}Input,
  ): Promise<{{entityPascal}} | null>;
  remove{{entityPascal}}(id: string): Promise<boolean>;
}

export function create{{entityPascal}}Service(
  repository: {{entityPascal}}Repository,
): {{entityPascal}}Service {
  return {
    list{{pluralPascal}}(): Promise<{{entityPascal}}[]> {
      return withTimeout(() => repository.list(), 1500);
    },
    get{{entityPascal}}(id: string): Promise<{{entityPascal}} | null> {
      return withTimeout(() => repository.get(id), 1500);
    },
    create{{entityPascal}}(
      input: Create{{entityPascal}}Input,
    ): Promise<{{entityPascal}}> {
      return withTimeout(() => repository.create(input), 1500);
    },
    update{{entityPascal}}(
      id: string,
      input: Update{{entityPascal}}Input,
    ): Promise<{{entityPascal}} | null> {
      return withTimeout(() => repository.update(id, input), 1500);
    },
    remove{{entityPascal}}(id: string): Promise<boolean> {
      return withTimeout(() => repository.remove(id), 1500);
    },
  };
}
