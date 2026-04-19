import { defineUtility } from "../runtime";

type SlotShape = Record<string, Record<string, string | number>>;

export function createSlots<Slots extends SlotShape>(slots: Slots): Slots {
  return slots;
}

export function mergeSlots<Slots extends SlotShape>(
  slots: Slots,
  overrides: Partial<{
    [SlotName in keyof Slots]: Partial<Slots[SlotName]>;
  }> = {},
): Slots {
  const output = { ...slots } as Slots;

  for (const [slotName, slotOverrides] of Object.entries(overrides)) {
    output[slotName as keyof Slots] = {
      ...output[slotName as keyof Slots],
      ...(slotOverrides ?? {}),
    };
  }

  return output;
}

export function resolveSlots<Slots extends SlotShape>(slots: Slots): Slots {
  return slots;
}

export const slotUtility = defineUtility("slot-utility", {
  createSlots,
  mergeSlots,
  resolveSlots,
});
