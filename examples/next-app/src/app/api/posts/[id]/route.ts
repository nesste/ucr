import { postService } from "../../../../ucr/posts/domain/runtime";
import { validateUpdatePostInput } from "../../../../ucr/posts/contract/validation";

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
  const item = await postService.getPost(id);

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
  const validation = validateUpdatePostInput(body);

  if (!validation.ok) {
    return Response.json(
      { errors: validation.errors },
      { status: 400 },
    );
  }

  const item = await postService.updatePost(
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
  const removed = await postService.removePost(id);

  return removed
    ? Response.json({ ok: true })
    : Response.json({ error: "Not found." }, { status: 404 });
}
