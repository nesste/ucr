import { {{entityCamel}}CollectionRoute } from "./routes/{{pluralKebab}}/index";
import { {{entityCamel}}ItemRoute } from "./routes/{{pluralKebab}}/[id]";
import { createServer, type IncomingMessage } from "node:http";

type RouteMethod = "GET" | "POST" | "PUT" | "DELETE";
type RouteHandler = (
  request: Request,
  params: Record<string, string>,
) => Promise<Response> | Response;

interface RouteModule {
  pattern: string;
  methods: Partial<Record<RouteMethod, RouteHandler>>;
}

const routes: RouteModule[] = [
  {{entityCamel}}CollectionRoute,
  {{entityCamel}}ItemRoute,
];

function normalizePathname(pathname: string): string[] {
  return pathname.split("/").filter((segment) => segment.length > 0);
}

function matchRoute(
  pattern: string,
  pathname: string,
): Record<string, string> | null {
  const patternSegments = normalizePathname(pattern);
  const pathSegments = normalizePathname(pathname);

  if (patternSegments.length !== pathSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index]!;
    const pathSegment = pathSegments[index]!;

    if (
      patternSegment.startsWith("[") &&
      patternSegment.endsWith("]")
    ) {
      params[patternSegment.slice(1, -1)] = pathSegment;
      continue;
    }

    if (patternSegment !== pathSegment) {
      return null;
    }
  }

  return params;
}

async function readRequestBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(
      typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk),
    );
  }

  return Buffer.concat(chunks);
}

function toHeaders(request: IncomingMessage): Headers {
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        headers.append(name, entry);
      }
      continue;
    }

    if (typeof value === "string") {
      headers.append(name, value);
    }
  }

  return headers;
}

async function toWebRequest(request: IncomingMessage): Promise<Request> {
  const origin = `http://${request.headers.host ?? "127.0.0.1"}`;
  const url = new URL(request.url ?? "/", origin);
  const method = request.method?.toUpperCase() ?? "GET";
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await readRequestBody(request);
  const init: RequestInit = {
    method,
    headers: toHeaders(request),
  };

  if (body && body.length > 0) {
    init.body = new Uint8Array(body);
  }

  return new Request(url, init);
}

async function writeWebResponse(
  webResponse: Response,
  response: import("node:http").ServerResponse<IncomingMessage>,
): Promise<void> {
  response.statusCode = webResponse.status;

  webResponse.headers.forEach((value, name) => {
    response.setHeader(name, value);
  });

  const body = Buffer.from(await webResponse.arrayBuffer());
  response.end(body);
}

const port = Number(process.env.PORT ?? "3000");
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`).pathname;
  const method = (request.method?.toUpperCase() ?? "GET") as RouteMethod;

  for (const route of routes) {
    const params = matchRoute(route.pattern, pathname);
    if (!params) {
      continue;
    }

    const handler = route.methods[method];
    if (!handler) {
      await writeWebResponse(
        new Response("Method not allowed", { status: 405 }),
        response,
      );
      return;
    }

    try {
      const webRequest = await toWebRequest(request);
      const webResponse = await handler(webRequest, params);
      await writeWebResponse(webResponse, response);
      return;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error.";
      await writeWebResponse(
        Response.json({ error: message }, { status: 500 }),
        response,
      );
      return;
    }
  }

  await writeWebResponse(
    Response.json({ error: "Not found." }, { status: 404 }),
    response,
  );
});

server.listen(port, () => {
  console.log(`Listening on http://127.0.0.1:${port}`);
});
