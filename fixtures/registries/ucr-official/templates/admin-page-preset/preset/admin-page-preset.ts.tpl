import { definePreset } from "{{runtimeDirImport}}";
import { collectionUtility } from "{{utilityDirImport}}/collection-utility";
import { slotUtility } from "{{utilityDirImport}}/slot-utility";
import { stateUtility } from "{{utilityDirImport}}/state-utility";
import { variantUtility } from "{{utilityDirImport}}/variant-utility";

export const adminPagePreset = definePreset("admin-page-preset", [
  variantUtility,
  slotUtility,
  stateUtility,
  collectionUtility,
]);

export {
  groupBy,
  indexBy,
  sortBy,
} from "{{utilityDirImport}}/collection-utility";
export {
  createSlots,
  mergeSlots,
  resolveSlots,
} from "{{utilityDirImport}}/slot-utility";
export {
  createAsyncState,
  createFormState,
  reduceEvent,
} from "{{utilityDirImport}}/state-utility";
export {
  compoundVariants,
  createVariants,
  pickVariant,
} from "{{utilityDirImport}}/variant-utility";
