import { definePreset } from "../runtime";
import {
  asyncUtility,
  parallel,
  retry,
  sequence,
  withTimeout,
} from "../utilities/async-utility";
import {
  err,
  mapError,
  mapResult,
  matchResult,
  ok,
  resultUtility,
} from "../utilities/result-utility";
import {
  assertRecord,
  assertShape,
  toFieldErrors,
  validationUtility,
} from "../utilities/validation-utility";

export const servicePreset = definePreset("service-preset", [
  resultUtility,
  asyncUtility,
  validationUtility,
]);

export {
  assertRecord,
  assertShape,
  err,
  mapError,
  mapResult,
  matchResult,
  ok,
  parallel,
  retry,
  sequence,
  toFieldErrors,
  withTimeout,
};
