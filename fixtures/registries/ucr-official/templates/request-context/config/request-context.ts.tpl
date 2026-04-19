export interface RequestContext {
  requestId: string;
  startedAt: string;
}

export function createRequestContext(): RequestContext {
  return {
    requestId: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
  };
}
