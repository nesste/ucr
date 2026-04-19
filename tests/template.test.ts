import { expect, test } from "bun:test";

import { renderTemplate } from "../packages/core/src/template";

test("template rendering supports variables, loops, and conditionals", () => {
  const output = renderTemplate(
    [
      "Hello {{name}}",
      "{{#if items}}",
      "{{#each items}}- {{label}}: {{value}}",
      "{{/each}}",
      "{{/if}}",
    ].join("\n"),
    {
      name: "UCR",
      items: [
        { label: "first", value: 1 },
        { label: "second", value: 2 },
      ],
    },
  );

  expect(output).toContain("Hello UCR");
  expect(output).toContain("- first: 1");
  expect(output).toContain("- second: 2");
});
