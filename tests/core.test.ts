import { expect, test } from "bun:test";
import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";

import { zipSync } from "fflate";

import { runInitCommand } from "../packages/cli/src/commands/init";
import { OFFICIAL_REGISTRY_URL } from "../packages/cli/src/official-registry";
import { inspectProjectProfile } from "../packages/core/src/adapters";
import { createDiffReport } from "../packages/core/src/diff";
import { applyInstallPlan, createInstallPlan } from "../packages/core/src/install";
import { readRegistryLock } from "../packages/core/src/lock";
import { loadRegistryDocument } from "../packages/core/src/parser";
import { readProjectConfig } from "../packages/core/src/project-config";
import { readRegistryState } from "../packages/core/src/state";

const registryPath = path.resolve(
  import.meta.dir,
  "../fixtures/registries/ucr-official/registry.json",
);
const fieldsPath = path.resolve(
  import.meta.dir,
  "../fixtures/inputs/post.fields.json",
);

async function createTempProject(options?: { next?: boolean }): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ucr-"));
  await fs.writeFile(
    path.join(root, "package.json"),
    `${JSON.stringify(
      options?.next
        ? {
            name: "tmp-next",
            private: true,
            packageManager: "bun@1.3.4",
            dependencies: {
              next: "16.2.4",
            },
          }
        : {
            name: "tmp-bun",
            private: true,
            packageManager: "bun@1.3.4",
          },
      null,
      2,
    )}\n`,
  );

  if (options?.next) {
    await fs.mkdir(path.join(root, "src", "app"), { recursive: true });
  }

  return root;
}

async function installItem(
  registry: Awaited<ReturnType<typeof loadRegistryDocument>>,
  targetRoot: string,
  itemName: string,
  options?: {
    instanceId?: string;
    rawInputs?: Record<string, string>;
  },
) {
  const plan = await createInstallPlan(
    registry,
    itemName,
    targetRoot,
    options?.instanceId ?? "",
    options?.rawInputs ?? {},
  );
  await applyInstallPlan(registry, targetRoot, plan, {
    force: true,
  });

  return plan;
}

async function installSharedTypeScriptBase(
  registry: Awaited<ReturnType<typeof loadRegistryDocument>>,
  targetRoot: string,
): Promise<void> {
  for (const itemName of [
    "ts-runtime",
    "result-utility",
    "async-utility",
    "object-utility",
    "collection-utility",
    "validation-utility",
    "service-preset",
    "endpoint-preset",
  ]) {
    await installItem(registry, targetRoot, itemName);
  }
}

async function createTemporaryRegistry(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ucr-registry-"));
  const registryFile = path.join(root, "registry.json");
  const templatesRoot = path.join(root, "templates");

  await fs.mkdir(templatesRoot, { recursive: true });
  await fs.writeFile(
    path.join(templatesRoot, "runtime.ts.tpl"),
    "export const runtime = true;\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(templatesRoot, "a.ts.tpl"),
    "export const a = true;\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(templatesRoot, "b.ts.tpl"),
    "export const b = true;\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(templatesRoot, "preset.ts.tpl"),
    "export const preset = true;\n",
    "utf8",
  );

  await fs.writeFile(
    registryFile,
    `${JSON.stringify(
      {
        name: "tmp",
        version: "1.0.0",
        items: [
          {
            name: "ts-runtime",
            kind: "utility",
            version: "1.0.0",
            category: "typescript",
            targets: ["shared"],
            provides: ["runtime:ts"],
            metadata: {
              exports: "defineUtility,definePreset,compose",
            },
            outputs: [
              {
                template: "templates/runtime.ts.tpl",
                target: "index.ts",
                surface: "utility",
              },
            ],
          },
          {
            name: "utility-a",
            kind: "utility",
            version: "1.0.0",
            category: "typescript",
            targets: ["shared"],
            requires: ["runtime:ts"],
            provides: ["utility:utility-a"],
            metadata: {
              exports: "dup",
            },
            outputs: [
              {
                template: "templates/a.ts.tpl",
                target: "utility-a.ts",
                surface: "utility",
              },
            ],
          },
          {
            name: "utility-b",
            kind: "utility",
            version: "1.0.0",
            category: "typescript",
            targets: ["shared"],
            requires: ["runtime:ts"],
            provides: ["utility:utility-b"],
            metadata: {
              exports: "dup",
            },
            outputs: [
              {
                template: "templates/b.ts.tpl",
                target: "utility-b.ts",
                surface: "utility",
              },
            ],
          },
          {
            name: "broken-preset",
            kind: "preset",
            version: "1.0.0",
            category: "typescript",
            targets: ["shared"],
            compose: ["utility-a", "utility-b"],
            requires: ["runtime:ts", "utility:utility-a", "utility:utility-b"],
            provides: ["preset:broken-preset"],
            outputs: [
              {
                template: "templates/preset.ts.tpl",
                target: "broken-preset.ts",
                surface: "preset",
              },
            ],
          },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return registryFile;
}

async function createPublishedRegistryBundle(): Promise<{
  manifest: Record<string, unknown>;
  bundle: Uint8Array;
  checksum: string;
}> {
  const registryFile = await createTemporaryRegistry();
  const registryRoot = path.dirname(registryFile);
  const sourceManifest = JSON.parse(
    await fs.readFile(registryFile, "utf8"),
  ) as Record<string, unknown>;
  const zipEntries: Record<string, Uint8Array> = {
    "registry.json": Buffer.from(
      `${JSON.stringify(sourceManifest, null, 2)}\n`,
      "utf8",
    ),
  };

  async function collectFiles(rootDir: string): Promise<string[]> {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const absolutePath = path.join(rootDir, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await collectFiles(absolutePath)));
        continue;
      }

      files.push(absolutePath);
    }

    return files;
  }

  for (const templateFile of await collectFiles(path.join(registryRoot, "templates"))) {
    const relativePath = path
      .relative(registryRoot, templateFile)
      .split(path.sep)
      .join("/");
    zipEntries[relativePath] = await fs.readFile(templateFile);
  }

  const bundle = zipSync(zipEntries, {
    level: 0,
  });
  const checksum = createHash("sha256").update(bundle).digest("hex");

  return {
    manifest: {
      ...sourceManifest,
      distribution: {
        format: "zip",
        bundleUrl: "bundle.zip",
        checksum,
      },
    },
    bundle,
    checksum,
  };
}

test("project inspection distinguishes bun-http and next-app-router", async () => {
  const bunRoot = await createTempProject();
  const nextRoot = await createTempProject({ next: true });

  await expect(inspectProjectProfile(bunRoot)).resolves.toMatchObject({
    adapterId: "bun-http",
    packageManager: "bun",
    testRunner: "bun",
  });
  await expect(inspectProjectProfile(nextRoot)).resolves.toMatchObject({
    adapterId: "next-app-router",
    appRoot: "src/app",
  });
});

test("install flow writes lock/state and diff reports local edits", async () => {
  const projectRoot = await createTempProject();
  const registry = await loadRegistryDocument(registryPath);
  const fields = await fs.readFile(fieldsPath, "utf8");
  await installSharedTypeScriptBase(registry, projectRoot);

  const entityPlan = await installItem(registry, projectRoot, "entity-contract", {
    instanceId: "posts",
    rawInputs: {
      entity: "Post",
      plural: "posts",
      fields,
    },
  });

  const servicePlan = await installItem(registry, projectRoot, "service-layer", {
    instanceId: "posts",
    rawInputs: {
      entity: "Post",
      plural: "posts",
    },
  });

  const repositoryPlan = await installItem(
    registry,
    projectRoot,
    "memory-repository",
    {
      instanceId: "posts",
      rawInputs: {
      entity: "Post",
      plural: "posts",
      },
    },
  );

  const lock = await readRegistryLock(projectRoot);
  const state = await readRegistryState(projectRoot);
  expect(lock?.version).toBe(3);
  expect(lock?.registry.transport).toBe("file");
  expect(lock?.registry.manifestUrl).toBe(registryPath);
  expect(lock?.installs["ts-runtime:ts-runtime"]?.itemKind).toBe("utility");
  expect(lock?.installs["service-preset:service-preset"]?.compose).toContain(
    "result-utility",
  );
  expect(lock?.installs["memory-repository:posts"]?.provides).toContain(
    "service-runtime:posts",
  );
  expect(state?.version).toBe(5);
  expect(state?.registry.transport).toBe("file");
  expect(state?.registry.manifestUrl).toBe(registryPath);

  const initialDiff = await createDiffReport(
    registry,
    "entity-contract",
    projectRoot,
    "posts",
  );
  expect(initialDiff.summary.identical).toBe(1);

  const modelPath = path.join(projectRoot, "ucr", "posts", "contract", "model.ts");
  await fs.appendFile(modelPath, "\n// local change\n", "utf8");

  const nextDiff = await createDiffReport(
    registry,
    "entity-contract",
    projectRoot,
    "posts",
  );
  expect(nextDiff.entries[0]?.status).toBe("modified");
});

test("preset installs default to the item name for the instance id", async () => {
  const projectRoot = await createTempProject();
  const registry = await loadRegistryDocument(registryPath);

  await installItem(registry, projectRoot, "ts-runtime");

  const lock = await readRegistryLock(projectRoot);
  expect(lock?.installs["ts-runtime:ts-runtime"]?.files).toContain(
    "ucr/runtime/index.ts",
  );
});

test("install plan refuses missing block requirements", async () => {
  const projectRoot = await createTempProject();
  const registry = await loadRegistryDocument(registryPath);

  await expect(
    createInstallPlan(
      registry,
      "json-collection-route",
      projectRoot,
      "posts",
      {
        entity: "Post",
        plural: "posts",
      },
    ),
  ).rejects.toThrow("service-runtime:posts");
});

test("preset install rejects duplicate composed exports", async () => {
  const projectRoot = await createTempProject();
  const tempRegistryPath = await createTemporaryRegistry();
  const registry = await loadRegistryDocument(tempRegistryPath);

  await installItem(registry, projectRoot, "ts-runtime");
  await installItem(registry, projectRoot, "utility-a");
  await installItem(registry, projectRoot, "utility-b");

  await expect(
    createInstallPlan(
      registry,
      "broken-preset",
      projectRoot,
      "",
      {},
    ),
  ).rejects.toThrow("duplicate composed exports");
});

test("remote registry loads, caches bundles, and falls back to the newest cached copy", async () => {
  const published = await createPublishedRegistryBundle();
  const requestCounts = {
    manifest: 0,
    bundle: 0,
  };
  const server = createServer((request, response) => {
    if (request.url === "/registry.json") {
      requestCounts.manifest += 1;
      response.setHeader("content-type", "application/json");
      response.end(`${JSON.stringify(published.manifest, null, 2)}\n`);
      return;
    }

    if (request.url === "/bundle.zip") {
      requestCounts.bundle += 1;
      response.setHeader("content-type", "application/zip");
      response.end(Buffer.from(published.bundle));
      return;
    }

    response.statusCode = 404;
    response.end("not found");
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Failed to start the registry test server.");
  }

  const manifestUrl = `http://127.0.0.1:${address.port}/registry.json`;
  const firstLoad = await loadRegistryDocument(manifestUrl);
  expect(firstLoad.source.transport).toBe("http");
  expect(firstLoad.source.bundleChecksum).toBe(published.checksum);
  expect(firstLoad.source.cacheDir).not.toBeNull();
  expect(requestCounts.bundle).toBe(1);

  const secondLoad = await loadRegistryDocument(manifestUrl);
  expect(secondLoad.registryFile).toBe(firstLoad.registryFile);
  expect(requestCounts.bundle).toBe(1);

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  const cachedLoad = await loadRegistryDocument(manifestUrl);
  expect(cachedLoad.document.name).toBe(firstLoad.document.name);
  expect(cachedLoad.registryFile).toBe(firstLoad.registryFile);
});

test("init writes the built-in official registry URL when no registry is provided", async () => {
  const projectRoot = await createTempProject();

  await runInitCommand({
    registryRef: undefined,
    targetRoot: projectRoot,
    adapterId: undefined,
  });

  const config = await readProjectConfig(projectRoot);
  expect(config?.registry).toBe(OFFICIAL_REGISTRY_URL);
});
