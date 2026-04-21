import type {
  CreatePostInput,
  UpdatePostInput,
  Post,
} from "../contract/model";
import { withTimeout } from "../../presets/service-preset";
import type { PostRepository } from "./repository";

export interface PostService {
  listPosts(): Promise<Post[]>;
  getPost(id: string): Promise<Post | null>;
  createPost(
    input: CreatePostInput,
  ): Promise<Post>;
  updatePost(
    id: string,
    input: UpdatePostInput,
  ): Promise<Post | null>;
  removePost(id: string): Promise<boolean>;
}

export function createPostService(
  repository: PostRepository,
): PostService {
  return {
    listPosts(): Promise<Post[]> {
      return withTimeout(() => repository.list(), 1500);
    },
    getPost(id: string): Promise<Post | null> {
      return withTimeout(() => repository.get(id), 1500);
    },
    createPost(
      input: CreatePostInput,
    ): Promise<Post> {
      return withTimeout(() => repository.create(input), 1500);
    },
    updatePost(
      id: string,
      input: UpdatePostInput,
    ): Promise<Post | null> {
      return withTimeout(() => repository.update(id, input), 1500);
    },
    removePost(id: string): Promise<boolean> {
      return withTimeout(() => repository.remove(id), 1500);
    },
  };
}
