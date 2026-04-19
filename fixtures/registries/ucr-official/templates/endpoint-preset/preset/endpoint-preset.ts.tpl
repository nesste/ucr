import { definePreset } from "{{runtimeDirImport}}";
import {
  collectionUtility,
  groupBy,
  indexBy,
  sortBy,
} from "{{utilityDirImport}}/collection-utility";
import {
  mergeDefined,
  objectUtility,
  omit,
  pick,
} from "{{utilityDirImport}}/object-utility";
import {
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
  servicePreset,
  toFieldErrors,
  withTimeout,
} from "{{presetDirImport}}/service-preset";

export const endpointPreset = definePreset("endpoint-preset", [
  servicePreset,
  objectUtility,
  collectionUtility,
]);

export {
  assertRecord,
  assertShape,
  err,
  groupBy,
  indexBy,
  mapError,
  mapResult,
  matchResult,
  mergeDefined,
  ok,
  omit,
  parallel,
  pick,
  retry,
  sequence,
  sortBy,
  toFieldErrors,
  withTimeout,
};
