import { definePreset } from "{{runtimeDirImport}}";
import {
  mergeDefined,
  objectUtility,
  omit,
  pick,
} from "{{utilityDirImport}}/object-utility";
import {
  createAsyncState,
  createFormState,
  reduceEvent,
  stateUtility,
} from "{{utilityDirImport}}/state-utility";
import {
  assertRecord,
  assertShape,
  toFieldErrors,
  validationUtility,
} from "{{utilityDirImport}}/validation-utility";

export const formPreset = definePreset("form-preset", [
  validationUtility,
  objectUtility,
  stateUtility,
]);

export {
  assertRecord,
  assertShape,
  createAsyncState,
  createFormState,
  mergeDefined,
  omit,
  pick,
  reduceEvent,
  toFieldErrors,
};
