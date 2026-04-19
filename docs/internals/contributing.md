# Contributing

This repository is a Bun workspace. The contributor loop is centered on building the packages, validating the examples, and keeping the docs aligned with the actual CLI behavior.

## Setup

From the repo root:

```bash
bun install
```

## Core Commands

Use these commands as the default contributor validation loop:

```bash
bun run build
```

```bash
bun run docs:build
```

```bash
bun run typecheck
```

```bash
bun test
```

For local docs development:

```bash
bun run docs:dev
```

## Working On CLI Or Core Behavior

If you change command behavior:

- update `packages/cli/src/bin.ts` help text when the CLI surface changes
- update [Commands](/guide/commands) if flags or output semantics change
- update the README if the top-level positioning or quickstart changes

Useful repo-local inspection commands:

```bash
bun run cli:list:bun-service
```

```bash
bun packages/cli/dist/bin.js show service-preset --registry fixtures/registries/ucr-official/registry.json --target examples/bun-service
```

```bash
bun packages/cli/dist/bin.js diff admin-page --registry fixtures/registries/ucr-official/registry.json --target examples/next-app --instance posts
```

## Working On The Registry Fixture

The official fixture registry and templates live under `fixtures/registries/ucr-official`.

When you change the fixture:

- keep `registry.json` and the template tree in sync
- make sure new items obey the validation rules in `packages/schema`
- verify both example targets still build when the change is intended to affect them
- update docs pages that describe item kinds, adapter compatibility, or example compositions

## Working On Examples

The checked-in examples are the canonical documentation targets. Changes there should preserve their role as stable references.

Validate at least:

- `examples/bun-service` still starts or builds as expected
- `examples/next-app` still builds
- any docs command examples that reference those targets still work

## Working On Docs

The docs site source is the `docs/` directory, built with VitePress.

When you update docs:

- prefer examples grounded in `fixtures/registries/ucr-official` and `examples/*`
- keep the README shorter than the site
- use the docs site for detail and the README for orientation
- run `bun run docs:build` before finishing

## What Not To Add By Default

This repo does not currently include:

- docs hosting or deployment workflows
- docs versioning
- registry-side executable generators or hooks

Keep documentation and contributor guidance aligned with what the repo actually implements today.
