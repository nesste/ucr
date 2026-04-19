---
layout: home

hero:
  name: "UCR"
  text: "Apache-2.0 CLI + Source-Owned Registry"
  tagline: "Install a binary, point it at a remote or local registry, and pull audited source templates into Bun-managed projects with tracked diff and upgrade behavior."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/quickstart
    - theme: alt
      text: Private Registries
      link: /guide/private-registries
    - theme: alt
      text: Trust And Scope
      link: /reference/trust

features:
  - title: "Remote registry by default"
    details: "Normal usage points at the published HTTPS registry. UCR fetches the manifest, verifies the bundle checksum, and hydrates a local cache automatically."
  - title: "Private registry support"
    details: "UCR supports local private manifests and authenticated remote registries through one environment-provided auth header."
  - title: "Source over packages"
    details: "Registry bundles contain templates, not generated package artifacts. The installed result stays in your repository as normal source files."
  - title: "Apache-2.0, no telemetry"
    details: "The codebase is Apache-2.0 licensed, and the CLI does not emit product telemetry or analytics."
  - title: "Deterministic paths"
    details: "The same logical outputs always land in the same adapter-specific roots for Bun HTTP and Next App Router targets."
  - title: "Tracked upgrades"
    details: "UCR keeps install metadata and upstream snapshots in `.ucr/` so diff and upgrade can explain what changed."
---

## What UCR Does

UCR reads one registry manifest, resolves typed inputs, renders source-owned templates, and writes files into an existing Bun-managed project. It keeps Bun responsible for external dependencies and lockfiles while UCR owns:

- registry manifests, bundles, and item metadata
- adapter-aware path mapping
- install records in `.ucr/lock.json`
- tracked upstream snapshots in `.ucr/state.json`
- detected project profile data in `.ucr/config.json`

## Trust Snapshot

- License: Apache-2.0
- Telemetry: none beyond explicit user-invoked registry and release download requests
- Pricing: the OSS tooling is usable without a paid plan; no hosted or commercial pricing is published today
- Benchmarks: no public benchmarks are published yet
- Production case studies: no public production case studies are published yet
- Compatibility today: Bun-managed projects with `bun-http` and `next-app-router`
- Private registries: local manifests or authenticated remote registries with `UCR_REGISTRY_AUTH_HEADER`

## Install Model

The intended user flow is:

1. install the standalone `ucr` binary from GitHub Releases
2. run `ucr init` with the built-in official registry URL or an explicit `--registry`
3. use `list`, `show`, `add`, `diff`, and `upgrade` against the published registry

The built-in official registry URL is:

```text
https://ucr.network/registry/ucr-official/latest/registry.json
```

Local path registries still exist for contributors, tests, and custom/private usage. Remote private registries can authenticate with `UCR_REGISTRY_AUTH_HEADER`.

## Mental Model

The normal workflow is:

1. `init` inspects a Bun project and writes `.ucr/config.json`.
2. `list` shows which registry items are available for the target adapter.
3. `show` prints one item's inputs, outputs, capabilities, and compatibility.
4. `add` fetches or reuses the registry bundle, renders source files, and records the install.
5. `diff` compares the local install with a fresh upstream render from the current registry snapshot.
6. `upgrade` applies safe upstream changes and leaves overlapping edits for manual review.

Utilities and presets default their instance id to the item name. Blocks require an explicit `--instance`.

See [Official Registry](/reference/official-registry) for the shipped catalog of utilities, presets, and blocks, including what each one provides and the canonical install recipe.

## Registry Sources

UCR resolves the registry reference in this order:

1. `--registry <url-or-path>`
2. `registry` in `.ucr/config.json`
3. `UCR_REGISTRY`
4. the built-in official registry URL

When the resolved reference is remote, UCR validates the manifest, downloads the declared bundle, verifies the SHA-256 checksum, and extracts it into a local OS cache before rendering any files.

If `UCR_REGISTRY_AUTH_HEADER` is set, UCR sends that header to the remote manifest request and forwards it to bundle downloads only when the bundle URL is the same origin as the manifest URL.

## Adapters At A Glance

UCR currently targets two project shapes:

- `bun-http`: source roots under `ucr/`, routes under `server/routes`, entrypoints under `server`
- `next-app-router`: shared code under `src/ucr` or `ucr`, API routes under `app/api` or `src/app/api`, UI outputs under `app` or `src/app`

Broader project compatibility and additional adapters are not implemented yet.

See [Adapters](/reference/adapters) for the full mapping rules.

## Read Next

- [Quickstart](/guide/quickstart) for standalone install, official registry usage, and contributor local-path usage
- [Private Registries](/guide/private-registries) for local and authenticated remote registry setup
- [Concepts](/guide/concepts) for the item model, registry cache, inputs, capabilities, and state files
- [Commands](/guide/commands) for the CLI surface
- [Trust And Scope](/reference/trust) for licensing, privacy, pricing, and compatibility statements
- [Official Registry](/reference/official-registry) for the concrete `ucr-official` catalog and usage recipes
- [Examples](/guide/examples) for the checked-in Bun and Next targets
- [Architecture](/internals/architecture) for the contributor-facing package layout
