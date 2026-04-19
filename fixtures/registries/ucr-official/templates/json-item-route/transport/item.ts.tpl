import { {{entityCamel}}Service } from "{{domainDirImport}}/runtime";
import { validateUpdate{{entityPascal}}Input } from "{{contractDirImport}}/validation";

type RouteMethod = "GET" | "POST" | "PUT" | "DELETE";
type RouteHandler = (
  request: Request,
  params: Record<string, string>,
) => Promise<Response> | Response;

interface RouteModule {
  pattern: string;
  methods: Partial<Record<RouteMethod, RouteHandler>>;
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export const {{entityCamel}}ItemRoute = {
  pattern: "/{{pluralKebab}}/[id]",
  methods: {
    async GET(_request, params) {
      const item = await {{entityCamel}}Service.get{{entityPascal}}(params.id);

      return item
        ? Response.json({ item })
        : Response.json({ error: "Not found." }, { status: 404 });
    },
    async PUT(request, params) {
      const body = await readJsonBody(request);
      const validation = validateUpdate{{entityPascal}}Input(body);

      if (!validation.ok) {
        return Response.json(
          { errors: validation.errors },
          { status: 400 },
        );
      }

      const item = await {{entityCamel}}Service.update{{entityPascal}}(
        params.id,
        validation.data,
      );

      return item
        ? Response.json({ item })
        : Response.json({ error: "Not found." }, { status: 404 });
    },
    async DELETE(_request, params) {
      const removed = await {{entityCamel}}Service.remove{{entityPascal}}(params.id);

      return removed
        ? Response.json({ ok: true })
        : Response.json({ error: "Not found." }, { status: 404 });
    },
  },
} satisfies RouteModule;
