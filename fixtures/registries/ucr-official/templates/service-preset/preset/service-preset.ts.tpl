import { definePreset } from "{{runtimeDirImport}}";
import { asyncUtility } from "{{utilityDirImport}}/async-utility";
import { resultUtility } from "{{utilityDirImport}}/result-utility";
import { validationUtility } from "{{utilityDirImport}}/validation-utility";

export const servicePreset = definePreset("service-preset", [
  resultUtility,
  asyncUtility,
  validationUtility,
]);

export {
  parallel,
  retry,
  sequence,
  withTimeout,
} from "{{utilityDirImport}}/async-utility";
export {
  err,
  mapError,
  mapResult,
  matchResult,
  ok,
} from "{{utilityDirImport}}/result-utility";
export {
  assertRecord,
  assertShape,
  toFieldErrors,
} from "{{utilityDirImport}}/validation-utility";
