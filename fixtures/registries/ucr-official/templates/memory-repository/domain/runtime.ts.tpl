import { create{{entityPascal}}Service } from "./service";
import { createInMemory{{entityPascal}}Repository } from "./memory-repository";

export const {{entityCamel}}Service = create{{entityPascal}}Service(
  createInMemory{{entityPascal}}Repository(),
);
