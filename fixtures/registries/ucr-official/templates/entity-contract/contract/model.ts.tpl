export interface {{entityPascal}} {
  id: string;
  createdAt: string;
  updatedAt: string;
{{#each fields}}  {{nameCamel}}{{optionalToken}}: {{tsType}};
{{/each}}}

export interface Create{{entityPascal}}Input {
{{#each fields}}  {{nameCamel}}{{optionalToken}}: {{tsType}};
{{/each}}}

export interface Update{{entityPascal}}Input {
{{#each fields}}  {{nameCamel}}?: {{tsType}};
{{/each}}}

export interface {{entityPascal}}FieldDefinition {
  name: keyof Create{{entityPascal}}Input;
  label: string;
  tsType: string;
  inputType: string;
  required: boolean;
}

export const {{entityCamel}}FieldDefinitions = [
{{#each fields}}  {
    name: "{{nameCamel}}",
    label: "{{label}}",
    tsType: "{{tsType}}",
    inputType: "{{inputType}}",
    required: {{required}},
  },
{{/each}}] as const satisfies readonly {{entityPascal}}FieldDefinition[];

export function createEmpty{{entityPascal}}Input(): Create{{entityPascal}}Input {
  return {
{{#each fields}}    {{nameCamel}}: {{emptyValueCode}},
{{/each}}  };
}

export function merge{{entityPascal}}Update(
  current: {{entityPascal}},
  input: Update{{entityPascal}}Input,
): {{entityPascal}} {
  return {
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  };
}
