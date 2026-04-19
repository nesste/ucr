import type {
  Create{{entityPascal}}Input,
  Update{{entityPascal}}Input,
  {{entityPascal}},
} from "../contract/model";

export interface {{entityPascal}}Repository {
  list(): Promise<{{entityPascal}}[]>;
  get(id: string): Promise<{{entityPascal}} | null>;
  create(input: Create{{entityPascal}}Input): Promise<{{entityPascal}}>;
  update(
    id: string,
    input: Update{{entityPascal}}Input,
  ): Promise<{{entityPascal}} | null>;
  remove(id: string): Promise<boolean>;
}
