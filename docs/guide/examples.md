# Examples

The repository contains two checked-in targets that show UCR installs in their fully rendered form. They are the best place to inspect path mapping, composition, and tracked state without setting up a new project first.

## `examples/bun-service`

This target is a Bun-managed HTTP service that demonstrates server-oriented installs.

Key directories:

- `examples/bun-service/ucr/runtime`
- `examples/bun-service/ucr/utilities`
- `examples/bun-service/ucr/presets`
- `examples/bun-service/ucr/posts/...`
- `examples/bun-service/server/routes/...`
- `examples/bun-service/.ucr/*.json`

Checked-in composition:

- runtime: `ts-runtime`
- shared utilities: `result-utility`, `async-utility`, `object-utility`, `collection-utility`, `validation-utility`
- presets: `service-preset`, `endpoint-preset`
- blocks: `entity-contract`, `service-layer`, `memory-repository`, `input-validation`, `health-route`, `json-collection-route`, `json-item-route`, `bun-server`

Cross-reference these installs with [Official Registry](/reference/official-registry) when you want to see the manifest metadata, canonical install recipe, and example-owned file list for each item.

Recommended browsing flow for Bun projects:

- foundations first: `health-route`, `bun-server`, and optional `request-context`
- API flow second: either the `bun-crud-resource` starter or the granular entity and route chain
- UI is not applicable for the Bun adapter

What this example proves:

- shared code lands under `ucr/...`
- transport outputs land under `server/routes/...`
- entrypoint outputs land under `server/...`
- `.ucr/config.json`, `.ucr/lock.json`, and `.ucr/state.json` are enough to support diff and upgrade

Suggested commands:

```bash
bun packages/cli/dist/bin.js list --registry fixtures/registries/ucr-official/registry.json --target examples/bun-service
```

```bash
bun packages/cli/dist/bin.js diff json-collection-route --registry fixtures/registries/ucr-official/registry.json --target examples/bun-service --instance posts
```

```bash
cd examples/bun-service
bun run start
```

## `examples/next-app`

This target is a Bun-managed Next App Router app that demonstrates both API and UI installs.

Key directories:

- `examples/next-app/src/ucr/runtime`
- `examples/next-app/src/ucr/utilities`
- `examples/next-app/src/ucr/presets`
- `examples/next-app/src/ucr/posts/...`
- `examples/next-app/src/app/api/...`
- `examples/next-app/src/app/posts/...`
- `examples/next-app/.ucr/*.json`

Checked-in composition:

- runtime: `ts-runtime`
- shared utilities plus Next-only UI utilities
- presets: `service-preset`, `endpoint-preset`, `form-preset`, `admin-page-preset`
- blocks: `entity-contract`, `service-layer`, `memory-repository`, `input-validation`, `api-client`, `next-collection-route`, `next-item-route`, `data-table`, `entity-form`, `admin-page`, `entity-detail-page`

Cross-reference these installs with [Official Registry](/reference/official-registry) when you want to see the manifest metadata, canonical install recipe, and example-owned file list for each item.

Recommended browsing flow for Next projects:

- foundations first
- API flow second: either `next-crud-resource` or the granular entity and route chain
- admin/detail UI last: `admin-page`, `entity-detail-page`, or the lower-level table and form blocks

What this example proves:

- shared code still lands in deterministic `src/ucr/...` roots
- transport outputs land under `src/app/api/...`
- UI outputs land under `src/app/...`
- Next-only utilities and presets are gated by adapter compatibility

Suggested commands:

```bash
bun packages/cli/dist/bin.js show admin-page-preset --registry fixtures/registries/ucr-official/registry.json --target examples/next-app
```

```bash
bun packages/cli/dist/bin.js diff admin-page --registry fixtures/registries/ucr-official/registry.json --target examples/next-app --instance posts
```

```bash
cd examples/next-app
bun run build
```

## Why These Examples Matter

The example targets are more than demos:

- they are the canonical command targets used in the docs
- they provide stable fixtures for understanding adapter path mapping
- they keep real `.ucr` state checked in, which makes `diff` and `upgrade` behavior inspectable
- they act as regression coverage during build, typecheck, and test runs
