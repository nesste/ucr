"use client";

import { useEffect, useState, type FormEvent } from "react";

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
  initialValues?: Partial<Create{{entityPascal}}Input>;
  onSubmit(input: Create{{entityPascal}}Input): Promise<void> | void;
  submitLabel?: string;
}

type FormValues = Partial<Record<keyof Create{{entityPascal}}Input, unknown>>;

function createInitialValues(
  initialValues?: Partial<FormValues>,
): FormValues {
  return mergeDefined(
    { ...createEmpty{{entityPascal}}Input() },
    initialValues ?? {},
  );
}

function toCreate{{entityPascal}}Input(values: FormValues): Create{{entityPascal}}Input {
  return values as Create{{entityPascal}}Input;
}

function withFieldValue(
  values: FormValues,
  field: keyof Create{{entityPascal}}Input,
  value: unknown,
): FormValues {
  const patch: Partial<FormValues> = {};
  patch[field] = value;

  return mergeDefined(values, patch);
}

export function {{entityPascal}}Form({
  initialValues,
  onSubmit,
  submitLabel,
}: {{entityPascal}}FormProps) {
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
      await onSubmit(toCreate{{entityPascal}}Input(formState.values));
      setFormState(createFormState(
        initialValues
          ? createInitialValues(formState.values)
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
                      values: withFieldValue(
                        current.values,
                        field.name,
                        event.target.checked,
                      ),
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
                      values: withFieldValue(
                        current.values,
                        field.name,
                        event.target.value,
                      ),
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
        {formState.isSubmitting ? "Saving..." : (submitLabel ?? "Create {{entityTitle}}")}
      </button>
    </form>
  );
}
