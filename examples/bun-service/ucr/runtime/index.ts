type UtilityExports = Record<string, unknown>;

export interface UtilityDefinition<
  Name extends string = string,
  Exports extends UtilityExports = UtilityExports,
> {
  kind: "utility";
  name: Name;
  exports: Exports;
}

export interface PresetDefinition<
  Name extends string = string,
  Exports extends UtilityExports = UtilityExports,
> {
  kind: "preset";
  name: Name;
  compose: string[];
  exports: Exports;
}

export type ComposableDefinition =
  | UtilityDefinition
  | PresetDefinition;

type UnionToIntersection<Value> =
  (Value extends unknown ? (input: Value) => void : never) extends (
    input: infer Intersection,
  ) => void
    ? Intersection
    : never;

type CombinedExports<Parts extends readonly ComposableDefinition[]> =
  UnionToIntersection<Parts[number]["exports"]>;

function mergeExports(
  parts: readonly ComposableDefinition[],
  ownExports: UtilityExports = {},
): UtilityExports {
  const merged: UtilityExports = {};

  for (const part of parts) {
    for (const [exportName, exportValue] of Object.entries(part.exports)) {
      if (exportName in merged) {
        throw new Error(`Duplicate composed export "${exportName}".`);
      }

      merged[exportName] = exportValue;
    }
  }

  for (const [exportName, exportValue] of Object.entries(ownExports)) {
    if (exportName in merged) {
      throw new Error(`Preset export "${exportName}" duplicates a composed export.`);
    }

    merged[exportName] = exportValue;
  }

  return merged;
}

export function compose<const Parts extends readonly ComposableDefinition[]>(
  ...parts: Parts
): CombinedExports<Parts> {
  return mergeExports(parts) as CombinedExports<Parts>;
}

export function defineUtility<
  Name extends string,
  Exports extends UtilityExports,
>(
  name: Name,
  exports: Exports,
): UtilityDefinition<Name, Exports> {
  return {
    kind: "utility",
    name,
    exports,
  };
}

export function definePreset<
  Name extends string,
  const Parts extends readonly ComposableDefinition[],
  OwnExports extends UtilityExports = {},
>(
  name: Name,
  parts: Parts,
  ownExports?: OwnExports,
): PresetDefinition<Name, CombinedExports<Parts> & OwnExports> {
  return {
    kind: "preset",
    name,
    compose: parts.map((part) => part.name),
    exports: mergeExports(parts, ownExports ?? {}) as CombinedExports<Parts> &
      OwnExports,
  };
}
