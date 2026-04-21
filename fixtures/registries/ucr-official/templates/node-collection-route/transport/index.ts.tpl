import { {{entityCamel}}Service } from "{{domainDirImport}}/runtime";
import { validateCreate{{entityPascal}}Input } from "{{contractDirImport}}/validation";

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

export const {{entityCamel}}CollectionRoute = {
  pattern: "/{{pluralKebab}}",
  methods: {
    async GET() {
      const items = await {{entityCamel}}Service.list{{pluralPascal}}();
      return Response.json({ items });
    },
    async POST(request) {
      const body = await readJsonBody(request);
      const validation = validateCreate{{entityPascal}}Input(body);

      if (!validation.ok) {
        return Response.json(
          { errors: validation.errors },
          { status: 400 },
        );
      }

      const item = await {{entityCamel}}Service.create{{entityPascal}}(
        validation.data,
      );

      return Response.json({ item }, { status: 201 });
    },
  },
} satisfies RouteModule;
