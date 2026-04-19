const DEFAULT_OFFICIAL_REGISTRY_URL =
  "https://ucr.network/registry/ucr-official/latest/registry.json";

export const OFFICIAL_REGISTRY_URL =
  process.env.UCR_OFFICIAL_REGISTRY_URL?.trim() || DEFAULT_OFFICIAL_REGISTRY_URL;
