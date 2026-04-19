import { {{entityCamel}}Service } from "{{domainDirImport}}/runtime";
import { validateUpdate{{entityPascal}}Input } from "{{contractDirImport}}/validation";

type ItemRouteContext = {
  params: Promise<{ id: string }>;
};

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: ItemRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  const item = await {{entityCamel}}Service.get{{entityPascal}}(id);

  return item
    ? Response.json({ item })
    : Response.json({ error: "Not found." }, { status: 404 });
}

export async function PUT(
  request: Request,
  context: ItemRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  const body = await readJsonBody(request);
  const validation = validateUpdate{{entityPascal}}Input(body);

  if (!validation.ok) {
    return Response.json(
      { errors: validation.errors },
      { status: 400 },
    );
  }

  const item = await {{entityCamel}}Service.update{{entityPascal}}(
    id,
    validation.data,
  );

  return item
    ? Response.json({ item })
    : Response.json({ error: "Not found." }, { status: 404 });
}

export async function DELETE(
  _request: Request,
  context: ItemRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  const removed = await {{entityCamel}}Service.remove{{entityPascal}}(id);

  return removed
    ? Response.json({ ok: true })
    : Response.json({ error: "Not found." }, { status: 404 });
}
