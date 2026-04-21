import { defineUtility } from "../runtime";

export function groupBy<Value>(
  items: readonly Value[],
  getKey: (item: Value) => string,
): Record<string, Value[]> {
  const output: Record<string, Value[]> = {};

  for (const item of items) {
    const key = getKey(item);
    output[key] ??= [];
    output[key].push(item);
  }

  return output;
}

export function indexBy<Value>(
  items: readonly Value[],
  getKey: (item: Value) => string,
): Record<string, Value> {
  const output: Record<string, Value> = {};

  for (const item of items) {
    output[getKey(item)] = item;
  }

  return output;
}

export function sortBy<Value>(
  items: readonly Value[],
  getValue: (item: Value) => string | number | boolean,
): Value[] {
  return [...items].sort((left, right) => {
    const leftValue = getValue(left);
    const rightValue = getValue(right);

    if (leftValue === rightValue) {
      return 0;
    }

    return leftValue > rightValue ? 1 : -1;
  });
}

export const collectionUtility = defineUtility("collection-utility", {
  groupBy,
  indexBy,
  sortBy,
});
