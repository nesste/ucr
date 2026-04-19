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
} from "{{presetDirImport}}/admin-page-preset";
import type { {{entityPascal}} } from "{{contractDirImport}}/model";
import {
  create{{entityPascal}},
  list{{pluralPascal}},
  remove{{entityPascal}},
} from "{{domainDirImport}}/api-client";
import { {{entityPascal}}Table } from "./data-table";
import { {{entityPascal}}Form } from "./entity-form";

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

export default function {{pluralPascal}}Page() {
  const [state, setState] = useState(() => createAsyncState<{{entityPascal}}[]>([]));

  async function refresh(): Promise<void> {
    setState((current) =>
      reduceEvent(current, {
        status: "loading",
        error: null,
      }),
    );

    try {
      const items = await list{{pluralPascal}}();
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
        <h1>{{pluralTitle}}</h1>
        <p style={slots.muted as CSSProperties}>
          UCR-managed admin screen for {{pluralTitle}} built from utility-first TypeScript blocks.
        </p>
        <p style={badgeStyle as CSSProperties}>
          Status: {state.status}
        </p>
        {state.error ? <p>{state.error}</p> : null}
      </section>

      <section style={slots.card as CSSProperties}>
        <h2>Create {{entityTitle}}</h2>
        <{{entityPascal}}Form
          onSubmit={async (input) => {
            await create{{entityPascal}}(input);
            await refresh();
          }}
        />
      </section>

      <section style={slots.card as CSSProperties}>
        <h2>Current {{pluralTitle}}</h2>
        <{{entityPascal}}Table
          items={state.data}
          onRemove={async (id) => {
            await remove{{entityPascal}}(id);
            await refresh();
          }}
        />
      </section>
    </main>
  );
}
