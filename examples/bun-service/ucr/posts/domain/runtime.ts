import { createPostService } from "./service";
import { createInMemoryPostRepository } from "./memory-repository";

export const postService = createPostService(
  createInMemoryPostRepository(),
);
