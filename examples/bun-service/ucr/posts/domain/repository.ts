import type {
  CreatePostInput,
  UpdatePostInput,
  Post,
} from "../contract/model";

export interface PostRepository {
  list(): Promise<Post[]>;
  get(id: string): Promise<Post | null>;
  create(input: CreatePostInput): Promise<Post>;
  update(
    id: string,
    input: UpdatePostInput,
  ): Promise<Post | null>;
  remove(id: string): Promise<boolean>;
}
