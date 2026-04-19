export interface Post {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  views: number;
  published: boolean;
  publishedAt?: string;
}

export interface CreatePostInput {
  title: string;
  views: number;
  published: boolean;
  publishedAt?: string;
}

export interface UpdatePostInput {
  title?: string;
  views?: number;
  published?: boolean;
  publishedAt?: string;
}

export interface PostFieldDefinition {
  name: keyof CreatePostInput;
  label: string;
  tsType: string;
  inputType: string;
  required: boolean;
}

export const postFieldDefinitions = [
  {
    name: "title",
    label: "Title",
    tsType: "string",
    inputType: "text",
    required: true,
  },
  {
    name: "views",
    label: "Views",
    tsType: "number",
    inputType: "number",
    required: true,
  },
  {
    name: "published",
    label: "Published",
    tsType: "boolean",
    inputType: "checkbox",
    required: true,
  },
  {
    name: "publishedAt",
    label: "Published At",
    tsType: "string",
    inputType: "date",
    required: false,
  },
] as const satisfies readonly PostFieldDefinition[];

export function createEmptyPostInput(): CreatePostInput {
  return {
    title: "",
    views: 0,
    published: false,
    publishedAt: "",
  };
}

export function mergePostUpdate(
  current: Post,
  input: UpdatePostInput,
): Post {
  return {
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  };
}
