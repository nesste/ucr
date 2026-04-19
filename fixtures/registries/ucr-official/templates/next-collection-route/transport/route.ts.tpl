import { {{entityCamel}}Service } from "{{domainDirImport}}/runtime";
import { validateCreate{{entityPascal}}Input } from "{{contractDirImport}}/validation";

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET(): Promise<Response> {
  const items = await {{entityCamel}}Service.list{{pluralPascal}}();
  return Response.json({ items });
}

export async function POST(request: Request): Promise<Response> {
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
}
