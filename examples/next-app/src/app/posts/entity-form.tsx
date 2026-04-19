"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  createFormState,
  mergeDefined,
  reduceEvent,
} from "../../ucr/presets/form-preset";
import {
  createEmptyPostInput,
  postFieldDefinitions,
  type CreatePostInput,
} from "../../ucr/posts/contract/model";

const fieldStyle = {
  display: "grid",
  gap: "0.35rem",
  marginBottom: "0.75rem",
};

export interface PostFormProps {
  initialValues?: Partial<CreatePostInput>;
  onSubmit(input: CreatePostInput): Promise<void> | void;
  submitLabel?: string;
}

function createInitialValues(
  initialValues?: Partial<CreatePostInput>,
): Record<string, unknown> {
  return mergeDefined(
    createEmptyPostInput() as unknown as Record<string, unknown>,
    (initialValues ?? {}) as Record<string, unknown>,
  );
}

export function PostForm({
  initialValues,
  onSubmit,
  submitLabel,
}: PostFormProps) {
  const [formState, setFormState] = useState(() =>
    createFormState(createInitialValues(initialValues)),
  );

  useEffect(() => {
    setFormState(createFormState(createInitialValues(initialValues)));
  }, [initialValues]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState((current) =>
      reduceEvent(current, {
        isSubmitting: true,
        error: null,
      }),
    );

    try {
      await onSubmit(formState.values as unknown as CreatePostInput);
      setFormState(createFormState(
        initialValues
          ? createInitialValues(
              formState.values as unknown as Partial<CreatePostInput>,
            )
          : createInitialValues(),
      ));
    } catch (error) {
      setFormState((current) =>
        reduceEvent(current, {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setFormState((current) =>
        reduceEvent(current, {
          isSubmitting: false,
        }),
      );
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      { postFieldDefinitions.map((field) => {
        const currentValue = formState.values[field.name];

        return (
          <label
            key={field.name}
            style={fieldStyle}
          >
            <span>{field.label}</span>
            {field.inputType === "checkbox" ? (
              <input
                checked={Boolean(currentValue)}
                onChange={(event) => {
                  setFormState((current) =>
                    reduceEvent(current, {
                      values: mergeDefined(current.values, {
                        [field.name]: event.target.checked,
                      } as Record<string, unknown>),
                      error: null,
                    }),
                  );
                }}
                type="checkbox"
              />
            ) : (
              <input
                onChange={(event) => {
                  setFormState((current) =>
                    reduceEvent(current, {
                      values: mergeDefined(current.values, {
                        [field.name]: event.target.value,
                      } as Record<string, unknown>),
                      error: null,
                    }),
                  );
                }}
                required={field.required}
                type={field.inputType}
                value={String(currentValue ?? "")}
              />
            )}
          </label>
        );
      })}

      {formState.error ? <p>{formState.error}</p> : null}

      <button disabled={formState.isSubmitting} type="submit">
        {formState.isSubmitting ? "Saving..." : (submitLabel ?? "Create Post")}
      </button>
    </form>
  );
}
