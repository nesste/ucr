import { defineUtility } from "../runtime";

export function pick<
  Value extends object,
  const Keys extends readonly (keyof Value)[],
>(
  value: Value,
  keys: Keys,
): Pick<Value, Keys[number]> {
  const output = {} as Pick<Value, Keys[number]>;

  for (const key of keys) {
    output[key] = value[key];
  }

  return output;
}

export function omit<
  Value extends object,
  const Keys extends readonly (keyof Value)[],
>(
  value: Value,
  keys: Keys,
): Omit<Value, Keys[number]> {
  const output = { ...value } as Value;

  for (const key of keys) {
    delete (output as Record<keyof Value, unknown>)[key];
  }

  return output as Omit<Value, Keys[number]>;
}

export function mergeDefined<Value extends object>(
  base: Value,
  patch: Partial<Value>,
): Value {
  const output = { ...base } as Value;

  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      (output as Record<string, unknown>)[key] = value;
    }
  }

  return output;
}

export const objectUtility = defineUtility("object-utility", {
  pick,
  omit,
  mergeDefined,
});
