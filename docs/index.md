---
layout: home

hero:
  name: "UCR"
  text: "Source-owned building blocks for Bun projects"
  tagline: "Universal Code Registry installs audited source templates, maps them into deterministic adapter paths, and tracks upgrades after local edits exist."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/quickstart
    - theme: alt
      text: Command Reference
      link: /guide/commands
    - theme: alt
      text: Registry Spec
      link: /reference/registry-spec

features:
  - title: "Source over packages"
    details: "UCR installs source files from registry-owned templates instead of publishing generated code as external packages."
  - title: "Deterministic paths"
    details: "The same logical outputs always land in the same adapter-specific roots for Bun HTTP and Next App Router targets."
  - title: "Tracked upgrades"
    details: "UCR stores install metadata and per-file upstream snapshots so diff and upgrade can reason about local edits."
  - title: "Typed registry contracts"
    details: "Registry items declare targets, inputs, compose dependencies, outputs, and capabilities in a small declarative document."
---

> The root `README.md` is the short repository entry point. This site is the detailed guide and reference for using and extending UCR.

## What UCR Does

UCR reads one registry document, resolves typed inputs, renders source-owned templates, and writes files into an existing Bun-managed project. It keeps Bun responsible for external dependencies and lockfiles while UCR owns:

- registry templates and item metadata
- adapter-aware path mapping
- install records in `.ucr/lock.json`
- tracked upstream snapshots in `.ucr/state.json`
- detected project profile data in `.ucr/config.json`

## Mental Model

The normal workflow is:

1. `init` inspects a Bun project and writes `.ucr/config.json`.
2. `list` shows which registry items are available for the target adapter.
3. `show` prints one item's inputs, outputs, capabilities, and compatibility.
4. `add` renders source files and records the install.
5. `diff` compares the local install with a fresh upstream render.
6. `upgrade` applies safe upstream changes and leaves overlapping edits for manual review.

Utilities and presets default their instance id to the item name. Blocks require an explicit `--instance`.

## Adapters At A Glance

UCR currently targets two project shapes:

- `bun-http`: source roots under `ucr/`, routes under `server/routes`, entrypoints under `server`
- `next-app-router`: shared code under `src/ucr` or `ucr`, API routes under `app/api` or `src/app/api`, UI outputs under `app` or `src/app`

See [Adapters](/reference/adapters) for the full mapping rules.

## Read Next

- [Quickstart](/guide/quickstart) for the shortest path through the checked-in examples
- [Concepts](/guide/concepts) for the item model, inputs, capabilities, and state files
- [Commands](/guide/commands) for the CLI surface
- [Examples](/guide/examples) for the checked-in Bun and Next targets
- [Architecture](/internals/architecture) for the contributor-facing package layout
