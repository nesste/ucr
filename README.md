# Universal Code Registry

Universal Code Registry (UCR) is an Apache-2.0 source-first code registry for Bun-managed projects. Instead of installing generated packages, UCR installs audited source templates into your app, maps them into deterministic adapter-specific roots, and tracks enough upstream state to support `diff` and `upgrade` later.

## Trust Snapshot

- License: Apache-2.0
- Telemetry: none beyond explicit user-invoked registry and release download requests
- Pricing: the OSS tooling is usable without a paid plan; no hosted or commercial pricing is published today
- Benchmarks: no public benchmarks are published yet
- Production case studies: no public production case studies are published yet
- Compatibility today: Bun-managed projects with `bun-http` and `next-app-router`
- Private registries: supported with local `registry.json` paths and authenticated remote registries via `UCR_REGISTRY_AUTH_HEADER`

UCR does not replace Bun. Bun still owns external dependencies and `bun.lock`. UCR owns:

- registry manifests and template bundles
- typed install inputs
- deterministic install roots
- `.ucr/config.json`
- `.ucr/lock.json`
- `.ucr/state.json`

Full documentation lives in the docs site source at [docs/index.md](./docs/index.md).

## Install

Install the standalone binary from GitHub Releases:

```bash
curl -fsSL https://ucr.network/install.sh | sh
```

The Unix installer configures PATH for future shells automatically. If you use
`curl | sh`, open a new shell before running `ucr`.

On Windows PowerShell:

```powershell
irm https://ucr.network/install.ps1 | iex
```

The default official registry is:

```text
https://ucr.network/registry/ucr-official/latest/registry.json
```

Override it with `--registry <url-or-path>` or `UCR_REGISTRY`.

To authenticate a remote private registry, set `UCR_REGISTRY_AUTH_HEADER` to one header in `Header-Name: value` format.

## Quickstart

Initialize a Bun project against the official registry:

```bash
ucr init --target .
ucr list
ucr show entity-contract
ucr add entity-contract --instance posts --input entity=Post --input plural=posts --input-file fields=./post.fields.json
```

From there:

- `ucr diff entity-contract --instance posts`
- `ucr upgrade entity-contract --instance posts`
- `ucr self-update`

To pin a project to a specific published registry version:

```bash
ucr init --registry https://ucr.network/registry/ucr-official/v3.0.0/registry.json --target .
```

## Supported Adapters And Item Kinds

Adapters:

- `bun-http`
- `next-app-router`

Current limitations:

- target projects must be Bun-managed
- adapter support is limited to `bun-http` and `next-app-router`
- broader package manager and adapter support is not implemented yet

Registry item kinds:

- `utility`: reusable shared helpers
- `preset`: reusable compositions of utilities or other presets
- `block`: instance-scoped feature code, routes, UI, config, or entrypoints

## Registry Modes

UCR supports three practical registry flows:

- remote HTTPS manifests for normal end-user usage
- authenticated remote HTTPS manifests for private registries via `UCR_REGISTRY_AUTH_HEADER`
- local `registry.json` paths for contributors, tests, and custom/private registries

Remote registries are fetched on demand, validated, and hydrated into a local cache before install, diff, or upgrade runs. Local registries are read directly from disk.

Remote auth headers are applied to manifest requests and to same-origin bundle downloads. UCR does not persist auth headers into `.ucr/` project files or cache metadata.

## What UCR Tracks

Inside each target project:

- `.ucr/config.json`: adapter, registry reference, and deterministic roots
- `.ucr/lock.json`: installed items, resolved inputs, owned files, and registry metadata
- `.ucr/state.json`: tracked upstream snapshots used by `diff` and `upgrade`

## When To Use UCR

Use UCR when you want:

- source-owned reusable internal code
- adapter-aware scaffolding with predictable paths
- typed install inputs instead of imperative generators
- explainable upgrades after local edits

Do not use UCR when you want:

- third-party dependency management
- package publishing and package resolution
- arbitrary executable generators or hooks
- automatic mutation of unrelated user files

## Contributor Flow

This repository still contains the source registry, examples, docs site, and release scripts used to publish the product.

Useful contributor commands:

```bash
bun install
bun run build
bun run docs:build
bun run registry:build
bun run release:artifacts
bun test
```

## Learn More

The docs site covers:

- binary install and remote registry onboarding
- trust, license, privacy, pricing, and current scope statements
- private registry setup for local and authenticated remote registries
- command reference
- registry format and distribution metadata
- `.ucr` file formats
- adapter path mapping
- contributor release and publishing flow

Start at [docs/index.md](./docs/index.md).
