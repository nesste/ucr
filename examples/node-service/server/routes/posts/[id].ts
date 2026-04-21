import { postService } from "../../../ucr/posts/domain/runtime";
import { validateUpdatePostInput } from "../../../ucr/posts/contract/validation";

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

export const postItemRoute = {
  pattern: "/posts/[id]",
  methods: {
    async GET(_request, params) {
      const id = params.id;
      if (!id) {
        return Response.json({ error: "Missing id." }, { status: 400 });
      }
      const item = await postService.getPost(id);

      return item
        ? Response.json({ item })
        : Response.json({ error: "Not found." }, { status: 404 });
    },
    async PUT(request, params) {
      const body = await readJsonBody(request);
      const validation = validateUpdatePostInput(body);

      if (!validation.ok) {
        return Response.json(
          { errors: validation.errors },
          { status: 400 },
        );
      }

      const id = params.id;
      if (!id) {
        return Response.json({ error: "Missing id." }, { status: 400 });
      }
      const item = await postService.updatePost(
        id,
        validation.data,
      );

      return item
        ? Response.json({ item })
        : Response.json({ error: "Not found." }, { status: 404 });
    },
    async DELETE(_request, params) {
      const id = params.id;
      if (!id) {
        return Response.json({ error: "Missing id." }, { status: 400 });
      }
      const removed = await postService.removePost(id);

      return removed
        ? Response.json({ ok: true })
        : Response.json({ error: "Not found." }, { status: 404 });
    },
  },
} satisfies RouteModule;
