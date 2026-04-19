export interface RuntimeEnv {
  nodeEnv: string;
  port: number;
}

function readPort(): number {
  const rawPort = process.env.PORT ?? Bun.env.PORT ?? "3000";
  const parsed = Number(rawPort);

  return Number.isFinite(parsed) ? parsed : 3000;
}

export function readRuntimeEnv(): RuntimeEnv {
  return {
    nodeEnv: process.env.NODE_ENV ?? Bun.env.NODE_ENV ?? "development",
    port: readPort(),
  };
}

export const runtimeEnv = readRuntimeEnv();
