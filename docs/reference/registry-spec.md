# Registry Spec

The UCR registry format is intentionally small and declarative. One document defines all installable items, their inputs, their capabilities, and the source templates used to produce files.

## Top-Level Shape

A registry document contains:

- `name`
- `version`
- optional `$schema`
- optional `distribution`
- `items[]`

Each item must be uniquely named.

## Item Fields

Shared item fields:

| Field | Required | Notes |
| --- | --- | --- |
| `name` | yes | Unique item name. |
| `kind` | yes | `block`, `utility`, or `preset`. |
| `version` | yes | Item version string. |
| `category` | yes | Freeform category label. |
| `targets` | yes | One or more of `shared`, `bun-http`, `node-http`, `next-app-router`. |
| `outputs[]` | yes | At least one output is required. |
| `description` | no | Human-readable description. |
| `inputs[]` | no | Typed input definitions. |
| `requires[]` | no | Required capability names. |
| `provides[]` | no | Capability names the item provides after install. |
| `tags[]` | no | Freeform labels. |
| `entrypoints[]` | no | Entry files expressed as logical paths. |
| `metadata` | no | String-valued map used for extra registry metadata. |

Preset-only field:

| Field | Required | Notes |
| --- | --- | --- |
| `compose[]` | yes for presets | Names reusable items the preset composes. |

## Distribution Metadata

Remote registries add an optional top-level `distribution` block:

| Field | Required | Notes |
| --- | --- | --- |
| `format` | yes when present | Currently only `zip`. |
| `bundleUrl` | yes when present | Absolute URL or relative URL from the manifest location. |
| `checksum` | yes when present | SHA-256 hex digest of the bundle file. |

Local filesystem registries do not need `distribution`.

## Input Definitions

Each input definition contains:

| Field | Required | Notes |
| --- | --- | --- |
| `name` | yes | Unique input name per item. |
| `type` | yes | `string`, `number`, `boolean`, or `json`. |
| `description` | no | Human-readable explanation. |
| `required` | no | Defaults to required when omitted in CLI display. |

## Output Definitions

Each output contains:

| Field | Required | Notes |
| --- | --- | --- |
| `template` | yes | Registry-owned template path relative to the registry root. |
| `target` | yes | Logical output path before adapter mapping. |
| `surface` | yes | One of the supported output surfaces. |
| `description` | no | Human-readable explanation. |
| `overwrite` | no | Marks the output as overwrite-safe during install. |

Supported surfaces:

- `contract`
- `domain`
- `transport`
- `ui`
- `test`
- `config`
- `entrypoint`
- `utility`
- `preset`

## Targets

Supported targets:

- `shared`
- `bun-http`
- `node-http`
- `next-app-router`

`shared` means the item can be installed into either adapter, subject to whether the adapter supports each output surface.

## Capabilities And Composition

Capability rules in the current implementation:

- utilities provide `utility:<name>`, except `ts-runtime`, which provides `runtime:ts`
- presets provide `preset:<name>`
- blocks may provide instance-scoped capabilities such as `service-runtime:posts`
- presets can only compose reusable items, meaning utilities or other presets

When a preset is rendered, UCR resolves the full `compose[]` graph, checks that all required capabilities already exist in the target project, and rejects duplicate exported symbol names across composed reusable items.

## Validation Rules

The schema package enforces several repo-visible rules:

- registry document must be a JSON object
- item names must be unique
- every item must have at least one output
- `compose[]` is required for presets and forbidden for other kinds
- target values, surface values, and input types must come from the supported enums
- duplicate output keys for the same `surface:target` pair are rejected
- legacy keys such as `files`, `dependencies`, `packageDependencies`, and `devDependencies` are rejected

## Minimal Example

```json
{
  "name": "ucr-official",
  "version": "3.0.0",
  "distribution": {
    "format": "zip",
    "bundleUrl": "bundle.zip",
    "checksum": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },
  "items": [
    {
      "name": "ts-runtime",
      "kind": "utility",
      "version": "1.0.0",
      "category": "typescript",
      "targets": ["shared"],
      "provides": ["runtime:ts"],
      "outputs": [
        {
          "template": "templates/ts-runtime/utility/index.ts.tpl",
          "target": "index.ts",
          "surface": "utility"
        }
      ]
    },
    {
      "name": "service-preset",
      "kind": "preset",
      "version": "1.0.0",
      "category": "typescript",
      "targets": ["shared"],
      "compose": ["result-utility", "async-utility", "validation-utility"],
      "requires": [
        "runtime:ts",
        "utility:result-utility",
        "utility:async-utility",
        "utility:validation-utility"
      ],
      "provides": ["preset:service-preset"],
      "outputs": [
        {
          "template": "templates/service-preset/preset/service-preset.ts.tpl",
          "target": "service-preset.ts",
          "surface": "preset"
        }
      ]
    }
  ]
}
```

## Related Files

- registry type definitions and validation live in `packages/schema/src/index.ts`
- the JSON schema file lives in `packages/schema/registry.schema.json`
- the official example registry lives in `fixtures/registries/ucr-official/registry.json`
- published static registry assets are generated into `docs/public/registry/ucr-official`
