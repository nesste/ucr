# Trust And Scope

This page states the current verifiable product facts for UCR.

## License

UCR is licensed under Apache License 2.0.

## Privacy And Telemetry

UCR does not collect product telemetry or analytics events.

The CLI does make explicit user-invoked network requests when you ask it to:

- fetch a remote registry manifest
- download a registry bundle declared by that manifest
- download standalone release assets during `ucr self-update`

Outside those direct command flows, UCR does not send usage analytics or background telemetry.

## Pricing

The OSS tooling in this repository can be used without a paid plan.

No hosted product pricing or commercial support pricing is published today.

## Public Adoption Evidence

UCR does not publish public benchmark results today.

UCR does not publish public production case studies today.

## Compatibility Today

Current product scope is:

- Bun-managed non-Next projects with `bun-http`
- npm- and pnpm-managed non-Next projects with `node-http`
- Bun-, npm-, and pnpm-managed Next projects with `next-app-router`
- registry usage through remote HTTPS manifests or local `registry.json` paths

Yarn support and additional adapters are not implemented yet.

## Private Registries

Private registries are supported today in two forms:

- local registry manifests on disk
- authenticated remote manifests with `UCR_REGISTRY_AUTH_HEADER`

See [Private Registries](/guide/private-registries) for the exact auth format, examples, and same-origin bundle rule.
