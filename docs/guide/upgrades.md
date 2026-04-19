# Upgrades

The main reason UCR tracks state is to make upgrades explicit after local edits exist. The upgrade model is built on a three-way comparison between the tracked upstream snapshot, the current local file, and a fresh upstream render.

## What UCR Stores

`init` writes `.ucr/config.json` with the detected project profile:

- config version `4`
- registry reference when one is configured
- adapter id
- Bun package manager and test runner markers
- shared roots such as `runtimeRoot`, `utilityRoot`, and `presetRoot`
- detected project capabilities

`add` writes `.ucr/lock.json` with the install record:

- lock version `2`
- registry identity and source path
- one record per `itemName:instanceId`
- item kind and item version
- resolved install inputs
- resolved `compose`, `requires`, and `provides`
- owned file list

`add` also writes `.ucr/state.json` with the tracked snapshot:

- state version `4`
- one record per `itemName:instanceId`
- per-file template path, surface, upstream hash, and upstream snapshot text

That snapshot text is the merge base for later upgrades.

## `diff` Statuses

`diff` is read-only. It classifies each tracked output before you write anything:

| Status | Meaning |
| --- | --- |
| `identical` | Local file matches the current upstream render. |
| `behind` | Local file still matches the tracked snapshot, but upstream changed. |
| `modified` | Only local changes were detected. |
| `missing` | Expected file is gone locally. |
| `conflict` | Local and upstream changed since the tracked snapshot. |
| `untracked` | File differs from upstream and is not tracked for that install instance. |

Use `diff` when you want to understand the current state of an install before applying changes.

## `upgrade` Actions

`upgrade` re-renders the item from the locked inputs and turns each file into one of five actions:

| Action | Meaning |
| --- | --- |
| `create` | The file is missing locally and will be recreated. |
| `replace` | Local file still matches the tracked snapshot, so it is safe to replace with upstream. |
| `merge` | Local and upstream changed in different ranges, so UCR can write a merged result. |
| `skip` | File is already current or only local changes exist. |
| `conflict` | Local and upstream changed in overlapping ranges and require manual review. |

## Smart Merge

UCR's merge path is deterministic:

1. base: the tracked upstream snapshot from `.ucr/state.json`
2. local: the current file on disk
3. upstream: the newly rendered template output

If local and upstream edits are non-overlapping, the merged result is written and the tracked snapshot is refreshed to the new upstream content. If they overlap, UCR leaves the file alone and reports a conflict.

## `--force`

`--force` changes how write operations behave:

- on `add`, conflict files are overwritten with the freshly rendered upstream source
- on `upgrade`, conflict files are also overwritten with upstream after the plan prints

That makes `--force` useful for deliberate resets, but it also means manual local edits can be discarded. Use it only when you understand the current diff state.

## Recommended Upgrade Workflow

```bash
bun packages/cli/dist/bin.js diff service-layer --target /absolute/path/to/project --instance posts
```

```bash
bun packages/cli/dist/bin.js upgrade service-layer --target /absolute/path/to/project --instance posts
```

If conflicts appear:

1. inspect the affected files
2. decide whether the local edits or the upstream render should win
3. rerun with `--force` only if replacing the local file is intentional

## Constraints

Upgrade behavior depends on the tracked state being intact. If `.ucr/state.json` is missing or incompatible for an installed instance, UCR cannot perform the smart merge path and will surface conflicts instead.
