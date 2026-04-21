---
layout: home

hero:
  name: "UCR"
  text: "Install like a package. Keep the source."
  tagline: "UCR pulls audited source templates into Bun and Next projects, keeps them in your repo, and makes upgrades diffable."
  actions:
    - theme: brand
      text: Run the 2-minute quickstart
      link: /guide/quickstart
    - theme: alt
      text: Browse the official registry
      link: /reference/official-registry
    - theme: alt
      text: See how UCR works
      link: /#show-me

features:
  - title: "Package dependency"
    details: "Fast to install, but the code you rely on lives outside your repo and upgrades are someone else's release cycle."
  - title: "Copied code"
    details: "You own the files, but future changes turn into manual diffing and one-off cleanup."
  - title: "UCR's third option"
    details: "Installable source that lands in your repo, stays readable, and keeps enough upstream state for diff and upgrade later."
---

## A More Honest Install Model

Today, UCR supports Bun-managed projects for `bun-http` and `next-app-router`.

You usually have to choose between:

- package dependency you do not fully control
- copied code you cannot upgrade cleanly

UCR gives you a third option:

- installable source
- owned in your repo
- tracked for diff and upgrade

## What You Get

- source-owned installs, not opaque package internals
- real files in deterministic app paths
- tracked upstream snapshots for `diff` and `upgrade`
- a shipped official registry plus checked-in example projects you can inspect

## Show Me {#show-me}

The checked `examples/next-app` app includes a real `posts` resource installed with granular UCR blocks.

Representative install commands from that flow:

```bash
ucr add entity-contract --target . --instance posts --input entity=Post --input plural=posts --input-file fields=./post.fields.json
ucr add next-collection-route --target . --instance posts --input entity=Post --input plural=posts
ucr add admin-page --target . --instance posts --input entity=Post --input plural=posts
```

Those installs land as normal source files inside the app:

```text
src/ucr/posts/contract/model.ts
src/app/api/posts/route.ts
src/app/posts/page.tsx
```

UCR also keeps the install tracked inside the project:

```text
.ucr/lock.json   # installed items, inputs, and owned files
.ucr/state.json  # upstream snapshots used for diff and upgrade
```

In the checked example, `.ucr/lock.json` records the exact files owned by the `posts` installs, including:

```json
{
  "entity-contract:posts": {
    "files": ["src/ucr/posts/contract/model.ts"]
  },
  "next-collection-route:posts": {
    "files": ["src/app/api/posts/route.ts"]
  },
  "admin-page:posts": {
    "files": ["src/app/posts/page.tsx"]
  }
}
```

That is the point of UCR: the code is yours now, and later you can still ask what changed upstream.

```bash
ucr diff entity-contract --instance posts
ucr upgrade entity-contract --instance posts
```

## Proof You Can Inspect

- [`examples/next-app`](/guide/examples) shows source installs under `src/ucr/...`, API routes under `src/app/api/...`, UI outputs under `src/app/...`, and real `.ucr` tracking files.
- [`examples/bun-service`](/guide/examples) shows the same model for `bun-http`, with source under `ucr/...` and routes under `server/routes/...`.
- The official registry and the checked examples describe the same install paths, so the flow is public and inspectable instead of implied.

## Who This Is For

UCR is for you if:

- you want source ownership after install
- you build reusable app blocks, routes, or UI slices
- you want safer upgrades for installed code
- you use Bun with `bun-http` or `next-app-router`

UCR is not for you if:

- you want broad framework support today
- you prefer package-only distribution
- you do not want generated or source-installed code checked into your repo

## How It Works

1. Install the standalone CLI and run `ucr init` in a Bun-managed project.
2. Browse the registry, pick a block, and install it into the adapter-specific app paths UCR detects.
3. Commit the resulting source like any other application code.
4. Run `diff` or `upgrade` later when the upstream template changes.

The system details still matter, but they are lower on the stack:

- registry manifests and bundles determine what can be installed
- adapter-aware path mapping decides where files land
- `.ucr/config.json`, `.ucr/lock.json`, and `.ucr/state.json` explain how the install is tracked
- authenticated private registries work through `UCR_REGISTRY_AUTH_HEADER`

## Read Next

- [Quickstart](/guide/quickstart) to install the CLI and run the first flow
- [Official Registry](/reference/official-registry) to browse the shipped blocks, presets, and utilities
- [Examples](/guide/examples) to inspect the checked-in Bun and Next targets
- [Upgrades](/guide/upgrades) to see how `diff` and `upgrade` work after local edits
- [Trust And Scope](/reference/trust) for license, telemetry, pricing, and compatibility statements
