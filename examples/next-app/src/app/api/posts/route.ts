import { postService } from "../../../ucr/posts/domain/runtime";
import { validateCreatePostInput } from "../../../ucr/posts/contract/validation";

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET(): Promise<Response> {
  const items = await postService.listPosts();
  return Response.json({ items });
}

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  const validation = validateCreatePostInput(body);

  if (!validation.ok) {
    return Response.json(
      { errors: validation.errors },
      { status: 400 },
    );
  }

  const item = await postService.createPost(
    validation.data,
  );

  return Response.json({ item }, { status: 201 });
}
