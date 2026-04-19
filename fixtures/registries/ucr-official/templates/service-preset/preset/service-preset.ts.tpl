import { definePreset } from "{{runtimeDirImport}}";
import {
  asyncUtility,
  parallel,
  retry,
  sequence,
  withTimeout,
} from "{{utilityDirImport}}/async-utility";
import {
  err,
  mapError,
  mapResult,
  matchResult,
  ok,
  resultUtility,
} from "{{utilityDirImport}}/result-utility";
import {
  assertRecord,
  assertShape,
  toFieldErrors,
  validationUtility,
} from "{{utilityDirImport}}/validation-utility";

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
