import type { OfficialRegistryDocOverlayEntry } from "./official-registry-doc";

const NO_EXAMPLE_FOUNDATION_NOTE =
  "No checked-in example install yet. The example apps stay focused on entity and route flows, but this item is still part of the published official registry.";

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
  });
}

export const OFFICIAL_REGISTRY_DOC_OVERLAY: Record<
  string,
  OfficialRegistryDocOverlayEntry
> = {
  "ts-runtime": defineEntry("ts-runtime", {
    useWhen:
      "Install this first for any shared TypeScript composition. It provides the runtime helpers that the reusable utilities and presets build on.",
  }),
  "result-utility": defineEntry("result-utility", {
    useWhen:
      "Use it when service or transport code should represent success and failure explicitly instead of relying on thrown exceptions.",
  }),
  "async-utility": defineEntry("async-utility", {
    useWhen:
      "Use it when shared code needs small async helpers for retries, sequencing, parallel work, or request timeouts.",
  }),
  "object-utility": defineEntry("object-utility", {
    useWhen:
      "Use it when feature code frequently picks, omits, or merges partial object values.",
  }),
  "collection-utility": defineEntry("collection-utility", {
    useWhen:
      "Use it when feature code groups, indexes, or sorts arrays of records in a predictable way.",
  }),
  "validation-utility": defineEntry("validation-utility", {
    useWhen:
      "Use it when blocks or handwritten code need record assertions and normalized field-error objects.",
  }),
  "variant-utility": defineEntry("variant-utility", {
    useWhen:
      "Use it in Next UI code that should choose visual or state variants from declarative maps instead of inline conditionals.",
  }),
  "slot-utility": defineEntry("slot-utility", {
    useWhen:
      "Use it in Next UI code that shares named layout regions or reusable slot props across multiple components.",
  }),
  "state-utility": defineEntry("state-utility", {
    useWhen:
      "Use it in Next UI code that models async loading, form state, or reducer-style events with small typed helpers.",
  }),
  "service-preset": defineEntry("service-preset", {
    useWhen:
      "Use it when a service layer should re-export the result, async, and validation helpers from one stable preset import.",
  }),
  "endpoint-preset": defineEntry("endpoint-preset", {
    useWhen:
      "Use it when endpoint or repository code wants the service preset plus object and collection helpers from one preset import.",
  }),
  "form-preset": defineEntry("form-preset", {
    useWhen:
      "Use it when forms should share validation, object update, and UI state helpers from one preset import.",
  }),
  "admin-page-preset": defineEntry("admin-page-preset", {
    useWhen:
      "Use it when admin-facing UI should share variant, slot, state, and collection helpers from one preset import.",
  }),
  "env-config": defineEntry("env-config", {
    useWhen:
      "Use it when Bun-managed shared code should read environment variables through a typed local wrapper.",
    sampleInstanceId: "env",
    exampleNote: NO_EXAMPLE_FOUNDATION_NOTE,
  }),
  "result-errors": defineEntry("result-errors", {
    useWhen:
      "Use it when you want a concrete Result domain file in shared code without installing the reusable utility set.",
    sampleInstanceId: "result",
    exampleNote: NO_EXAMPLE_FOUNDATION_NOTE,
  }),
  "logger": defineEntry("logger", {
    useWhen:
      "Use it when app-local code needs a tiny structured logger wrapper without pulling in a framework-specific logging layer.",
    sampleInstanceId: "logger",
    exampleNote: NO_EXAMPLE_FOUNDATION_NOTE,
  }),
  "request-context": defineEntry("request-context", {
    useWhen:
      "Use it in Bun HTTP handlers that should share request-scoped metadata or helper accessors.",
    sampleInstanceId: "request",
    exampleNote:
      "No checked-in example install yet. The Bun example keeps its handlers minimal, but this block is intended for request-scoped helpers in larger services.",
  }),
  "entity-contract": withEntityFieldInputs(
    "entity-contract",
    "Start an entity workflow here. It defines the model, create/update inputs, and field metadata that the rest of the entity blocks build on.",
  ),
  "service-layer": withEntityInputs(
    "service-layer",
    "Use it after `entity-contract` when you want repository contracts and service methods for one entity.",
  ),
  "memory-repository": withEntityInputs(
    "memory-repository",
    "Use it to bootstrap a zero-dependency in-memory runtime for an entity while keeping service and repository boundaries intact.",
  ),
  "input-validation": defineEntry("input-validation", {
    useWhen:
      "Use it when create and update payloads should be validated against the same field metadata as the entity contract.",
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
    "Use it when shared or UI code should call one entity collection through a small fetch-based client.",
  ),
  "next-collection-route": withEntityInputs(
    "next-collection-route",
    "Use it in Next App Router when you want the collection API route for one entity.",
  ),
  "next-item-route": withEntityInputs(
    "next-item-route",
    "Use it in Next App Router when you want the item-by-id API route for one entity.",
  ),
  "data-table": withEntityInputs(
    "data-table",
    "Use it in Next App Router admin pages to render a minimal entity table for one resource.",
  ),
  "entity-form": withEntityInputs(
    "entity-form",
    "Use it in Next App Router admin pages to render a minimal create form for one resource.",
  ),
  "admin-page": withEntityInputs(
    "admin-page",
    "Use it in Next App Router to assemble a working admin page from the table, form, API client, and admin-page preset.",
  ),
  "bun-server": defineEntry("bun-server", {
    useWhen:
      "Use it in Bun HTTP services to stitch route modules into a Bun.serve entrypoint.",
    sampleInstanceId: "server",
    sampleInputFiles: {
      routeModules: "./route-modules.json",
    },
    recipeNote:
      "Provide `routeModules` as a JSON array of `{ importName, importPath }` entries that match the route files you want the entrypoint to register.",
  }),
  "health-route": defineEntry("health-route", {
    useWhen:
      "Use it in Bun HTTP services when you want a lightweight health endpoint without any entity-specific inputs.",
    sampleInstanceId: "health",
  }),
  "json-collection-route": withEntityInputs(
    "json-collection-route",
    "Use it in Bun HTTP services to expose collection handlers for one entity.",
  ),
  "json-item-route": withEntityInputs(
    "json-item-route",
    "Use it in Bun HTTP services to expose item-by-id handlers for one entity.",
  ),
};
