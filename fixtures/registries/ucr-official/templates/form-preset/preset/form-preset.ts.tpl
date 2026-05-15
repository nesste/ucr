import { definePreset } from "{{runtimeDirImport}}";
import { objectUtility } from "{{utilityDirImport}}/object-utility";
import { stateUtility } from "{{utilityDirImport}}/state-utility";
import { validationUtility } from "{{utilityDirImport}}/validation-utility";

export const formPreset = definePreset("form-preset", [
  validationUtility,
  objectUtility,
  stateUtility,
]);

export {
  mergeDefined,
  omit,
  pick,
} from "{{utilityDirImport}}/object-utility";
export {
  createAsyncState,
  createFormState,
  reduceEvent,
} from "{{utilityDirImport}}/state-utility";
export {
  assertRecord,
  assertShape,
  toFieldErrors,
} from "{{utilityDirImport}}/validation-utility";
