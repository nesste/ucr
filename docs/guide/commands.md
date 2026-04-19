# Commands

The CLI entrypoint is `ucr`. Contributors can also run the checked-in workspace build at `packages/cli/dist/bin.js`.

## Synopsis

```bash
ucr <command> [item] [--registry <ref>] [--target <path>] [--instance <id>] [--input key=value] [--input-file key=path] [--force]
```

Available commands:

- `init`
- `list`
- `show`
- `add`
- `diff`
- `upgrade`
- `self-update`

## Shared Options

| Option | Meaning |
| --- | --- |
| `--registry <ref>` | Registry manifest URL or local `registry.json` path. If omitted, UCR falls back to `.ucr/config.json`, `UCR_REGISTRY`, then the built-in official registry URL. |
| `--target <path>` | Target project root. Defaults to the current directory. |
| `--instance <id>` | Required for blocks. Utilities and presets default to their item name. |
| `--input <key=value>` | Repeated typed input for templated items. |
| `--input-file <key=path>` | Repeated input file, useful for JSON values. |
| `--force` | For `add` and `upgrade`, write files even when conflicts would normally abort the operation. |

## Environment Overrides

| Variable | Meaning |
| --- | --- |
| `UCR_REGISTRY` | Registry manifest URL or local `registry.json` path override. |
| `UCR_REGISTRY_AUTH_HEADER` | Optional remote registry auth header in `Header-Name: value` format. |

`UCR_REGISTRY_AUTH_HEADER` is applied to remote manifest requests and to bundle downloads only when the bundle URL is the same origin as the manifest URL.

## `init`

Creates `.ucr/config.json` by inspecting the target project.

```bash
ucr init --target .
```

What it does:

- verifies the target is Bun-managed
- detects the adapter unless `--adapter` overrides it
- computes the shared roots for runtime, utilities, and presets
- stores the selected registry reference in `.ucr/config.json`

Use `--registry https://.../registry.json` to pin a remote manifest explicitly or `--registry /absolute/path/to/registry.json` for contributor and custom local flows.

For authenticated remote private registries, set `UCR_REGISTRY_AUTH_HEADER` before running `init`.

Use `--adapter bun-http` or `--adapter next-app-router` only when you need to force detection.

## `list`

Prints the registry catalog for the resolved adapter.

```bash
ucr list
```

The output includes:

- item name
- kind and version
- number of outputs, inputs, and composed items
- compatibility for the detected target adapter

If the resolved registry is a remote private manifest, `list` uses `UCR_REGISTRY_AUTH_HEADER` when that variable is set.

## `show <item>`

Prints one item's metadata, inputs, and output surfaces.

```bash
ucr show entity-contract
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
ucr add entity-contract --target /absolute/path/to/project --instance posts --input entity=Post --input plural=posts
```

Behavior to expect:

- when the registry is remote, UCR fetches and caches the bundle automatically before rendering
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
ucr diff admin-page --instance posts
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
ucr upgrade service-layer --instance posts
```

Upgrade action labels:

- `create`: file is missing locally and will be recreated
- `replace`: local file still matches the tracked snapshot, so upstream can replace it safely
- `merge`: local and upstream changed in different ranges, so UCR writes a merged result
- `skip`: file is already current or only local changes exist
- `conflict`: local and upstream edits overlap, so manual review is required

Without `--force`, any conflict aborts the upgrade after the plan is printed. With `--force`, conflict files are overwritten with the freshly rendered upstream content.

For local and authenticated remote private registry examples, see [Private Registries](/guide/private-registries).

## `self-update [version]`

Downloads the matching standalone binary from GitHub Releases, verifies the published SHA-256 file, and replaces the current executable.

```bash
ucr self-update
```

Pin to a specific release tag when needed:

```bash
ucr self-update 0.3.0
```

Notes:

- `self-update` only works when `ucr` is running from the installed standalone binary
- on Windows, the replacement is queued and completes just after the current command exits
- on macOS and Linux, the binary is replaced immediately

## Notes On Instance IDs

Two commands commonly use implicit instance ids:

```bash
ucr diff service-preset
```

```bash
ucr upgrade result-utility
```

Those work because reusable items default the instance id to the item name. Blocks still require `--instance`.
