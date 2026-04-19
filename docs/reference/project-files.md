# Project Files

UCR keeps its persistent install state in three JSON files under `.ucr/`. Together they describe the project profile, the installed items, and the tracked upstream snapshots needed for diff and upgrade.

## `.ucr/config.json`

Written by `init`.

Purpose:

- record the detected adapter
- store the selected registry reference
- capture the deterministic shared roots for the target project
- record project capabilities discovered during inspection

Current shape in this repo:

| Field | Meaning |
| --- | --- |
| `version` | Config format version, currently `4`. |
| `registry` | Registry manifest URL or local registry path, stored relative to the target root when possible. |
| `adapter` | `bun-http` or `next-app-router`. |
| `packageManager` | Always `bun` in v1. |
| `testRunner` | Always `bun` in v1. |
| `sourceRoot` | `.` or `src` depending on project layout. |
| `appRoot` | App directory for Next targets, otherwise `null`. |
| `runtimeRoot` | Deterministic runtime install root. |
| `utilityRoot` | Deterministic utility install root. |
| `presetRoot` | Deterministic preset install root. |
| `capabilities` | Detected project capabilities such as `bun`, `transport`, `ui`, or `next-app-router`. |

## `.ucr/lock.json`

Written by `add` and refreshed by `upgrade`.

Purpose:

- remember what items are installed
- remember which inputs were used to render them
- record the owned file list for each install
- record provided capabilities for later dependency checks

Top-level shape:

| Field | Meaning |
| --- | --- |
| `version` | Lock format version, currently `3`. |
| `registry` | Registry name, version, transport, configured source, resolved manifest URL, and bundle metadata used for the install. |
| `installs` | Map keyed by `itemName:instanceId`. |

Each install record stores:

- `itemKind`
- `itemName`
- `itemVersion`
- `instanceId`
- `adapter`
- `inputs`
- `compose`
- `requires`
- `provides`
- `files`
- `updatedAt`

## `.ucr/state.json`

Written by `add` and refreshed by `upgrade`.

Purpose:

- store the upstream snapshot text for every tracked file
- store the upstream hash used by `diff`
- give `upgrade` a three-way merge base

Top-level shape:

| Field | Meaning |
| --- | --- |
| `version` | State format version, currently `5`. |
| `registry` | Registry name, version, transport, configured source, resolved manifest URL, and bundle metadata. |
| `installs` | Map keyed by `itemName:instanceId`. |

Each install snapshot stores:

- `itemName`
- `itemVersion`
- `instanceId`
- `adapter`
- `files`
- `updatedAt`

Each tracked file snapshot stores:

- `template`
- `surface`
- `hash`
- `snapshot`
- `itemVersion`
- `updatedAt`

## How The Files Work Together

The lifecycle is:

1. `config.json` describes the target project shape.
2. `lock.json` describes the install intent and owned files.
3. `state.json` stores the upstream snapshot text per file.

When `diff` runs, it compares the current local file hash, the tracked hash from `state.json`, and a new upstream hash from the current render. When `upgrade` runs, it uses the stored `snapshot` text as the merge base.

## Practical Guidance

- keep `.ucr/*.json` checked in for projects that want explainable upgrades
- if older lock/state versions are present, the current UCR reads them and normalizes them on the next write
- do not hand-edit these files unless you are deliberately repairing state and understand the consequences
