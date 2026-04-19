import { expect, test } from "bun:test";
import { promises as fs } from "node:fs";
import path from "node:path";

import { assertValidRegistryDocument } from "../packages/schema/src/index";
import { OFFICIAL_REGISTRY_DOC_OVERLAY } from "../scripts/lib/official-registry-doc-overlay";
import {
  generateOfficialRegistryDoc,
  type OfficialRegistryDocExampleSource,
  validateOfficialRegistryDocOverlay,
} from "../scripts/lib/official-registry-doc";

const registryPath = path.resolve(
  import.meta.dir,
  "../fixtures/registries/ucr-official/registry.json",
);
const exampleLockFiles = [
  {
    exampleId: "bun-service",
    adapter: "bun-http" as const,
    lockPath: path.resolve(import.meta.dir, "../examples/bun-service/.ucr/lock.json"),
  },
  {
    exampleId: "next-app",
    adapter: "next-app-router" as const,
    lockPath: path.resolve(import.meta.dir, "../examples/next-app/.ucr/lock.json"),
  },
];

async function loadRegistry() {
  return assertValidRegistryDocument(
    JSON.parse(await fs.readFile(registryPath, "utf8")) as unknown,
  );
}

async function loadExampleSources(): Promise<OfficialRegistryDocExampleSource[]> {
  const sources: OfficialRegistryDocExampleSource[] = [];

  for (const example of exampleLockFiles) {
    const raw = JSON.parse(await fs.readFile(example.lockPath, "utf8")) as {
      installs: Record<
        string,
        {
          itemName: string;
          instanceId: string;
          files: string[];
        }
      >;
    };

    sources.push({
      exampleId: example.exampleId,
      adapter: example.adapter,
      installs: Object.values(raw.installs).map((install) => ({
        itemName: install.itemName,
        instanceId: install.instanceId,
        files: install.files,
      })),
    });
  }

  return sources;
}

test("official registry docs overlay matches the official manifest exactly", async () => {
  const registry = await loadRegistry();
  const overlayErrors = validateOfficialRegistryDocOverlay(
    registry,
    OFFICIAL_REGISTRY_DOC_OVERLAY,
  );

  expect(overlayErrors).toEqual([]);
  expect(Object.keys(OFFICIAL_REGISTRY_DOC_OVERLAY).sort()).toEqual(
    registry.items.map((item) => item.name).sort(),
  );
});

test("official registry docs generator renders all item headings and representative recipes", async () => {
  const registry = await loadRegistry();
  const output = generateOfficialRegistryDoc({
    registry,
    overlayByItemName: OFFICIAL_REGISTRY_DOC_OVERLAY,
    exampleSources: await loadExampleSources(),
  });

  for (const item of registry.items) {
    expect(output).toContain(`### \`${item.name}\``);
  }

  expect(output).toContain("- Import path: `<ucr-root>/utilities/result-utility`");
  expect(output).toContain(
    "- Exported helpers: `ok`, `err`, `mapResult`, `mapError`, `matchResult`",
  );
  expect(output).toContain(
    "- Composes: `result-utility`, `async-utility`, `validation-utility`",
  );
  expect(output).toContain(
    "ucr add entity-contract --target . --instance posts --input entity=Post --input plural=posts --input-file fields=./post.fields.json",
  );
  expect(output).toContain(
    "ucr add bun-server --target . --instance server --input-file routeModules=./route-modules.json",
  );
  expect(output).toContain(
    "- `bun-service` (bun-http, instance `server`): `server/index.ts`",
  );
});
