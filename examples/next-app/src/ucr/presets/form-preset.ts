import { definePreset } from "../runtime";
import {
  mergeDefined,
  objectUtility,
  omit,
  pick,
} from "../utilities/object-utility";
import {
  createAsyncState,
  createFormState,
  reduceEvent,
  stateUtility,
} from "../utilities/state-utility";
import {
  assertRecord,
  assertShape,
  toFieldErrors,
  validationUtility,
} from "../utilities/validation-utility";

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
