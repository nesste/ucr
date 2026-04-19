import { definePreset } from "{{runtimeDirImport}}";
import {
  collectionUtility,
  groupBy,
  indexBy,
  sortBy,
} from "{{utilityDirImport}}/collection-utility";
import {
  createSlots,
  mergeSlots,
  resolveSlots,
  slotUtility,
} from "{{utilityDirImport}}/slot-utility";
import {
  createAsyncState,
  createFormState,
  reduceEvent,
  stateUtility,
} from "{{utilityDirImport}}/state-utility";
import {
  compoundVariants,
  createVariants,
  pickVariant,
  variantUtility,
} from "{{utilityDirImport}}/variant-utility";

export const adminPagePreset = definePreset("admin-page-preset", [
  variantUtility,
  slotUtility,
  stateUtility,
  collectionUtility,
]);

export {
  compoundVariants,
  createAsyncState,
  createFormState,
  createSlots,
  createVariants,
  groupBy,
  indexBy,
  mergeSlots,
  pickVariant,
  reduceEvent,
  resolveSlots,
  sortBy,
};
