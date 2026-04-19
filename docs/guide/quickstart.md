# Quickstart

This page covers both normal end-user usage and the contributor-only local fixture flow used inside this repository.

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

Inspect one item:

```bash
ucr show entity-contract
```

Install a block with typed inputs:

```bash
ucr add entity-contract --instance posts --input entity=Post --input plural=posts --input-file fields=./post.fields.json
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

- [Concepts](/guide/concepts) for instance ids, capabilities, cache behavior, and state files
- [Commands](/guide/commands) for all flags and examples
- [Examples](/guide/examples) for the checked-in Bun and Next compositions
