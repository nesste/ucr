{{#each routeModules}}import { {{importName}} } from "{{importPath}}";
{{/each}}

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
{{#each routeModules}}  {{importName}},
{{/each}}];

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

const server = Bun.serve({
  port: Number(Bun.env.PORT ?? "3000"),
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase() as RouteMethod;

    for (const route of routes) {
      const params = matchRoute(route.pattern, url.pathname);
      if (!params) {
        continue;
      }

      const handler = route.methods[method];
      if (!handler) {
        return new Response("Method not allowed", {
          status: 405,
        });
      }

      return handler(request, params);
    }

    return Response.json({ error: "Not found." }, { status: 404 });
  },
});

console.log(`Listening on ${server.url}`);
