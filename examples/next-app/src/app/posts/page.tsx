"use client";

import { useEffect, useState, type CSSProperties } from "react";

import {
  compoundVariants,
  createAsyncState,
  createSlots,
  createVariants,
  pickVariant,
  reduceEvent,
  resolveSlots,
} from "../../ucr/presets/admin-page-preset";
import type { Post } from "../../ucr/posts/contract/model";
import {
  createPost,
  listPosts,
  removePost,
} from "../../ucr/posts/domain/api-client";
import { PostTable } from "./data-table";
import { PostForm } from "./entity-form";

const layoutVariants = createVariants(
  {
    padding: "2rem",
    display: "grid",
    gap: "1.5rem",
    background:
      "linear-gradient(180deg, rgba(247,249,252,1) 0%, rgba(255,255,255,1) 100%)",
  },
  {
    density: {
      relaxed: {
        maxWidth: "1100px",
        margin: "0 auto",
      },
    },
  },
);

const slots = resolveSlots(
  createSlots({
    card: {
      backgroundColor: "#ffffff",
      borderRadius: "20px",
      padding: "1.25rem 1.5rem",
      boxShadow: "0 20px 45px rgba(16, 24, 40, 0.08)",
    },
    muted: {
      color: "#4a5565",
      marginTop: "0.35rem",
    },
  }),
);

export default function PostsPage() {
  const [state, setState] = useState(() => createAsyncState<Post[]>([]));

  async function refresh(): Promise<void> {
    setState((current) =>
      reduceEvent(current, {
        status: "loading",
        error: null,
      }),
    );

    try {
      const items = await listPosts();
      setState((current) =>
        reduceEvent(current, {
          status: "success",
          data: items,
        }),
      );
    } catch (nextError) {
      setState((current) =>
        reduceEvent(current, {
          status: "error",
          error: nextError instanceof Error ? nextError.message : String(nextError),
        }),
      );
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const badgeStyle = compoundVariants(
    {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.4rem",
      padding: "0.35rem 0.75rem",
      borderRadius: "999px",
      fontSize: "0.9rem",
      fontWeight: 600,
    },
    pickVariant(
      createVariants({}, {
        status: {
          idle: {
            backgroundColor: "#eef2f8",
            color: "#364152",
          },
          loading: {
            backgroundColor: "#fff1c2",
            color: "#8a5b00",
          },
          success: {
            backgroundColor: "#dcfce7",
            color: "#166534",
          },
          error: {
            backgroundColor: "#fee2e2",
            color: "#991b1b",
          },
        },
      }),
      { status: state.status },
    ),
  );

  return (
    <main style={pickVariant(layoutVariants, { density: "relaxed" }) as CSSProperties}>
      <section style={slots.card as CSSProperties}>
        <h1>Posts</h1>
        <p style={slots.muted as CSSProperties}>
          UCR-managed admin screen for Posts built from utility-first TypeScript blocks.
        </p>
        <p style={badgeStyle as CSSProperties}>
          Status: {state.status}
        </p>
        {state.error ? <p>{state.error}</p> : null}
      </section>

      <section style={slots.card as CSSProperties}>
        <h2>Create Post</h2>
        <PostForm
          onSubmit={async (input) => {
            await createPost(input);
            await refresh();
          }}
        />
      </section>

      <section style={slots.card as CSSProperties}>
        <h2>Current Posts</h2>
        <PostTable
          items={state.data}
          onRemove={async (id) => {
            await removePost(id);
            await refresh();
          }}
        />
      </section>
    </main>
  );
}
