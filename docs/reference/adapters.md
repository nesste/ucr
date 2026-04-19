# Adapters

UCR maps logical registry outputs into adapter-specific paths. The current implementation supports two adapters: `bun-http` and `next-app-router`.

## Detection

Adapter detection happens during project inspection:

- the project must be Bun-managed, meaning `packageManager` starts with `bun@` or a Bun lockfile exists
- if the project depends on `next`, UCR defaults to `next-app-router`
- otherwise UCR defaults to `bun-http`

`init` can override detection with `--adapter`, but incompatible combinations are rejected.

## Shared Root Detection

UCR first detects `sourceRoot`:

- `src` if a `src/` directory exists
- `.`, otherwise

From there it derives:

- shared root: `ucr` or `src/ucr`
- runtime root: `<shared root>/runtime`
- utility root: `<shared root>/utilities`
- preset root: `<shared root>/presets`

## `bun-http`

Behavior:

- supports every surface except `ui`
- routes map into `server/routes` when `sourceRoot` is `.`
- routes map into `<sourceRoot>/server/routes` when `sourceRoot` is not `.`
- entrypoints map into `server` or `<sourceRoot>/server`
- feature code maps into `<shared root>/<instance>/<surface>/...`

Summary:

| Surface | Destination |
| --- | --- |
| `utility` | runtime root for `ts-runtime`, otherwise utility root |
| `preset` | preset root |
| `transport` | route root |
| `entrypoint` | entrypoint root |
| `contract`, `domain`, `config`, `test` | feature root under `ucr/<instance>/...` or `src/ucr/<instance>/...` |
| `ui` | unsupported |

API base path for rendered templates is `/<resource>`.

## `next-app-router`

Behavior:

- supports every surface except `entrypoint`
- app root resolves to `src/app`, then `app`, then a fallback derived from `sourceRoot`
- transport outputs map into `<app root>/api/...`
- UI outputs map into `<app root>/...`
- feature code maps into `<shared root>/<instance>/<surface>/...`

Summary:

| Surface | Destination |
| --- | --- |
| `utility` | runtime root for `ts-runtime`, otherwise utility root |
| `preset` | preset root |
| `transport` | app route root under `app/api` or `src/app/api` |
| `ui` | app root |
| `contract`, `domain`, `config`, `test` | feature root under `ucr/<instance>/...` or `src/ucr/<instance>/...` |
| `entrypoint` | unsupported |

API base path for rendered templates is `/api/<resource>`.

## Compatibility Checks

Compatibility works in two steps:

1. item target compatibility, based on `shared`, `bun-http`, and `next-app-router`
2. surface compatibility, based on whether the adapter supports each output surface

That is why an item can be target-compatible but still skip specific outputs if the surface is not supported by the resolved adapter.

## Why This Matters

The adapter is what lets one registry document install into two different project shapes while keeping the output rules deterministic. It is also what keeps UI-only items out of Bun HTTP targets and entrypoint-only items out of Next App Router targets.
