import { expect, test } from "bun:test";
import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";

import { zipSync } from "fflate";
import * as ts from "typescript";

import { runAddCommand } from "../packages/cli/src/commands/add";
import { runDiffCommand } from "../packages/cli/src/commands/diff";
import { runInitCommand } from "../packages/cli/src/commands/init";
import { runListCommand } from "../packages/cli/src/commands/list";
import { runShowCommand } from "../packages/cli/src/commands/show";
import { runUpgradeCommand } from "../packages/cli/src/commands/upgrade";
import { OFFICIAL_REGISTRY_URL } from "../packages/cli/src/official-registry";
import {
  inspectProjectProfile,
  type ProjectAdapterId,
} from "../packages/core/src/adapters";
import { createDiffReport } from "../packages/core/src/diff";
import { applyInstallPlan, createInstallPlan } from "../packages/core/src/install";
import { readRegistryLock } from "../packages/core/src/lock";
import { loadRegistryDocument } from "../packages/core/src/parser";
import { readProjectConfig } from "../packages/core/src/project-config";
import { readRegistryState } from "../packages/core/src/state";
import type { InstallPlan } from "../packages/core/src/types";

const registryPath = path.resolve(
  import.meta.dir,
  "../fixtures/registries/ucr-official/registry.json",
);
const fieldsPath = path.resolve(
  import.meta.dir,
  "../fixtures/inputs/post.fields.json",
);

type TempProjectManager = "bun" | "npm" | "pnpm";

async function writeManagerMarker(
  root: string,
  manager: TempProjectManager,
): Promise<void> {
  if (manager === "bun") {
    await fs.writeFile(path.join(root, "bun.lock"), "", "utf8");
    return;
  }

  if (manager === "npm") {
    await fs.writeFile(
      path.join(root, "package-lock.json"),
      `${JSON.stringify(
        {
          name: "tmp-project",
          version: "0.0.1",
          lockfileVersion: 3,
          requires: true,
          packages: {
            "": {
              name: "tmp-project",
              version: "0.0.1",
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    return;
  }

  await fs.writeFile(
    path.join(root, "pnpm-lock.yaml"),
    "lockfileVersion: '9.0'\n",
    "utf8",
  );
}

async function createTempProject(options?: {
  next?: boolean;
  manager?: TempProjectManager;
}): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ucr-"));
  const manager = options?.manager ?? "bun";
  const packageManager =
    manager === "bun"
      ? "bun@1.3.4"
      : manager === "npm"
        ? "npm@10.9.0"
        : "pnpm@9.15.0";
  await fs.writeFile(
    path.join(root, "package.json"),
    `${JSON.stringify(
      options?.next
        ? {
            name: "tmp-next",
            private: true,
            packageManager,
            dependencies: {
              next: "16.2.4",
            },
          }
        : {
            name: `tmp-${manager}`,
            private: true,
            packageManager,
          },
      null,
      2,
    )}\n`,
  );
  await writeManagerMarker(root, manager);

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

async function installNextUiBase(
  registry: Awaited<ReturnType<typeof loadRegistryDocument>>,
  targetRoot: string,
): Promise<void> {
  for (const itemName of [
    "variant-utility",
    "slot-utility",
    "state-utility",
    "form-preset",
    "admin-page-preset",
  ]) {
    await installItem(registry, targetRoot, itemName);
  }
}

type LoadedTestRegistry = Awaited<ReturnType<typeof loadRegistryDocument>>;
type TemplateValidationProjectKind = "bun" | "node" | "next";

const sharedTypeScriptTemplateItems = [
  "ts-runtime",
  "result-utility",
  "async-utility",
  "object-utility",
  "collection-utility",
  "validation-utility",
  "service-preset",
  "endpoint-preset",
] as const;

const nextUiTemplateItems = [
  "variant-utility",
  "slot-utility",
  "state-utility",
  "form-preset",
  "admin-page-preset",
] as const;

const entityInputs = {
  entity: "Post",
  plural: "posts",
} as const;

const templateValidationAdapterIds: Record<
  TemplateValidationProjectKind,
  ProjectAdapterId
> = {
  bun: "bun-http",
  node: "node-http",
  next: "next-app-router",
};

const routeModules = JSON.stringify([
  {
    importName: "healthRoute",
    importPath: "./routes/health",
  },
  {
    importName: "postCollectionRoute",
    importPath: "./routes/posts/index",
  },
  {
    importName: "postItemRoute",
    importPath: "./routes/posts/[id]",
  },
]);

function templateValidationParent(kind: TemplateValidationProjectKind): string {
  const exampleDir =
    kind === "next"
      ? "next-app"
      : kind === "node"
        ? "node-service"
        : "bun-service";

  return path.resolve(import.meta.dir, "../examples", exampleDir);
}

async function createTemplateValidationProject(
  kind: TemplateValidationProjectKind,
): Promise<string> {
  const root = await fs.mkdtemp(
    path.join(templateValidationParent(kind), ".ucr-template-validation-"),
  );
  const manager: TempProjectManager = kind === "node" ? "npm" : "bun";
  const packageManager = manager === "npm" ? "npm@10.9.0" : "bun@1.3.4";
  const manifest =
    kind === "next"
      ? {
          name: "ucr-template-validation-next",
          private: true,
          packageManager,
          dependencies: {
            next: "16.2.4",
            react: "19.2.4",
            "react-dom": "19.2.4",
          },
        }
      : {
          name: `ucr-template-validation-${kind}`,
          private: true,
          packageManager,
        };

  await fs.writeFile(
    path.join(root, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  await writeManagerMarker(root, manager);

  if (kind === "next") {
    await fs.mkdir(path.join(root, "src", "app"), { recursive: true });
    await fs.writeFile(
      path.join(root, "next-env.d.ts"),
      '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n',
      "utf8",
    );
  }

  return root;
}

async function removeTemplateValidationProject(root: string): Promise<void> {
  if (!path.basename(root).startsWith(".ucr-template-validation-")) {
    throw new Error(`Refusing to remove unexpected validation path: ${root}`);
  }

  await fs.rm(root, { recursive: true, force: true });
}

async function installTemplateValidationItem(
  registry: LoadedTestRegistry,
  targetRoot: string,
  coveredTemplates: Set<string>,
  itemName: string,
  options?: {
    instanceId?: string;
    rawInputs?: Record<string, string>;
  },
): Promise<InstallPlan> {
  const plan = await installItem(registry, targetRoot, itemName, options);

  for (const operation of plan.operations) {
    coveredTemplates.add(operation.template);
  }

  return plan;
}

async function installTemplateValidationBase(
  registry: LoadedTestRegistry,
  targetRoot: string,
  coveredTemplates: Set<string>,
): Promise<void> {
  for (const itemName of sharedTypeScriptTemplateItems) {
    await installTemplateValidationItem(
      registry,
      targetRoot,
      coveredTemplates,
      itemName,
    );
  }
}

async function installTemplateValidationNextUiBase(
  registry: LoadedTestRegistry,
  targetRoot: string,
  coveredTemplates: Set<string>,
): Promise<void> {
  for (const itemName of nextUiTemplateItems) {
    await installTemplateValidationItem(
      registry,
      targetRoot,
      coveredTemplates,
      itemName,
    );
  }
}

async function collectTypeScriptFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  async function visit(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".next" ||
        entry.name === "dist"
      ) {
        continue;
      }

      const entryPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        await visit(entryPath);
        continue;
      }

      if (
        entry.isFile() &&
        (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
      ) {
        files.push(entryPath);
      }
    }
  }

  await visit(root);
  return files.sort();
}

function templateValidationCompilerOptions(
  kind: TemplateValidationProjectKind,
): ts.CompilerOptions {
  const common: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    strict: true,
    noImplicitOverride: true,
    noUncheckedIndexedAccess: true,
    exactOptionalPropertyTypes: true,
    esModuleInterop: true,
    resolveJsonModule: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    noEmit: true,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
  };

  if (kind === "next") {
    return {
      ...common,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.Preserve,
      allowJs: true,
      isolatedModules: true,
      types: ["node", "react", "react-dom"],
    };
  }

  return {
    ...common,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    types: kind === "bun" ? ["node", "bun"] : ["node"],
  };
}

function formatTypeScriptDiagnostic(root: string, diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");

  if (diagnostic.file && diagnostic.start !== undefined) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start,
    );
    const filePath = path.relative(root, diagnostic.file.fileName);
    return `${filePath}:${line + 1}:${character + 1} ${message}`;
  }

  return message;
}

async function typecheckTemplateValidationProject(
  kind: TemplateValidationProjectKind,
  root: string,
): Promise<void> {
  const sourceFiles = await collectTypeScriptFiles(root);

  if (sourceFiles.length === 0) {
    throw new Error(`No TypeScript files were generated for ${kind}.`);
  }

  const program = ts.createProgram({
    rootNames: sourceFiles,
    options: templateValidationCompilerOptions(kind),
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);

  if (diagnostics.length > 0) {
    throw new Error(
      [
        `${kind} generated template project has TypeScript errors:`,
        ...diagnostics.map((diagnostic) =>
          formatTypeScriptDiagnostic(root, diagnostic),
        ),
      ].join("\n"),
    );
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

async function listenOnRandomPort(
  server: ReturnType<typeof createServer>,
): Promise<number> {
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Failed to start the registry test server.");
  }

  return address.port;
}

async function closeServer(
  server: ReturnType<typeof createServer>,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function withRegistryAuthHeader<T>(
  rawValue: string | undefined,
  action: () => Promise<T>,
): Promise<T> {
  const previousValue = process.env.UCR_REGISTRY_AUTH_HEADER;

  if (rawValue === undefined) {
    delete process.env.UCR_REGISTRY_AUTH_HEADER;
  } else {
    process.env.UCR_REGISTRY_AUTH_HEADER = rawValue;
  }

  try {
    return await action();
  } finally {
    if (previousValue === undefined) {
      delete process.env.UCR_REGISTRY_AUTH_HEADER;
    } else {
      process.env.UCR_REGISTRY_AUTH_HEADER = previousValue;
    }
  }
}

async function captureConsoleLogs(action: () => Promise<void>): Promise<string> {
  const originalLog = console.log;
  const lines: string[] = [];

  console.log = (...args: unknown[]) => {
    lines.push(args.map((value) => String(value)).join(" "));
  };

  try {
    await action();
  } finally {
    console.log = originalLog;
  }

  return lines.join("\n");
}

test("project inspection detects Bun, npm, and pnpm project matrices", async () => {
  const bunRoot = await createTempProject();
  const bunNextRoot = await createTempProject({ next: true });
  const npmRoot = await createTempProject({ manager: "npm" });
  const npmNextRoot = await createTempProject({
    next: true,
    manager: "npm",
  });
  const pnpmRoot = await createTempProject({ manager: "pnpm" });
  const pnpmNextRoot = await createTempProject({
    next: true,
    manager: "pnpm",
  });

  await expect(inspectProjectProfile(bunRoot)).resolves.toMatchObject({
    adapterId: "bun-http",
    packageManager: "bun",
    testRunner: "bun",
  });
  await expect(inspectProjectProfile(bunNextRoot)).resolves.toMatchObject({
    adapterId: "next-app-router",
    packageManager: "bun",
    testRunner: "bun",
    appRoot: "src/app",
  });
  await expect(inspectProjectProfile(npmRoot)).resolves.toMatchObject({
    adapterId: "node-http",
    packageManager: "npm",
    testRunner: "unknown",
  });
  await expect(inspectProjectProfile(npmNextRoot)).resolves.toMatchObject({
    adapterId: "next-app-router",
    packageManager: "npm",
    testRunner: "unknown",
    appRoot: "src/app",
  });
  await expect(inspectProjectProfile(pnpmRoot)).resolves.toMatchObject({
    adapterId: "node-http",
    packageManager: "pnpm",
    testRunner: "unknown",
  });
  await expect(inspectProjectProfile(pnpmNextRoot)).resolves.toMatchObject({
    adapterId: "next-app-router",
    packageManager: "pnpm",
    testRunner: "unknown",
    appRoot: "src/app",
  });
});

test("adapter overrides reject incompatible runtime and framework combinations", async () => {
  const npmRoot = await createTempProject({ manager: "npm" });
  const bunNextRoot = await createTempProject({ next: true });

  await expect(inspectProjectProfile(npmRoot, "bun-http")).rejects.toThrow(
    'Adapter "bun-http" requires a Bun-managed non-Next project.',
  );
  await expect(inspectProjectProfile(bunNextRoot, "node-http")).rejects.toThrow(
    'Adapter "node-http" is not available for Next.js projects.',
  );
});

test("project config reads v4 and normalizes to v5", async () => {
  const projectRoot = await createTempProject();
  const configDir = path.join(projectRoot, ".ucr");
  const configFile = path.join(configDir, "config.json");

  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(
    configFile,
    `${JSON.stringify(
      {
        version: 4,
        registry: registryPath,
        adapter: "bun-http",
        packageManager: "bun",
        testRunner: "bun",
        sourceRoot: ".",
        appRoot: null,
        runtimeRoot: "ucr/runtime",
        utilityRoot: "ucr/utilities",
        presetRoot: "ucr/presets",
        capabilities: ["adapter:bun-http", "bun", "bun:test"],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  await expect(readProjectConfig(projectRoot)).resolves.toMatchObject({
    version: 5,
    adapter: "bun-http",
    packageManager: "bun",
    testRunner: "bun",
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

test("list groups the official catalog by workflow and keeps incompatible items last", async () => {
  const projectRoot = await createTempProject({ next: true });
  const output = await captureConsoleLogs(async () => {
    await runListCommand({
      registryRef: registryPath,
      targetRoot: projectRoot,
    });
  });

  expect(output).toContain("Project Foundations");
  expect(output).toContain("Entity/API Flows");
  expect(output).toContain("Admin UI");
  expect(output).toContain("Building Blocks");
  expect(output).toContain("Incompatible");
  expect(output).toContain("Typed environment helpers for managed projects.");
  expect(output).toContain("tags=foundation, starter, shared");
  expect(output.indexOf("Project Foundations")).toBeLessThan(
    output.indexOf("Entity/API Flows"),
  );
  expect(output.indexOf("Entity/API Flows")).toBeLessThan(
    output.indexOf("Admin UI"),
  );
  expect(output.indexOf("Admin UI")).toBeLessThan(
    output.indexOf("Building Blocks"),
  );
  expect(output.indexOf("Building Blocks")).toBeLessThan(
    output.indexOf("Incompatible"),
  );
  expect(output.indexOf("Incompatible")).toBeLessThan(
    output.indexOf("request-context"),
  );
});

test("list falls back to flat ordering for registries without catalog metadata", async () => {
  const projectRoot = await createTempProject();
  const tempRegistryPath = await createTemporaryRegistry();
  const output = await captureConsoleLogs(async () => {
    await runListCommand({
      registryRef: tempRegistryPath,
      targetRoot: projectRoot,
    });
  });

  expect(output).not.toContain("Project Foundations");
  expect(output.indexOf("ts-runtime")).toBeLessThan(output.indexOf("utility-a"));
  expect(output.indexOf("utility-a")).toBeLessThan(output.indexOf("utility-b"));
  expect(output.indexOf("utility-b")).toBeLessThan(output.indexOf("broken-preset"));
});

test("env-config does not require Bun ambient types in Next projects", async () => {
  const projectRoot = await createTempProject({ next: true });
  const registry = await loadRegistryDocument(registryPath);

  await installItem(registry, projectRoot, "env-config", {
    instanceId: "env",
  });

  const envConfig = await fs.readFile(
    path.join(projectRoot, "src", "ucr", "env", "config", "env.ts"),
    "utf8",
  );

  expect(envConfig).toContain("process.env.PORT");
  expect(envConfig).toContain("process.env.NODE_ENV");
  expect(envConfig).not.toContain("Bun.env");
});

test("official registry templates render and typecheck for every supported adapter", async () => {
  const registry = await loadRegistryDocument(registryPath);
  const fields = await fs.readFile(fieldsPath, "utf8");
  const coveredTemplates = new Set<string>();
  const projectRoots: string[] = [];
  const entityWithFieldsInputs = {
    ...entityInputs,
    fields,
  };

  async function createValidationProject(
    kind: TemplateValidationProjectKind,
  ): Promise<string> {
    const projectRoot = await createTemplateValidationProject(kind);
    projectRoots.push(projectRoot);

    await expect(inspectProjectProfile(projectRoot)).resolves.toMatchObject({
      adapterId: templateValidationAdapterIds[kind],
    });

    return projectRoot;
  }

  try {
    const bunRoot = await createValidationProject("bun");
    await installTemplateValidationBase(registry, bunRoot, coveredTemplates);
    await installTemplateValidationItem(
      registry,
      bunRoot,
      coveredTemplates,
      "env-config",
      { instanceId: "env" },
    );
    await installTemplateValidationItem(
      registry,
      bunRoot,
      coveredTemplates,
      "logger",
      { instanceId: "logger" },
    );
    await installTemplateValidationItem(
      registry,
      bunRoot,
      coveredTemplates,
      "result-errors",
      { instanceId: "result-errors" },
    );
    await installTemplateValidationItem(
      registry,
      bunRoot,
      coveredTemplates,
      "request-context",
      { instanceId: "request" },
    );
    await installTemplateValidationItem(
      registry,
      bunRoot,
      coveredTemplates,
      "health-route",
      { instanceId: "health" },
    );
    await installTemplateValidationItem(
      registry,
      bunRoot,
      coveredTemplates,
      "bun-crud-resource",
      {
        instanceId: "posts",
        rawInputs: entityWithFieldsInputs,
      },
    );
    await installTemplateValidationItem(
      registry,
      bunRoot,
      coveredTemplates,
      "bun-server",
      {
        instanceId: "server",
        rawInputs: { routeModules },
      },
    );
    await typecheckTemplateValidationProject("bun", bunRoot);

    const nodeRoot = await createValidationProject("node");
    await installTemplateValidationBase(registry, nodeRoot, coveredTemplates);
    await installTemplateValidationItem(
      registry,
      nodeRoot,
      coveredTemplates,
      "env-config",
      { instanceId: "env" },
    );
    await installTemplateValidationItem(
      registry,
      nodeRoot,
      coveredTemplates,
      "logger",
      { instanceId: "logger" },
    );
    await installTemplateValidationItem(
      registry,
      nodeRoot,
      coveredTemplates,
      "result-errors",
      { instanceId: "result-errors" },
    );
    await installTemplateValidationItem(
      registry,
      nodeRoot,
      coveredTemplates,
      "node-health-route",
      { instanceId: "health" },
    );
    await installTemplateValidationItem(
      registry,
      nodeRoot,
      coveredTemplates,
      "entity-contract",
      {
        instanceId: "posts",
        rawInputs: entityWithFieldsInputs,
      },
    );
    await installTemplateValidationItem(
      registry,
      nodeRoot,
      coveredTemplates,
      "service-layer",
      {
        instanceId: "posts",
        rawInputs: entityInputs,
      },
    );
    await installTemplateValidationItem(
      registry,
      nodeRoot,
      coveredTemplates,
      "memory-repository",
      {
        instanceId: "posts",
        rawInputs: entityInputs,
      },
    );
    await installTemplateValidationItem(
      registry,
      nodeRoot,
      coveredTemplates,
      "input-validation",
      {
        instanceId: "posts",
        rawInputs: {
          entity: entityInputs.entity,
          fields,
        },
      },
    );
    await installTemplateValidationItem(
      registry,
      nodeRoot,
      coveredTemplates,
      "node-collection-route",
      {
        instanceId: "posts",
        rawInputs: entityInputs,
      },
    );
    await installTemplateValidationItem(
      registry,
      nodeRoot,
      coveredTemplates,
      "node-item-route",
      {
        instanceId: "posts",
        rawInputs: entityInputs,
      },
    );
    await installTemplateValidationItem(
      registry,
      nodeRoot,
      coveredTemplates,
      "node-server",
      {
        instanceId: "server",
        rawInputs: { routeModules },
      },
    );
    await typecheckTemplateValidationProject("node", nodeRoot);

    const nodeCrudRoot = await createValidationProject("node");
    await installTemplateValidationBase(registry, nodeCrudRoot, coveredTemplates);
    await installTemplateValidationItem(
      registry,
      nodeCrudRoot,
      coveredTemplates,
      "node-crud-resource",
      {
        instanceId: "posts",
        rawInputs: entityWithFieldsInputs,
      },
    );
    await typecheckTemplateValidationProject("node", nodeCrudRoot);

    const nextRoot = await createValidationProject("next");
    await installTemplateValidationBase(registry, nextRoot, coveredTemplates);
    await installTemplateValidationNextUiBase(
      registry,
      nextRoot,
      coveredTemplates,
    );
    await installTemplateValidationItem(
      registry,
      nextRoot,
      coveredTemplates,
      "env-config",
      { instanceId: "env" },
    );
    await installTemplateValidationItem(
      registry,
      nextRoot,
      coveredTemplates,
      "logger",
      { instanceId: "logger" },
    );
    await installTemplateValidationItem(
      registry,
      nextRoot,
      coveredTemplates,
      "result-errors",
      { instanceId: "result-errors" },
    );
    await installTemplateValidationItem(
      registry,
      nextRoot,
      coveredTemplates,
      "next-crud-resource",
      {
        instanceId: "posts",
        rawInputs: entityWithFieldsInputs,
      },
    );
    await installTemplateValidationItem(
      registry,
      nextRoot,
      coveredTemplates,
      "entity-detail-page",
      {
        instanceId: "posts",
        rawInputs: entityInputs,
      },
    );
    await typecheckTemplateValidationProject("next", nextRoot);

    const expectedTemplates = new Set(
      registry.document.items.flatMap((item) =>
        item.outputs.map((output) => output.template),
      ),
    );

    expect([...coveredTemplates].sort()).toEqual(
      [...expectedTemplates].sort(),
    );
  } finally {
    await Promise.all(projectRoots.map(removeTemplateValidationProject));
  }
});

test("starter CRUD blocks render the full Bun, Node, and Next resource chains", async () => {
  const registry = await loadRegistryDocument(registryPath);
  const fields = await fs.readFile(fieldsPath, "utf8");

  const bunRoot = await createTempProject();
  await installSharedTypeScriptBase(registry, bunRoot);
  await installItem(registry, bunRoot, "bun-crud-resource", {
    instanceId: "posts",
    rawInputs: {
      entity: "Post",
      plural: "posts",
      fields,
    },
  });

  const bunLock = await readRegistryLock(bunRoot);
  expect(bunLock?.installs["bun-crud-resource:posts"]?.provides).toContain(
    "service-runtime:posts",
  );
  expect(bunLock?.installs["bun-crud-resource:posts"]?.files).toContain(
    "server/routes/posts/index.ts",
  );
  expect(bunLock?.installs["bun-crud-resource:posts"]?.files).toContain(
    "ucr/posts/domain/service.ts",
  );

  const nodeRoot = await createTempProject({ manager: "npm" });
  await installSharedTypeScriptBase(registry, nodeRoot);
  await installItem(registry, nodeRoot, "node-crud-resource", {
    instanceId: "posts",
    rawInputs: {
      entity: "Post",
      plural: "posts",
      fields,
    },
  });

  const nodeLock = await readRegistryLock(nodeRoot);
  expect(nodeLock?.installs["node-crud-resource:posts"]?.provides).toContain(
    "node-item-route:posts",
  );
  expect(nodeLock?.installs["node-crud-resource:posts"]?.files).toContain(
    "server/routes/posts/index.ts",
  );
  expect(nodeLock?.installs["node-crud-resource:posts"]?.files).toContain(
    "server/index.ts",
  );
  expect(nodeLock?.installs["node-crud-resource:posts"]?.files).toContain(
    "ucr/posts/domain/service.ts",
  );

  const nodeEntrypoint = await fs.readFile(
    path.join(nodeRoot, "server", "index.ts"),
    "utf8",
  );
  expect(nodeEntrypoint).toContain('from "node:http"');
  expect(nodeEntrypoint).toContain("createServer");
  expect(nodeEntrypoint).toContain('import { postCollectionRoute }');

  const nextRoot = await createTempProject({ next: true });
  await installSharedTypeScriptBase(registry, nextRoot);
  await installNextUiBase(registry, nextRoot);
  await installItem(registry, nextRoot, "next-crud-resource", {
    instanceId: "posts",
    rawInputs: {
      entity: "Post",
      plural: "posts",
      fields,
    },
  });

  const nextLock = await readRegistryLock(nextRoot);
  expect(nextLock?.installs["next-crud-resource:posts"]?.provides).toContain(
    "admin-page:posts",
  );
  expect(nextLock?.installs["next-crud-resource:posts"]?.files).toContain(
    "src/app/posts/page.tsx",
  );
  expect(nextLock?.installs["next-crud-resource:posts"]?.files).toContain(
    "src/ucr/posts/domain/api-client.ts",
  );

  const nextApiClient = await fs.readFile(
    path.join(nextRoot, "src", "ucr", "posts", "domain", "api-client.ts"),
    "utf8",
  );
  const nextEntityForm = await fs.readFile(
    path.join(nextRoot, "src", "app", "posts", "entity-form.tsx"),
    "utf8",
  );
  expect(nextApiClient).toContain("export async function getPost");
  expect(nextEntityForm).toContain("initialValues?: Partial<CreatePostInput>");
  expect(nextEntityForm).toContain("submitLabel?: string");
});

test("entity detail pages install on top of the CRUD resource flow", async () => {
  const registry = await loadRegistryDocument(registryPath);
  const fields = await fs.readFile(fieldsPath, "utf8");
  const projectRoot = await createTempProject({ next: true });

  await installSharedTypeScriptBase(registry, projectRoot);
  await installNextUiBase(registry, projectRoot);
  await installItem(registry, projectRoot, "next-crud-resource", {
    instanceId: "posts",
    rawInputs: {
      entity: "Post",
      plural: "posts",
      fields,
    },
  });
  await installItem(registry, projectRoot, "entity-detail-page", {
    instanceId: "posts",
    rawInputs: {
      entity: "Post",
      plural: "posts",
    },
  });

  const lock = await readRegistryLock(projectRoot);
  expect(lock?.installs["entity-detail-page:posts"]?.provides).toContain(
    "entity-detail-page:posts",
  );
  expect(lock?.installs["entity-detail-page:posts"]?.files).toContain(
    "src/app/posts/[id]/page.tsx",
  );

  const detailPage = await fs.readFile(
    path.join(projectRoot, "src", "app", "posts", "[id]", "page.tsx"),
    "utf8",
  );
  expect(detailPage).toContain("getPost");
  expect(detailPage).toContain("Save Post");
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

  const port = await listenOnRandomPort(server);
  const manifestUrl = `http://127.0.0.1:${port}/registry.json`;
  const firstLoad = await loadRegistryDocument(manifestUrl);
  expect(firstLoad.source.transport).toBe("http");
  expect(firstLoad.source.bundleChecksum).toBe(published.checksum);
  expect(firstLoad.source.cacheDir).not.toBeNull();
  expect(requestCounts.bundle).toBe(1);

  const secondLoad = await loadRegistryDocument(manifestUrl);
  expect(secondLoad.registryFile).toBe(firstLoad.registryFile);
  expect(requestCounts.bundle).toBe(1);

  await closeServer(server);

  const cachedLoad = await loadRegistryDocument(manifestUrl);
  expect(cachedLoad.document.name).toBe(firstLoad.document.name);
  expect(cachedLoad.registryFile).toBe(firstLoad.registryFile);
});

test("remote registry auth header gates manifest fetches and is not written to cache metadata", async () => {
  const published = await createPublishedRegistryBundle();
  const requiredHeaderValue = "Bearer secret-token";
  const requestHeaders = {
    manifest: [] as Array<string | undefined>,
    bundle: [] as Array<string | undefined>,
  };
  const server = createServer((request, response) => {
    const authHeader =
      typeof request.headers.authorization === "string"
        ? request.headers.authorization
        : undefined;

    if (request.url === "/registry.json") {
      requestHeaders.manifest.push(authHeader);

      if (authHeader !== requiredHeaderValue) {
        response.statusCode = 401;
        response.end("unauthorized");
        return;
      }

      response.setHeader("content-type", "application/json");
      response.end(`${JSON.stringify(published.manifest, null, 2)}\n`);
      return;
    }

    if (request.url === "/bundle.zip") {
      requestHeaders.bundle.push(authHeader);

      if (authHeader !== requiredHeaderValue) {
        response.statusCode = 401;
        response.end("unauthorized");
        return;
      }

      response.setHeader("content-type", "application/zip");
      response.end(Buffer.from(published.bundle));
      return;
    }

    response.statusCode = 404;
    response.end("not found");
  });

  const port = await listenOnRandomPort(server);

  try {
    const manifestUrl = `http://127.0.0.1:${port}/registry.json`;

    await expect(loadRegistryDocument(manifestUrl)).rejects.toThrow(
      "401 Unauthorized",
    );

    const loaded = await loadRegistryDocument(manifestUrl, {
      requestHeaders: {
        Authorization: requiredHeaderValue,
      },
    });
    expect(loaded.source.cacheDir).not.toBeNull();
    expect(requestHeaders.manifest).toContain(requiredHeaderValue);
    expect(requestHeaders.bundle).toEqual([requiredHeaderValue]);

    const cacheMetadata = await fs.readFile(
      path.join(loaded.source.cacheDir!, ".ucr-cache.json"),
      "utf8",
    );
    expect(cacheMetadata).not.toContain(requiredHeaderValue);
    expect(cacheMetadata).not.toContain("Authorization");
  } finally {
    await closeServer(server);
  }
});

test("remote registry auth header is not forwarded to cross-origin bundle URLs", async () => {
  const published = await createPublishedRegistryBundle();
  const requiredHeaderValue = "Bearer cross-origin-secret";
  const requestHeaders = {
    manifest: [] as Array<string | undefined>,
    bundle: [] as Array<string | undefined>,
  };
  const bundleServer = createServer((request, response) => {
    const authHeader =
      typeof request.headers.authorization === "string"
        ? request.headers.authorization
        : undefined;

    if (request.url === "/bundle.zip") {
      requestHeaders.bundle.push(authHeader);
      response.setHeader("content-type", "application/zip");
      response.end(Buffer.from(published.bundle));
      return;
    }

    response.statusCode = 404;
    response.end("not found");
  });
  const bundlePort = await listenOnRandomPort(bundleServer);
  (published.manifest.distribution as { bundleUrl: string }).bundleUrl =
    `http://127.0.0.1:${bundlePort}/bundle.zip`;

  const manifestServer = createServer((request, response) => {
    const authHeader =
      typeof request.headers.authorization === "string"
        ? request.headers.authorization
        : undefined;

    if (request.url === "/registry.json") {
      requestHeaders.manifest.push(authHeader);

      if (authHeader !== requiredHeaderValue) {
        response.statusCode = 401;
        response.end("unauthorized");
        return;
      }

      response.setHeader("content-type", "application/json");
      response.end(`${JSON.stringify(published.manifest, null, 2)}\n`);
      return;
    }

    response.statusCode = 404;
    response.end("not found");
  });
  const manifestPort = await listenOnRandomPort(manifestServer);

  try {
    const manifestUrl = `http://127.0.0.1:${manifestPort}/registry.json`;
    const loaded = await loadRegistryDocument(manifestUrl, {
      requestHeaders: {
        Authorization: requiredHeaderValue,
      },
    });

    expect(loaded.source.cacheDir).not.toBeNull();
    expect(requestHeaders.manifest).toEqual([requiredHeaderValue]);
    expect(requestHeaders.bundle).toEqual([undefined]);
  } finally {
    await closeServer(manifestServer);
    await closeServer(bundleServer);
  }
});

test("commands pass registry auth headers through remote registry loading and never persist them", async () => {
  const projectRoot = await createTempProject();
  const published = await createPublishedRegistryBundle();
  const requiredHeaderValue = "Bearer command-secret";
  const requestHeaders = {
    manifest: [] as Array<string | undefined>,
    bundle: [] as Array<string | undefined>,
  };
  const server = createServer((request, response) => {
    const authHeader =
      typeof request.headers.authorization === "string"
        ? request.headers.authorization
        : undefined;

    if (request.url === "/registry.json") {
      requestHeaders.manifest.push(authHeader);

      if (authHeader !== requiredHeaderValue) {
        response.statusCode = 401;
        response.end("unauthorized");
        return;
      }

      response.setHeader("content-type", "application/json");
      response.end(`${JSON.stringify(published.manifest, null, 2)}\n`);
      return;
    }

    if (request.url === "/bundle.zip") {
      requestHeaders.bundle.push(authHeader);

      if (authHeader !== requiredHeaderValue) {
        response.statusCode = 401;
        response.end("unauthorized");
        return;
      }

      response.setHeader("content-type", "application/zip");
      response.end(Buffer.from(published.bundle));
      return;
    }

    response.statusCode = 404;
    response.end("not found");
  });
  const port = await listenOnRandomPort(server);

  try {
    const manifestUrl = `http://127.0.0.1:${port}/registry.json`;

    await withRegistryAuthHeader(
      `Authorization: ${requiredHeaderValue}`,
      async () => {
        await runInitCommand({
          registryRef: manifestUrl,
          targetRoot: projectRoot,
          adapterId: undefined,
        });
        await runListCommand({
          registryRef: undefined,
          targetRoot: projectRoot,
        });
        await runShowCommand({
          registryRef: undefined,
          targetRoot: projectRoot,
          itemName: "ts-runtime",
        });
        await runAddCommand({
          registryRef: undefined,
          targetRoot: projectRoot,
          itemName: "ts-runtime",
          instanceId: "",
          rawInputs: {},
          force: true,
        });
        await runDiffCommand({
          registryRef: undefined,
          targetRoot: projectRoot,
          itemName: "ts-runtime",
          instanceId: "",
          rawInputs: {},
          force: false,
        });
        await runUpgradeCommand({
          registryRef: undefined,
          targetRoot: projectRoot,
          itemName: "ts-runtime",
          instanceId: "",
          rawInputs: {},
          force: false,
        });
      },
    );

    expect(requestHeaders.manifest.length).toBeGreaterThanOrEqual(6);
    expect(requestHeaders.manifest.every((value) => value === requiredHeaderValue)).toBe(true);
    expect(requestHeaders.bundle).toEqual([requiredHeaderValue]);

    const projectConfigRaw = await fs.readFile(
      path.join(projectRoot, ".ucr", "config.json"),
      "utf8",
    );
    const lockRaw = await fs.readFile(
      path.join(projectRoot, ".ucr", "lock.json"),
      "utf8",
    );
    const stateRaw = await fs.readFile(
      path.join(projectRoot, ".ucr", "state.json"),
      "utf8",
    );

    expect(projectConfigRaw).not.toContain(requiredHeaderValue);
    expect(lockRaw).not.toContain(requiredHeaderValue);
    expect(stateRaw).not.toContain(requiredHeaderValue);
    expect(projectConfigRaw).not.toContain("Authorization");
    expect(lockRaw).not.toContain("Authorization");
    expect(stateRaw).not.toContain("Authorization");
  } finally {
    await closeServer(server);
  }
});

test("malformed registry auth headers fail fast", async () => {
  const projectRoot = await createTempProject();

  await expect(
    withRegistryAuthHeader("Authorization", async () => {
      await runListCommand({
        registryRef: registryPath,
        targetRoot: projectRoot,
      });
    }),
  ).rejects.toThrow('UCR_REGISTRY_AUTH_HEADER must use the format "Header-Name: value".');
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
