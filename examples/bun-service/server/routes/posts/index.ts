import { postService } from "../../../ucr/posts/domain/runtime";
import { validateCreatePostInput } from "../../../ucr/posts/contract/validation";

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

export const postCollectionRoute = {
  pattern: "/posts",
  methods: {
    async GET() {
      const items = await postService.listPosts();
      return Response.json({ items });
    },
    async POST(request) {
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
    },
  },
} satisfies RouteModule;
