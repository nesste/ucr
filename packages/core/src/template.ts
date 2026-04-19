interface TextNode {
  type: "text";
  value: string;
}

interface VariableNode {
  type: "variable";
  expression: string;
}

interface IfNode {
  type: "if";
  expression: string;
  children: TemplateNode[];
}

interface EachNode {
  type: "each";
  expression: string;
  children: TemplateNode[];
}

type TemplateNode = TextNode | VariableNode | IfNode | EachNode;

interface Token {
  type: "text" | "tag";
  value: string;
}

interface RenderFrame {
  data: Record<string, unknown>;
  current: unknown;
  index: number | null;
  root: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tokenize(template: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < template.length) {
    const openIndex = template.indexOf("{{", cursor);

    if (openIndex === -1) {
      tokens.push({
        type: "text",
        value: template.slice(cursor),
      });
      break;
    }

    if (openIndex > cursor) {
      tokens.push({
        type: "text",
        value: template.slice(cursor, openIndex),
      });
    }

    const closeIndex = template.indexOf("}}", openIndex + 2);
    if (closeIndex === -1) {
      throw new Error("Unclosed template tag.");
    }

    tokens.push({
      type: "tag",
      value: template.slice(openIndex + 2, closeIndex).trim(),
    });
    cursor = closeIndex + 2;
  }

  return tokens;
}

function parseNodes(
  tokens: Token[],
  state: { index: number },
  stopTag?: "/if" | "/each",
): TemplateNode[] {
  const nodes: TemplateNode[] = [];

  while (state.index < tokens.length) {
    const token = tokens[state.index]!;
    state.index += 1;

    if (token.type === "text") {
      nodes.push({
        type: "text",
        value: token.value,
      });
      continue;
    }

    if (token.value === stopTag) {
      return nodes;
    }

    if (token.value.startsWith("#if ")) {
      nodes.push({
        type: "if",
        expression: token.value.slice(4).trim(),
        children: parseNodes(tokens, state, "/if"),
      });
      continue;
    }

    if (token.value.startsWith("#each ")) {
      nodes.push({
        type: "each",
        expression: token.value.slice(6).trim(),
        children: parseNodes(tokens, state, "/each"),
      });
      continue;
    }

    if (token.value === "/if" || token.value === "/each") {
      throw new Error(`Unexpected closing tag "${token.value}".`);
    }

    nodes.push({
      type: "variable",
      expression: token.value,
    });
  }

  if (stopTag) {
    throw new Error(`Missing closing tag "${stopTag}".`);
  }

  return nodes;
}

function lookup(base: unknown, segments: string[]): unknown {
  let current = base;

  for (const segment of segments) {
    if (segment.length === 0) {
      continue;
    }

    if (!isRecord(current) && !Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function resolveExpression(expression: string, frame: RenderFrame): unknown {
  const trimmed = expression.trim();

  if (trimmed === "" || trimmed === ".") {
    return frame.current;
  }

  if (trimmed === "this") {
    return frame.current;
  }

  if (trimmed === "@index") {
    return frame.index;
  }

  const segments = trimmed.split(".");

  if (segments[0] === "@root") {
    return lookup(frame.root, segments.slice(1));
  }

  if (segments[0] === "this") {
    return lookup(frame.current, segments.slice(1));
  }

  return lookup(frame.data, segments);
}

function isTruthy(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return Boolean(value);
}

function renderNodes(nodes: TemplateNode[], frame: RenderFrame): string {
  let output = "";

  for (const node of nodes) {
    switch (node.type) {
      case "text":
        output += node.value;
        break;
      case "variable": {
        const value = resolveExpression(node.expression, frame);
        output += value === undefined || value === null ? "" : String(value);
        break;
      }
      case "if": {
        const value = resolveExpression(node.expression, frame);
        if (isTruthy(value)) {
          output += renderNodes(node.children, frame);
        }
        break;
      }
      case "each": {
        const value = resolveExpression(node.expression, frame);

        if (!Array.isArray(value)) {
          break;
        }

        value.forEach((item, index) => {
          const data =
            isRecord(item)
              ? {
                  ...frame.data,
                  ...item,
                }
              : frame.data;

          output += renderNodes(node.children, {
            data,
            current: item,
            index,
            root: frame.root,
          });
        });
        break;
      }
    }
  }

  return output;
}

export function renderTemplate(
  template: string,
  context: Record<string, unknown>,
): string {
  const tokens = tokenize(template);
  const nodes = parseNodes(tokens, { index: 0 });

  return renderNodes(nodes, {
    data: context,
    current: context,
    index: null,
    root: context,
  });
}
