import type { OfficialRegistryDocOverlayEntry } from "./official-registry-doc";

const NO_EXAMPLE_FOUNDATION_NOTE =
  "No checked-in example install yet. The example apps stay focused on entity and route flows, but this item is still part of the published official registry.";
const NO_EXAMPLE_STARTER_NOTE =
  "No checked-in example install yet. The checked-in apps stay focused on the granular composition chain, but this starter block is still part of the published official registry.";
const STARTER_ALTERNATIVE_NOTE =
  "This starter block is an alternative entry point. Do not mix it with the equivalent granular installs for the same `--instance`.";

function defineEntry(
  itemName: string,
  overrides: Omit<OfficialRegistryDocOverlayEntry, "itemName">,
): OfficialRegistryDocOverlayEntry {
  return {
    itemName,
    ...overrides,
  };
}

function withEntityInputs(
  itemName: string,
  useWhen: string,
  overrides?: Partial<OfficialRegistryDocOverlayEntry>,
): OfficialRegistryDocOverlayEntry {
  return defineEntry(itemName, {
    useWhen,
    sampleInstanceId: "posts",
    sampleInputs: {
      entity: "Post",
      plural: "posts",
    },
    ...overrides,
  });
}

function withEntityFieldInputs(
  itemName: string,
  useWhen: string,
  overrides?: Partial<OfficialRegistryDocOverlayEntry>,
): OfficialRegistryDocOverlayEntry {
  return defineEntry(itemName, {
    useWhen,
    sampleInstanceId: "posts",
    sampleInputs: {
      entity: "Post",
      plural: "posts",
    },
    sampleInputFiles: {
      fields: "./post.fields.json",
    },
    recipeNote:
      "Supply the same entity naming values across the related entity blocks so the generated contracts, validators, services, and routes stay aligned.",
    ...overrides,
  });
}

export const OFFICIAL_REGISTRY_DOC_OVERLAY: Record<
  string,
  OfficialRegistryDocOverlayEntry
> = {
  "ts-runtime": defineEntry("ts-runtime", {
    useWhen:
      "Install this advanced shared runtime first when you want to compose utilities, presets, or higher-level blocks from the official registry.",
  }),
  "result-utility": defineEntry("result-utility", {
    useWhen:
      "Use this advanced shared primitive as the recommended Result entry point when service or transport code should represent success and failure explicitly.",
  }),
  "async-utility": defineEntry("async-utility", {
    useWhen:
      "Use this advanced shared primitive when handwritten code needs small async helpers for retries, sequencing, parallel work, or request timeouts.",
  }),
  "object-utility": defineEntry("object-utility", {
    useWhen:
      "Use this advanced shared primitive when feature code frequently picks, omits, or merges partial object values.",
  }),
  "collection-utility": defineEntry("collection-utility", {
    useWhen:
      "Use this advanced shared primitive when feature code groups, indexes, or sorts arrays of records in a predictable way.",
  }),
  "validation-utility": defineEntry("validation-utility", {
    useWhen:
      "Use this advanced shared primitive when blocks or handwritten code need record assertions and normalized field-error objects.",
  }),
  "variant-utility": defineEntry("variant-utility", {
    useWhen:
      "Use this advanced Next UI primitive when you want declarative visual variants instead of inline conditionals.",
  }),
  "slot-utility": defineEntry("slot-utility", {
    useWhen:
      "Use this advanced Next UI primitive when you share named layout regions or reusable slot props across multiple components.",
  }),
  "state-utility": defineEntry("state-utility", {
    useWhen:
      "Use this advanced Next UI primitive when you model async loading, form state, or reducer-style events with small typed helpers.",
  }),
  "service-preset": defineEntry("service-preset", {
    useWhen:
      "Use this advanced shared preset when you want one stable import for the Result, async, and validation primitives that service code builds on.",
  }),
  "endpoint-preset": defineEntry("endpoint-preset", {
    useWhen:
      "Use this advanced shared preset when repository or transport code wants the service preset plus object and collection helpers from one stable import.",
  }),
  "form-preset": defineEntry("form-preset", {
    useWhen:
      "Use this advanced Next UI preset when multiple forms should share validation, object update, and state helpers from one stable import.",
  }),
  "admin-page-preset": defineEntry("admin-page-preset", {
    useWhen:
      "Use this advanced Next UI preset when admin-facing screens should share variant, slot, state, and collection helpers from one stable import.",
  }),
  "env-config": defineEntry("env-config", {
    useWhen:
      "Start here for project foundations when shared code should read environment variables through a typed local wrapper.",
    sampleInstanceId: "env",
    exampleNote: NO_EXAMPLE_FOUNDATION_NOTE,
  }),
  "result-errors": defineEntry("result-errors", {
    useWhen:
      "Use this specialized alternative only when you want a concrete Result domain file without installing the recommended `result-utility` building block.",
    sampleInstanceId: "result",
    exampleNote: NO_EXAMPLE_FOUNDATION_NOTE,
  }),
  "logger": defineEntry("logger", {
    useWhen:
      "Start here for project foundations when app-local code needs a tiny structured logger wrapper without pulling in a framework-specific logging layer.",
    sampleInstanceId: "logger",
    exampleNote: NO_EXAMPLE_FOUNDATION_NOTE,
  }),
  "request-context": defineEntry("request-context", {
    useWhen:
      "Use this more advanced Bun foundation when handlers should share request-scoped metadata or helper accessors.",
    sampleInstanceId: "request",
    exampleNote:
      "No checked-in example install yet. The Bun example keeps its handlers minimal, but this block is intended for request-scoped helpers in larger services.",
  }),
  "entity-contract": withEntityFieldInputs(
    "entity-contract",
    "Start a granular entity/API workflow here. It defines the model, create/update inputs, and field metadata that the rest of the resource blocks build on.",
  ),
  "service-layer": withEntityInputs(
    "service-layer",
    "Use it in the granular entity/API flow after `entity-contract` when you want repository contracts and service methods for one resource.",
  ),
  "memory-repository": withEntityInputs(
    "memory-repository",
    "Use it in the granular entity/API flow when you want a zero-dependency in-memory runtime while keeping service and repository boundaries intact.",
  ),
  "input-validation": defineEntry("input-validation", {
    useWhen:
      "Use it in the granular entity/API flow when create and update payloads should be validated against the same field metadata as the entity contract.",
    sampleInstanceId: "posts",
    sampleInputs: {
      entity: "Post",
    },
    sampleInputFiles: {
      fields: "./post.fields.json",
    },
    recipeNote:
      "Point `fields` at the same JSON file you used for `entity-contract` so the generated validators stay in sync with the generated model.",
  }),
  "api-client": withEntityInputs(
    "api-client",
    "Use it when shared or UI code should call one entity collection and item endpoint through a small fetch-based client.",
  ),
  "next-collection-route": withEntityInputs(
    "next-collection-route",
    "Use it in the granular Next entity/API flow when you want the collection API route for one resource.",
  ),
  "next-item-route": withEntityInputs(
    "next-item-route",
    "Use it in the granular Next entity/API flow when you want the item-by-id API route for one resource.",
  ),
  "data-table": withEntityInputs(
    "data-table",
    "Use it in Next App Router admin flows to render a minimal table for one resource.",
  ),
  "entity-form": withEntityInputs(
    "entity-form",
    "Use it in Next App Router admin flows to render a minimal create/edit form for one resource.",
  ),
  "admin-page": withEntityInputs(
    "admin-page",
    "Use it as the fastest granular admin UI entry point in Next App Router to assemble a working resource page from the table, form, API client, and preset blocks.",
  ),
  "entity-detail-page": withEntityInputs(
    "entity-detail-page",
    "Use it in Next App Router admin flows when you want a client-side detail page that loads one record and reuses `entity-form` for edits.",
  ),
  "bun-server": defineEntry("bun-server", {
    useWhen:
      "Start here for Bun project foundations when you want to stitch route modules into a Bun.serve entrypoint.",
    sampleInstanceId: "server",
    sampleInputFiles: {
      routeModules: "./route-modules.json",
    },
    recipeNote:
      "Provide `routeModules` as a JSON array of `{ importName, importPath }` entries that match the route files you want the entrypoint to register.",
  }),
  "health-route": defineEntry("health-route", {
    useWhen:
      "Start here for Bun project foundations when you want a lightweight health endpoint without any entity-specific inputs.",
    sampleInstanceId: "health",
  }),
  "node-server": defineEntry("node-server", {
    useWhen:
      "Start here for Node project foundations when you want to stitch route modules into a built-in node:http entrypoint.",
    sampleInstanceId: "server",
    sampleInputFiles: {
      routeModules: "./route-modules.json",
    },
    recipeNote:
      "Provide `routeModules` as a JSON array of `{ importName, importPath }` entries that match the route files you want the entrypoint to register.",
  }),
  "node-health-route": defineEntry("node-health-route", {
    useWhen:
      "Start here for Node project foundations when you want a lightweight health endpoint without any entity-specific inputs.",
    sampleInstanceId: "health",
  }),
  "json-collection-route": withEntityInputs(
    "json-collection-route",
    "Use it in the granular Bun entity/API flow to expose collection handlers for one resource.",
  ),
  "json-item-route": withEntityInputs(
    "json-item-route",
    "Use it in the granular Bun entity/API flow to expose item-by-id handlers for one resource.",
  ),
  "node-collection-route": withEntityInputs(
    "node-collection-route",
    "Use it in the granular Node entity/API flow to expose collection handlers for one resource.",
  ),
  "node-item-route": withEntityInputs(
    "node-item-route",
    "Use it in the granular Node entity/API flow to expose item-by-id handlers for one resource.",
  ),
  "bun-crud-resource": withEntityFieldInputs(
    "bun-crud-resource",
    "Use it as the fastest Bun HTTP starter for one CRUD resource after the shared TypeScript building blocks are already installed.",
    {
      recipeNote:
        "Supply the same entity naming values across the related resource code so the generated contract, service, validation, and Bun routes stay aligned.\n\n" +
        STARTER_ALTERNATIVE_NOTE,
      exampleNote: NO_EXAMPLE_STARTER_NOTE,
    },
  ),
  "node-crud-resource": withEntityFieldInputs(
    "node-crud-resource",
    "Use it as the fastest Node HTTP starter for one CRUD resource after the shared TypeScript building blocks are already installed.",
    {
      recipeNote:
        "Supply the same entity naming values across the related resource code so the generated contract, service, validation, Node routes, and node:http entrypoint stay aligned.\n\n" +
        STARTER_ALTERNATIVE_NOTE,
      exampleNote: NO_EXAMPLE_STARTER_NOTE,
    },
  ),
  "next-crud-resource": withEntityFieldInputs(
    "next-crud-resource",
    "Use it as the fastest Next App Router starter for one CRUD resource after the shared and UI building blocks are already installed.",
    {
      recipeNote:
        "Supply the same entity naming values across the related resource code so the generated contract, API client, routes, and UI stay aligned.\n\n" +
        STARTER_ALTERNATIVE_NOTE,
      exampleNote: NO_EXAMPLE_STARTER_NOTE,
    },
  ),
};
