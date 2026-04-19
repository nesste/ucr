import type { CSSProperties } from "react";

import {
  compoundVariants,
  createVariants,
  pickVariant,
  sortBy,
} from "../../ucr/presets/admin-page-preset";
import type { Post } from "../../ucr/posts/contract/model";
import { postFieldDefinitions } from "../../ucr/posts/contract/model";

export interface PostTableProps {
  items: Post[];
  onRemove?(id: string): Promise<void> | void;
}

const tableVariants = createVariants(
  {
    width: "100%",
    borderCollapse: "collapse",
  },
  {
    density: {
      compact: {
        fontSize: "0.95rem",
      },
    },
  },
);

const slots = {
  headerCell: {
    textAlign: "left",
    padding: "0.75rem 0.5rem",
    borderBottom: "1px solid #d5d9e0",
  },
  bodyCell: {
    padding: "0.75rem 0.5rem",
    borderBottom: "1px solid #eef1f5",
  },
};

const removeButtonStyle = compoundVariants(
  {
    cursor: "pointer",
    border: "none",
    borderRadius: "999px",
    padding: "0.4rem 0.85rem",
    backgroundColor: "#ffe7e1",
    color: "#8a2311",
  },
);

function formatValue(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return String(value);
}

export function PostTable({
  items,
  onRemove,
}: PostTableProps) {
  const orderedItems = sortBy(items, (item) => item.createdAt);

  return (
    <table style={pickVariant(tableVariants, { density: "compact" }) as CSSProperties}>
      <thead>
        <tr>
          <th style={slots.headerCell as CSSProperties}>ID</th>
          { postFieldDefinitions.map((field) => (
            <th key={field.name} style={slots.headerCell as CSSProperties}>
              {field.label}
            </th>
          )) }
          <th style={slots.headerCell as CSSProperties}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {orderedItems.map((item) => {
          const record = item as unknown as Record<string, unknown>;

          return (
            <tr key={item.id}>
              <td style={slots.bodyCell as CSSProperties}>{item.id}</td>
              { postFieldDefinitions.map((field) => (
                <td key={field.name} style={slots.bodyCell as CSSProperties}>
                  {formatValue(record[field.name])}
                </td>
              )) }
              <td style={slots.bodyCell as CSSProperties}>
                <button
                  type="button"
                  style={removeButtonStyle as CSSProperties}
                  onClick={() => onRemove?.(item.id)}
                >
                  Remove
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
