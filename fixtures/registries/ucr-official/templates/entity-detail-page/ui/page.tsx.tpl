"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";

import type {
  Create{{entityPascal}}Input,
  {{entityPascal}},
} from "{{contractDirImport}}/model";
import {
  get{{entityPascal}},
  remove{{entityPascal}},
  update{{entityPascal}},
} from "{{domainDirImport}}/api-client";
import { {{entityPascal}}Form } from "../entity-form";

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

export default function {{entityPascal}}DetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const router = useRouter();
  const itemId = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "");
  const [state, setState] = useState(() => ({
    isLoading: true,
    isDeleting: false,
    item: null as {{entityPascal}} | null,
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
        const item = await get{{entityPascal}}(itemId);

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
      await remove{{entityPascal}}(state.item.id);
      router.push("/{{pluralKebab}}");
    } catch (error) {
      setState((current) => ({
        ...current,
        isDeleting: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  const currentItem = state.item;

  return (
    <main style={layoutStyle}>
      <section style={cardStyle}>
        <h1>{{entityTitle}} Details</h1>
        <p style={metaStyle}>
          Review, update, or delete a single {{entityTitle}} record.
        </p>
        <div style={actionsStyle}>
          <a href="/{{pluralKebab}}" style={linkStyle}>
            Back to {{pluralTitle}}
          </a>
          <button
            type="button"
            disabled={!state.item || state.isDeleting}
            onClick={() => {
              void handleRemove();
            }}
            style={dangerButtonStyle}
          >
            {state.isDeleting ? "Deleting..." : "Delete {{entityTitle}}"}
          </button>
        </div>
        {currentItem ? (
          <p style={metaStyle}>
            ID: {currentItem.id} · Created: {currentItem.createdAt} · Updated: {currentItem.updatedAt}
          </p>
        ) : null}
        {state.error ? <p>{state.error}</p> : null}
        {state.notice ? <p>{state.notice}</p> : null}
      </section>

      <section style={cardStyle}>
        <h2>Edit {{entityTitle}}</h2>
        {state.isLoading ? (
          <p>Loading {{entityTitle}}...</p>
        ) : currentItem ? (
          <{{entityPascal}}Form
            initialValues={currentItem}
            onSubmit={async (input) => {
              const item = await update{{entityPascal}}(currentItem.id, input);
              setState((current) => ({
                ...current,
                item,
                notice: "{{entityTitle}} updated.",
                error: null,
              }));
            }}
            submitLabel="Save {{entityTitle}}"
          />
        ) : (
          <p>Unable to load {{entityTitle}}.</p>
        )}
      </section>
    </main>
  );
}
