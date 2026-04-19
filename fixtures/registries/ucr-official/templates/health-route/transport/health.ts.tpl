type RouteMethod = "GET" | "POST" | "PUT" | "DELETE";
type RouteHandler = (
  request: Request,
  params: Record<string, string>,
) => Promise<Response> | Response;

interface RouteModule {
  pattern: string;
  methods: Partial<Record<RouteMethod, RouteHandler>>;
}

export const healthRoute = {
  pattern: "/health",
  methods: {
    GET() {
      return Response.json({
        ok: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
      });
    },
  },
} satisfies RouteModule;
