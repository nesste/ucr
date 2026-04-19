# Quickstart

This walkthrough uses the checked-in official registry and the two example targets in this repository. It also closes with the minimal flow for using UCR against your own Bun project.

## Prerequisites

- Bun `1.3.4`
- a clone of this repository
- `bun install` already run in the repo root

Build the workspace before invoking the CLI from `packages/cli/dist`:

```bash
bun install
bun run build
```

If you want to browse the docs locally while you work:

```bash
bun run docs:dev
```

## Inspect The Bun HTTP Example

List everything available for the Bun HTTP target:

```bash
bun packages/cli/dist/bin.js list --registry fixtures/registries/ucr-official/registry.json --target examples/bun-service
```

Inspect a shared preset:

```bash
bun packages/cli/dist/bin.js show service-preset --registry fixtures/registries/ucr-official/registry.json --target examples/bun-service
```

Inspect a block with typed inputs:

```bash
bun packages/cli/dist/bin.js show entity-contract --registry fixtures/registries/ucr-official/registry.json --target examples/bun-service
```

Review one installed shared item against the current upstream render:

```bash
bun packages/cli/dist/bin.js diff service-preset --registry fixtures/registries/ucr-official/registry.json --target examples/bun-service
```

Run the checked-in example service:

```bash
cd examples/bun-service
bun run start
```

This example demonstrates:

- shared runtime and shared utilities under `ucr/runtime` and `ucr/utilities`
- shared presets under `ucr/presets`
- entity-specific domain code under `ucr/posts/...`
- Bun HTTP route files under `server/routes/...`
- a Bun entrypoint under `server/index.ts`

## Inspect The Next App Router Example

List everything available for the Next target:

```bash
bun packages/cli/dist/bin.js list --registry fixtures/registries/ucr-official/registry.json --target examples/next-app
```

Inspect the page-level block:

```bash
bun packages/cli/dist/bin.js show admin-page --registry fixtures/registries/ucr-official/registry.json --target examples/next-app
```

Review one installed block against upstream:

```bash
bun packages/cli/dist/bin.js diff admin-page --registry fixtures/registries/ucr-official/registry.json --target examples/next-app --instance posts
```

Build the example app:

```bash
cd examples/next-app
bun run build
```

This example demonstrates:

- shared code under `src/ucr/...`
- API routes under `src/app/api/...`
- page and component outputs under `src/app/...`
- Next-only utilities and presets for UI-oriented items

## Standard Flow On Your Own Project

For a new Bun-managed target, the normal flow is:

```bash
bun packages/cli/dist/bin.js init --registry /absolute/path/to/registry.json --target /absolute/path/to/project
```

```bash
bun packages/cli/dist/bin.js list --target /absolute/path/to/project
```

```bash
bun packages/cli/dist/bin.js add entity-contract --target /absolute/path/to/project --instance posts --input entity=Post --input plural=posts
```

```bash
bun packages/cli/dist/bin.js add service-layer --target /absolute/path/to/project --instance posts --input entity=Post --input plural=posts
```

After installing items, use:

- `diff` to see whether local files are current, behind, modified, missing, untracked, or in conflict
- `upgrade` to apply safe upstream changes

## What To Read Next

- [Concepts](/guide/concepts) for instance ids, capabilities, and state files
- [Commands](/guide/commands) for all flags and examples
- [Examples](/guide/examples) for the full checked-in compositions
