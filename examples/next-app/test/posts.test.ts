import { expect, test } from "bun:test";

import {
  createFormState,
} from "../src/ucr/presets/form-preset";
import { pickVariant } from "../src/ucr/presets/admin-page-preset";
import { createEmptyPostInput } from "../src/ucr/posts/contract/model";
import { validateCreatePostInput } from "../src/ucr/posts/contract/validation";

test("post contract exposes stable empty defaults", () => {
  expect(createEmptyPostInput()).toEqual({
    title: "",
    views: 0,
    published: false,
    publishedAt: "",
  });
});

test("post validation accepts a valid payload", () => {
  const result = validateCreatePostInput({
    title: "Example title",
    views: "42",
    published: true,
    publishedAt: "2026-04-19",
  });

  expect(result.ok).toBe(true);
});

test("ui presets expose state and variant helpers", () => {
  const formState = createFormState({
    title: "",
  });
  const style = pickVariant(
    {
      base: {
        color: "#111827",
      },
      variants: {
        tone: {
          success: {
            backgroundColor: "#dcfce7",
          },
        },
      },
    },
    { tone: "success" },
  );

  expect(formState.isSubmitting).toBe(false);
  expect(style.backgroundColor).toBe("#dcfce7");
});
