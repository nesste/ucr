# Private Registries

UCR supports private registries in two ways today:

- local `registry.json` paths for contributor workflows, mirrors, and file-based private registries
- authenticated remote HTTPS registries with one environment-provided request header

## Scope

Current private registry behavior is intentionally narrow:

- target projects still must be Bun-managed
- adapter support is still limited to `bun-http` and `next-app-router`
- UCR accepts one auth header through `UCR_REGISTRY_AUTH_HEADER`
- UCR does not persist credentials into `.ucr/config.json`, `.ucr/lock.json`, `.ucr/state.json`, or cache metadata

## Local Registry Paths

Point any command at a local manifest directly:

```bash
ucr list --registry /absolute/path/to/registry.json
```

You can also persist that path into `.ucr/config.json` through `init`:

```bash
ucr init --registry /absolute/path/to/registry.json --target .
```

This is the simplest option when you control the filesystem path already, or when a private mirror is mounted locally in CI or developer environments.

## Authenticated Remote Registries

For remote private registries, set `UCR_REGISTRY_AUTH_HEADER` to one header in `Header-Name: value` format before running UCR commands.

Example with an authorization header in Bash:

```bash
export UCR_REGISTRY_AUTH_HEADER="Authorization: Bearer $UCR_TOKEN"
ucr list --registry https://registry.example.com/ucr/registry.json
```

Example in PowerShell:

```powershell
$env:UCR_REGISTRY_AUTH_HEADER = "Authorization: Bearer $env:UCR_TOKEN"
ucr list --registry https://registry.example.com/ucr/registry.json
```

You can use a non-authorization header as long as it still fits the same `Header-Name: value` format:

```bash
export UCR_REGISTRY_AUTH_HEADER="X-Registry-Key: $UCR_REGISTRY_KEY"
```

## Bundle Download Rules

When a remote manifest declares a bundle:

- UCR sends `UCR_REGISTRY_AUTH_HEADER` to the manifest request
- UCR forwards the same header to the bundle download only when the bundle URL is the same origin as the manifest URL
- UCR does not forward the header to cross-origin bundle URLs

If your private manifest points to a cross-origin bundle, that bundle URL must already be presigned or otherwise reachable without forwarding the private header.

## What UCR Does Not Do

UCR does not currently support:

- multiple registry auth headers
- persistent credential storage in project config
- non-Bun-managed target projects
- adapters beyond `bun-http` and `next-app-router`

For command syntax details, see [Commands](/guide/commands). For current product scope and trust statements, see [Trust And Scope](/reference/trust).
