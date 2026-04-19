"use client";

import { useState, type FormEvent } from "react";

import {
  createFormState,
  mergeDefined,
  reduceEvent,
} from "{{presetDirImport}}/form-preset";
import {
  createEmpty{{entityPascal}}Input,
  {{entityCamel}}FieldDefinitions,
  type Create{{entityPascal}}Input,
} from "{{contractDirImport}}/model";

const fieldStyle = {
  display: "grid",
  gap: "0.35rem",
  marginBottom: "0.75rem",
};

export interface {{entityPascal}}FormProps {
  onSubmit(input: Create{{entityPascal}}Input): Promise<void> | void;
}

export function {{entityPascal}}Form({ onSubmit }: {{entityPascal}}FormProps) {
  const [formState, setFormState] = useState(() =>
    createFormState(
      createEmpty{{entityPascal}}Input() as unknown as Record<string, unknown>,
    ),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState((current) =>
      reduceEvent(current, {
        isSubmitting: true,
        error: null,
      }),
    );

    try {
      await onSubmit(formState.values as unknown as Create{{entityPascal}}Input);
      setFormState(
        createFormState(
          createEmpty{{entityPascal}}Input() as unknown as Record<string, unknown>,
        ),
      );
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
      { {{entityCamel}}FieldDefinitions.map((field) => {
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
        {formState.isSubmitting ? "Saving..." : "Create {{entityTitle}}"}
      </button>
    </form>
  );
}
