import { definePreset } from "../runtime";
import {
  collectionUtility,
  groupBy,
  indexBy,
  sortBy,
} from "../utilities/collection-utility";
import {
  mergeDefined,
  objectUtility,
  omit,
  pick,
} from "../utilities/object-utility";
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
} from ".//service-preset";

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
