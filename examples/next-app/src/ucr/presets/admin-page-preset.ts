import { definePreset } from "../runtime";
import {
  collectionUtility,
  groupBy,
  indexBy,
  sortBy,
} from "../utilities/collection-utility";
import {
  createSlots,
  mergeSlots,
  resolveSlots,
  slotUtility,
} from "../utilities/slot-utility";
import {
  createAsyncState,
  createFormState,
  reduceEvent,
  stateUtility,
} from "../utilities/state-utility";
import {
  compoundVariants,
  createVariants,
  pickVariant,
  variantUtility,
} from "../utilities/variant-utility";

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
