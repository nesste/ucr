import { expect, test } from "bun:test";

import { validateRegistryDocument } from "../packages/schema/src/index";

test("registry validation accepts utility and preset metadata", () => {
  const result = validateRegistryDocument({
    name: "demo",
    version: "1.0.0",
    items: [
      {
        name: "ts-runtime",
        kind: "utility",
        version: "1.0.0",
        category: "typescript",
        targets: ["shared"],
        provides: ["runtime:ts"],
        outputs: [
          {
            template: "templates/runtime.ts.tpl",
            target: "index.ts",
            surface: "utility",
          },
        ],
      },
      {
        name: "service-preset",
        kind: "preset",
        version: "1.0.0",
        category: "typescript",
        targets: ["shared"],
        compose: ["result-utility", "async-utility"],
        provides: ["preset:service-preset"],
        outputs: [
          {
            template: "templates/service-preset.ts.tpl",
            target: "service-preset.ts",
            surface: "preset",
          },
        ],
      },
    ],
  });

  expect(result.ok).toBe(true);
});

test("registry validation rejects legacy kinds", () => {
  const result = validateRegistryDocument({
    name: "demo",
    version: "1.0.0",
    items: [
      {
        name: "crud-resource",
        kind: "resource",
        version: "1.0.0",
        category: "legacy",
        targets: ["shared"],
        outputs: [
          {
            template: "templates/model.ts.tpl",
            target: "model.ts",
            surface: "contract",
          },
        ],
      },
    ],
  });

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.errors.join("\n")).toContain('supports "block", "utility", and "preset"');
  }
});

test("registry validation rejects presets without compose", () => {
  const result = validateRegistryDocument({
    name: "demo",
    version: "1.0.0",
    items: [
      {
        name: "broken-preset",
        kind: "preset",
        version: "1.0.0",
        category: "typescript",
        targets: ["shared"],
        outputs: [
          {
            template: "templates/broken.ts.tpl",
            target: "broken.ts",
            surface: "preset",
          },
        ],
      },
    ],
  });

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.errors.join("\n")).toContain('must include a non-empty "compose" array');
  }
});
