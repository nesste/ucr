# Universal Code Registry

Universal Code Registry (UCR) is a Bun-first, source-only registry for reusable internal code. It installs audited source files into an existing Bun-managed project, keeps the output paths deterministic, and records enough state to diff and upgrade those installs later.

UCR does not replace Bun. Bun still owns external packages and `bun.lock`. UCR owns the registry templates, typed install inputs, adapter-aware file placement, and the `.ucr/*.json` files that track what was installed.

Detailed guides and reference material live in the [docs website source](./docs/index.md). Run `bun run docs:dev` to browse it locally.

## What UCR Owns

UCR manages three tracked files inside the target project:

- `.ucr/config.json`: detected adapter, registry reference, and install roots
- `.ucr/lock.json`: installed items, resolved inputs, compose dependencies, and owned files
- `.ucr/state.json`: per-file upstream snapshots used by `diff` and `upgrade`

It installs three kinds of registry items:

- `utility`: reusable TypeScript helpers installed into `ucr/utilities` or `src/ucr/utilities`
- `preset`: reusable compositions of utilities installed into `ucr/presets` or `src/ucr/presets`
- `block`: feature scaffolding installed into adapter-owned feature, route, UI, or entrypoint paths

It currently supports two adapters:

- `bun-http`
- `next-app-router`

## How It Works

The normal workflow is:

1. `ucr init` inspects a Bun project and writes `.ucr/config.json`.
2. `ucr list` shows which registry items are available for that target.
3. `ucr show <item>` prints inputs, outputs, compose dependencies, and compatibility.
4. `ucr add <item>` renders source files into deterministic locations and records the install.
5. `ucr diff <item>` compares the local install with a fresh upstream render.
6. `ucr upgrade <item>` applies safe upstream updates and reports conflicts when manual review is needed.

Utilities and presets default their instance id to the item name. Blocks require `--instance`.

## Quickstart

Inspect the checked-in registry and example targets:

```bash
bun install
bun run build

bun packages/cli/dist/bin.js list --registry fixtures/registries/ucr-official/registry.json --target examples/bun-service
bun packages/cli/dist/bin.js show service-preset --registry fixtures/registries/ucr-official/registry.json --target examples/bun-service

bun packages/cli/dist/bin.js list --registry fixtures/registries/ucr-official/registry.json --target examples/next-app
bun packages/cli/dist/bin.js show admin-page --registry fixtures/registries/ucr-official/registry.json --target examples/next-app
```

Run the example applications:

```bash
cd examples/bun-service
bun run start
```

```bash
cd examples/next-app
bun run build
```

Validate the repo:

```bash
bun run build
bun run docs:build
bun run typecheck
bun test
```

## Deterministic Install Roots

UCR maps the same logical registry outputs into adapter-specific roots every time.

For `bun-http` projects:

- runtime: `ucr/runtime`
- utilities: `ucr/utilities`
- presets: `ucr/presets`
- feature code: `ucr/<instance>/...`
- routes: `server/routes/...`
- entrypoints: `server/...`

For `next-app-router` projects with a `src/` app layout:

- runtime: `src/ucr/runtime`
- utilities: `src/ucr/utilities`
- presets: `src/ucr/presets`
- feature code: `src/ucr/<instance>/...`
- routes: `src/app/api/...`
- UI: `src/app/...`

## When To Use UCR

Use UCR when you want:

- reusable internal code to stay source-owned after install
- adapter-aware scaffolding with predictable output paths
- typed template inputs instead of executable generators
- tracked upgrades after local edits exist

Do not use UCR when you want:

- third-party package resolution or lockfile management
- registry-driven package installation
- arbitrary hooks or executable generators
- automatic patching of user-owned files in v1

## Current v1 Constraints

- the target project must be Bun-managed
- supported adapters are limited to `bun-http` and `next-app-router`
- generated code must come from registry-owned templates
- legacy registry item formats are rejected

## Learn More

The docs site expands on the README with:

- a guided quickstart for both example targets
- command-by-command CLI reference
- registry format and adapter path mapping reference
- upgrade and diff behavior
- contributor-facing architecture and development notes

Start at [docs/index.md](./docs/index.md).
