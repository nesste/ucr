"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";

import type {
  CreatePostInput,
  Post,
} from "../../../ucr/posts/contract/model";
import {
  getPost,
  removePost,
  updatePost,
} from "../../../ucr/posts/domain/api-client";
import { PostForm } from "../entity-form";

const layoutStyle = {
  padding: "2rem",
  display: "grid",
  gap: "1.5rem",
  maxWidth: "860px",
  margin: "0 auto",
} satisfies CSSProperties;

const cardStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "20px",
  padding: "1.25rem 1.5rem",
  boxShadow: "0 20px 45px rgba(16, 24, 40, 0.08)",
} satisfies CSSProperties;

const metaStyle = {
  color: "#4a5565",
  marginTop: "0.5rem",
} satisfies CSSProperties;

const actionsStyle = {
  display: "flex",
  gap: "0.75rem",
  flexWrap: "wrap",
} satisfies CSSProperties;

const buttonStyle = {
  cursor: "pointer",
  border: "none",
  borderRadius: "999px",
  padding: "0.5rem 0.9rem",
  backgroundColor: "#1f2937",
  color: "#ffffff",
} satisfies CSSProperties;

const dangerButtonStyle = {
  ...buttonStyle,
  backgroundColor: "#b42318",
} satisfies CSSProperties;

const linkStyle = {
  ...buttonStyle,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
} satisfies CSSProperties;

export default function PostDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const router = useRouter();
  const itemId = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "");
  const [state, setState] = useState(() => ({
    isLoading: true,
    isDeleting: false,
    item: null as Post | null,
    error: null as string | null,
    notice: null as string | null,
  }));

  useEffect(() => {
    if (!itemId) {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: "Missing resource id.",
      }));
      return;
    }

    let active = true;

    async function loadItem(): Promise<void> {
      setState((current) => ({
        ...current,
        isLoading: true,
        error: null,
        notice: null,
      }));

      try {
        const item = await getPost(itemId);

        if (!active) {
          return;
        }

        setState((current) => ({
          ...current,
          isLoading: false,
          item,
        }));
      } catch (error) {
        if (!active) {
          return;
        }

        setState((current) => ({
          ...current,
          isLoading: false,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    }

    void loadItem();

    return () => {
      active = false;
    };
  }, [itemId]);

  async function handleRemove(): Promise<void> {
    if (!state.item || state.isDeleting) {
      return;
    }

    setState((current) => ({
      ...current,
      isDeleting: true,
      error: null,
      notice: null,
    }));

    try {
      await removePost(state.item.id);
      router.push("/posts");
    } catch (error) {
      setState((current) => ({
        ...current,
        isDeleting: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  return (
    <main style={layoutStyle}>
      <section style={cardStyle}>
        <h1>Post Details</h1>
        <p style={metaStyle}>
          Review, update, or delete a single Post record.
        </p>
        <div style={actionsStyle}>
          <a href="/posts" style={linkStyle}>
            Back to Posts
          </a>
          <button
            type="button"
            disabled={!state.item || state.isDeleting}
            onClick={() => {
              void handleRemove();
            }}
            style={dangerButtonStyle}
          >
            {state.isDeleting ? "Deleting..." : "Delete Post"}
          </button>
        </div>
        {state.item ? (
          <p style={metaStyle}>
            ID: {state.item.id} · Created: {state.item.createdAt} · Updated: {state.item.updatedAt}
          </p>
        ) : null}
        {state.error ? <p>{state.error}</p> : null}
        {state.notice ? <p>{state.notice}</p> : null}
      </section>

      <section style={cardStyle}>
        <h2>Edit Post</h2>
        {state.isLoading ? (
          <p>Loading Post...</p>
        ) : state.item ? (
          <PostForm
            initialValues={state.item as unknown as Partial<CreatePostInput>}
            onSubmit={async (input) => {
              const item = await updatePost(state.item!.id, input);
              setState((current) => ({
                ...current,
                item,
                notice: "Post updated.",
                error: null,
              }));
            }}
            submitLabel="Save Post"
          />
        ) : (
          <p>Unable to load Post.</p>
        )}
      </section>
    </main>
  );
}
