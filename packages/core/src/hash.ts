import { createHash } from "node:crypto";

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function hashBytes(bytes: ArrayBuffer | Uint8Array): string {
  const buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return createHash("sha256").update(buffer).digest("hex");
}
