# Concepts

UCR stays small by treating the registry document as the source of truth and the target project as a Bun-managed filesystem that receives rendered source files.

## Registry Items

Every registry document contains `items[]`. Each item is one of three kinds:

| Kind | Purpose | Typical destination |
| --- | --- | --- |
| `utility` | Atomic reusable helpers | `ucr/utilities` or `src/ucr/utilities` |
| `preset` | Named compositions of utilities or other presets | `ucr/presets` or `src/ucr/presets` |
| `block` | Feature or scaffold outputs tied to an instance | adapter-owned feature, route, UI, or entrypoint paths |

Utilities and presets are reusable items. Their instance id defaults to the item name. Blocks are instance-specific and require `--instance`.

## Targets And Surfaces

Two dimensions control where outputs can go:

- `targets`: which adapters an item supports, either `shared`, `bun-http`, or `next-app-router`
- `surface`: what kind of output a file represents, such as `contract`, `domain`, `transport`, `ui`, `entrypoint`, `utility`, or `preset`

Targets gate item compatibility. Surfaces are what the adapter uses to map a logical output path into a real project path.

## Typed Inputs

Registry items may define typed inputs:

- `string`
- `number`
- `boolean`
- `json`

CLI callers provide them with:

- `--input key=value` for inline values
- `--input-file key=path` when the input is better supplied from a file, especially JSON

The CLI parses and validates inputs before rendering. If an item declares `entity` and `plural`, those values are also exposed to templates in derived forms like camel case, pascal case, kebab case, snake case, and title case.

## Capabilities And Compose

Capabilities let items declare what they require and what they provide.

- utilities provide `utility:<name>`, except `ts-runtime`, which provides `runtime:ts`
- presets provide `preset:<name>`
- blocks can provide instance-scoped capabilities such as `entity-contract:posts`

Presets additionally declare `compose[]`, which names reusable items that should already be installed. UCR resolves that graph, checks for missing capabilities, and rejects duplicate exported symbol names across composed reusable items.

## Instance IDs

The instance id determines the feature namespace for block installs. For example, a `posts` instance will typically render feature code under `ucr/posts/...` or `src/ucr/posts/...`.

Defaulting rules:

- utilities: instance id defaults to the item name
- presets: instance id defaults to the item name
- blocks: instance id must be supplied explicitly

## Deterministic Output Mapping

Registry outputs are declared with a logical `target` and a `surface`. The adapter maps that combination into a stable project path.

Examples:

- a `utility` output lands in the runtime root when the item is `ts-runtime`, otherwise in the utility root
- a `preset` output lands in the preset root
- a `transport` output lands in the adapter's route root
- a `ui` output lands in the app root for `next-app-router`
- an `entrypoint` output lands in the entrypoint root for `bun-http`

See [Adapters](/reference/adapters) for the exact roots.

## The Three UCR State Files

UCR tracks installs with three files under `.ucr/`:

| File | Created by | Purpose |
| --- | --- | --- |
| `config.json` | `init` | detected adapter, registry reference, and shared roots |
| `lock.json` | `add` and `upgrade` | install records, resolved inputs, capabilities, and owned file lists |
| `state.json` | `add` and `upgrade` | per-file upstream snapshots used as the upgrade merge base |

These files are what make `diff` and `upgrade` explainable instead of opaque.

## Registry Resolution

When a command needs a registry file, UCR resolves it in this order:

1. `--registry <path>`
2. `registry` in `.ucr/config.json`
3. `UCR_REGISTRY`
4. upward discovery of `fixtures/registries/ucr-official/registry.json`

That is why the checked-in examples can often run against the official fixture without repeating the registry path after `init`.
