import { definePreset } from "{{runtimeDirImport}}";
import { collectionUtility } from "{{utilityDirImport}}/collection-utility";
import { objectUtility } from "{{utilityDirImport}}/object-utility";
import { servicePreset } from "{{presetDirImport}}/service-preset";

export const endpointPreset = definePreset("endpoint-preset", [
  servicePreset,
  objectUtility,
  collectionUtility,
]);

export {
  groupBy,
  indexBy,
  sortBy,
} from "{{utilityDirImport}}/collection-utility";
export {
  mergeDefined,
  omit,
  pick,
} from "{{utilityDirImport}}/object-utility";
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
} from "{{presetDirImport}}/service-preset";
