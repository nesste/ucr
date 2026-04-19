import { defineUtility } from "../runtime";

export type StyleObject = Record<string, string | number>;

export interface VariantConfig<
  Variants extends Record<string, Record<string, StyleObject>>,
> {
  base: StyleObject;
  variants: Variants;
}

export function createVariants<
  Variants extends Record<string, Record<string, StyleObject>>,
>(
  base: StyleObject,
  variants: Variants,
): VariantConfig<Variants> {
  return {
    base,
    variants,
  };
}

export function pickVariant<
  Variants extends Record<string, Record<string, StyleObject>>,
>(
  config: VariantConfig<Variants>,
  selection: {
    [VariantName in keyof Variants]?: keyof Variants[VariantName];
  },
): StyleObject {
  const output: StyleObject = {
    ...config.base,
  };

  for (const [variantName, variantValue] of Object.entries(selection)) {
    if (!variantValue) {
      continue;
    }

    Object.assign(
      output,
      config.variants[variantName]?.[String(variantValue)] ?? {},
    );
  }

  return output;
}

export function compoundVariants(
  ...styles: Array<StyleObject | undefined>
): StyleObject {
  return styles.reduce<StyleObject>(
    (current, entry) => ({
      ...current,
      ...(entry ?? {}),
    }),
    {},
  );
}

export const variantUtility = defineUtility("variant-utility", {
  createVariants,
  pickVariant,
  compoundVariants,
});
