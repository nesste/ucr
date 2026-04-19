# Quickstart

This page covers both normal end-user usage and the contributor-only local fixture flow used inside this repository.

## Current Scope

UCR currently supports:

- Bun-managed target projects
- `bun-http` and `next-app-router`
- local registries and remote HTTPS registries

Broader package manager support and additional adapters are not implemented yet.

## Prerequisites

- a Bun-managed target project
- the `ucr` standalone binary on your `PATH`

Install the binary from GitHub Releases:

```bash
curl -fsSL https://ucr.network/install.sh | sh
```

The Unix installer writes PATH configuration for future shells automatically.
Because `curl | sh` runs in a child shell, open a new terminal before invoking
`ucr` in that flow.

On Windows PowerShell:

```powershell
irm https://ucr.network/install.ps1 | iex
```

To update an existing standalone installation later:

```bash
ucr self-update
```

## Standard End-User Flow

Initialize the current Bun project against the built-in official registry:

```bash
ucr init --target .
```

List the remote catalog:

```bash
ucr list
```

The official catalog is grouped for day-to-day usage:

- start with `Project Foundations`
- add either a starter CRUD block or the granular `Entity/API Flows`
- add `Admin UI` blocks last for `next-app-router` projects

Inspect one item:

```bash
ucr show entity-contract
```

For the complete shipped catalog, see [Official Registry](/reference/official-registry). It expands the high-level CLI output with per-item purpose, requirements, outputs, and usage recipes.

Fastest starter path for a Next resource:

```bash
ucr add next-crud-resource --instance posts --input entity=Post --input plural=posts --input-file fields=./post.fields.json
```

Granular path for the same resource:

```bash
ucr add entity-contract --instance posts --input entity=Post --input plural=posts --input-file fields=./post.fields.json
```

On Next projects, add admin/detail UI after the API flow is in place:

```bash
ucr add admin-page --instance posts --input entity=Post --input plural=posts
ucr add entity-detail-page --instance posts --input entity=Post --input plural=posts
```

Compare local state with upstream:

```bash
ucr diff entity-contract --instance posts
```

Apply safe upstream changes later:

```bash
ucr upgrade entity-contract --instance posts
```

To pin a project to a versioned remote registry manifest instead of `latest`:

```bash
ucr init --registry https://ucr.network/registry/ucr-official/v3.0.0/registry.json --target .
```

## Registry Override Modes

All commands accept an explicit registry reference:

```bash
ucr list --registry https://ucr.network/registry/ucr-official/latest/registry.json
```

That same flag also accepts a local registry file:

```bash
ucr list --registry /absolute/path/to/registry.json
```

You can also persist the registry reference in `.ucr/config.json` via `init`, or override it per-shell with `UCR_REGISTRY`.

For authenticated remote private registries, set `UCR_REGISTRY_AUTH_HEADER` first:

```bash
export UCR_REGISTRY_AUTH_HEADER="Authorization: Bearer $UCR_TOKEN"
ucr list --registry https://registry.example.com/ucr/registry.json
```

```powershell
$env:UCR_REGISTRY_AUTH_HEADER = "Authorization: Bearer $env:UCR_TOKEN"
ucr list --registry https://registry.example.com/ucr/registry.json
```

See [Private Registries](/guide/private-registries) for the exact auth format, same-origin bundle behavior, and what UCR does not persist.

## Contributor Flow In This Repository

Contributors still work from the source registry and examples checked into this repo.

Prepare the workspace:

```bash
bun install
bun run build
```

Build the published registry assets locally:

```bash
bun run registry:build
```

Inspect the Bun HTTP example against the local fixture:

```bash
bun packages/cli/dist/bin.js list --registry fixtures/registries/ucr-official/registry.json --target examples/bun-service
```

Inspect the Next example:

```bash
bun packages/cli/dist/bin.js show admin-page --registry fixtures/registries/ucr-official/registry.json --target examples/next-app
```

This repository keeps the examples because they demonstrate:

- `bun-http` outputs under `ucr/...`, `server/routes/...`, and `server/...`
- `next-app-router` outputs under `src/ucr/...`, `src/app/api/...`, and `src/app/...`
- the exact item catalog that becomes the official published registry

## What To Read Next

- [Private Registries](/guide/private-registries) for local and authenticated remote registry setup
- [Concepts](/guide/concepts) for instance ids, capabilities, cache behavior, and state files
- [Commands](/guide/commands) for all flags and examples
- [Trust And Scope](/reference/trust) for license, privacy, pricing, and compatibility facts
- [Official Registry](/reference/official-registry) for the concrete `ucr-official` item catalog
- [Examples](/guide/examples) for the checked-in Bun and Next compositions
