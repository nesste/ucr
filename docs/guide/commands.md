# Commands

The CLI entrypoint is `ucr`, which in this repository is built to `packages/cli/dist/bin.js`.

## Synopsis

```bash
ucr <command> [item] [--registry <path>] [--target <path>] [--instance <id>] [--input key=value] [--input-file key=path] [--force]
```

Available commands:

- `init`
- `list`
- `show`
- `add`
- `diff`
- `upgrade`

## Shared Options

| Option | Meaning |
| --- | --- |
| `--registry <path>` | Registry JSON file. If omitted, UCR falls back to `.ucr/config.json`, `UCR_REGISTRY`, then fixture discovery. |
| `--target <path>` | Target project root. Defaults to the current directory. |
| `--instance <id>` | Required for blocks. Utilities and presets default to their item name. |
| `--input <key=value>` | Repeated typed input for templated items. |
| `--input-file <key=path>` | Repeated input file, useful for JSON values. |
| `--force` | For `add` and `upgrade`, write files even when conflicts would normally abort the operation. |

## `init`

Creates `.ucr/config.json` by inspecting the target project.

```bash
bun packages/cli/dist/bin.js init --registry fixtures/registries/ucr-official/registry.json --target examples/bun-service
```

What it does:

- verifies the target is Bun-managed
- detects the adapter unless `--adapter` overrides it
- computes the shared roots for runtime, utilities, and presets
- stores the registry path as a project-relative reference when one is provided

Use `--adapter bun-http` or `--adapter next-app-router` only when you need to force detection.

## `list`

Prints the registry catalog for the resolved adapter.

```bash
bun packages/cli/dist/bin.js list --registry fixtures/registries/ucr-official/registry.json --target examples/next-app
```

The output includes:

- item name
- kind and version
- number of outputs, inputs, and composed items
- compatibility for the detected target adapter

## `show <item>`

Prints one item's metadata, inputs, and output surfaces.

```bash
bun packages/cli/dist/bin.js show entity-contract --registry fixtures/registries/ucr-official/registry.json --target examples/bun-service
```

The output includes:

- item kind, version, category, and description
- target compatibility for the resolved adapter
- `compose`, `requires`, and `provides`
- declared typed inputs
- outputs and whether each surface is supported by the adapter

## `add <item>`

Renders one registry item into source files and records the install in `.ucr/lock.json` and `.ucr/state.json`.

```bash
bun packages/cli/dist/bin.js add entity-contract --registry fixtures/registries/ucr-official/registry.json --target /absolute/path/to/project --instance posts --input entity=Post --input plural=posts
```

Behavior to expect:

- reusable items default their instance id
- blocks require `--instance`
- missing required capabilities cause the install plan to fail before files are written
- existing identical files are skipped
- outputs marked `overwrite: true` are safe to replace
- different existing files cause conflicts unless `--force` is supplied

Plan action labels:

- `create`: file does not exist yet
- `overwrite`: file is replaceable because the registry marks that output as overwrite-safe
- `skip`: local file already matches upstream
- `conflict`: local file differs and would be overwritten

## `diff <item>`

Compares a tracked install with a fresh render from the current registry templates.

```bash
bun packages/cli/dist/bin.js diff admin-page --registry fixtures/registries/ucr-official/registry.json --target examples/next-app --instance posts
```

Status labels:

- `identical`: local file matches upstream
- `behind`: local file still matches the tracked snapshot, but upstream changed
- `modified`: only local changes were detected
- `missing`: expected file is gone locally
- `conflict`: both local and upstream changed since the tracked snapshot
- `untracked`: file differs from upstream and is not tracked for that install instance

Use `diff` before `upgrade` when you want to inspect the shape of upcoming changes without writing files.

## `upgrade <item>`

Re-renders a tracked install from the locked inputs and applies safe updates.

```bash
bun packages/cli/dist/bin.js upgrade service-layer --registry fixtures/registries/ucr-official/registry.json --target /absolute/path/to/project --instance posts
```

Upgrade action labels:

- `create`: file is missing locally and will be recreated
- `replace`: local file still matches the tracked snapshot, so upstream can replace it safely
- `merge`: local and upstream changed in different ranges, so UCR writes a merged result
- `skip`: file is already current or only local changes exist
- `conflict`: local and upstream edits overlap, so manual review is required

Without `--force`, any conflict aborts the upgrade after the plan is printed. With `--force`, conflict files are overwritten with the freshly rendered upstream content.

## Notes On Instance IDs

Two commands commonly use implicit instance ids:

```bash
bun packages/cli/dist/bin.js diff service-preset --target examples/bun-service
```

```bash
bun packages/cli/dist/bin.js upgrade result-utility --target examples/bun-service
```

Those work because reusable items default the instance id to the item name. Blocks still require `--instance`.
