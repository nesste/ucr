import { expect, test } from "bun:test";

import { mergeText } from "../packages/core/src/merge";

test("mergeText auto-merges non-overlapping edits", () => {
  const result = mergeText(
    "alpha\nbeta\ngamma\n",
    "alpha\nbeta local\ngamma\n",
    "alpha\nbeta\ngamma upstream\n",
  );

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.mergedContent).toContain("beta local");
    expect(result.mergedContent).toContain("gamma upstream");
  }
});

test("mergeText reports conflicts for overlapping edits", () => {
  const result = mergeText(
    "alpha\nbeta\ngamma\n",
    "alpha\nbeta local\ngamma\n",
    "alpha\nbeta upstream\ngamma\n",
  );

  expect(result.ok).toBe(false);
});
