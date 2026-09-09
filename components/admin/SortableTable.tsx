"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export type SortValue = number | string | null | undefined;

export type SortableColumn = {
  key: string;
  label: string;
  /** Right-align numbers. */
  num?: boolean;
  /** Default sort direction when this column is first clicked. Numbers usually want "desc". */
  defaultDir?: "asc" | "desc";
  sortable?: boolean;
};

export type SortableRow = {
  id: string;
  /** Plain values used for ordering, keyed by column key. */
  sort: Record<string, SortValue>;
  /** Pre-rendered cells in column order. */
  cells: ReactNode[];
  style?: React.CSSProperties;
};

function compare(a: SortValue, b: SortValue): number {
  const aNull = a === null || a === undefined || a === "";
  const bNull = b === null || b === undefined || b === "";
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/**
 * A table whose headers sort the rows client-side. The server renders the
 * cells; this only reorders them, so links, buttons, and bars all keep working.
 */
export function SortableTable({
  columns,
  rows,
  initialSort,
  empty,
}: {
  columns: SortableColumn[];
  rows: SortableRow[];
  initialSort?: { key: string; dir: "asc" | "desc" };
  empty?: ReactNode;
}) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => compare(a.sort[sort.key], b.sort[sort.key]) * dir);
  }, [rows, sort]);

  const toggle = (col: SortableColumn) => {
    if (col.sortable === false) return;
    setSort((s) => {
      if (s?.key === col.key) return { key: col.key, dir: s.dir === "asc" ? "desc" : "asc" };
      return { key: col.key, dir: col.defaultDir ?? (col.num ? "desc" : "asc") };
    });
  };

  return (
    <div className="adm-tablewrap">
      <table className="adm-table">
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              const sortable = c.sortable !== false;
              return (
                <th
                  key={c.key}
                  className={c.num ? "num" : undefined}
                  aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                >
                  {sortable ? (
                    <button type="button" className="adm-sort" data-active={active} onClick={() => toggle(c)}>
                      {c.label}
                      <span className="adm-sort-icon" aria-hidden="true">
                        {active && sort!.dir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </span>
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="adm-empty">
                {empty ?? "Nothing here yet."}
              </td>
            </tr>
          )}
          {sorted.map((r) => (
            <tr key={r.id} style={r.style}>
              {r.cells.map((cell, i) => (
                <td key={columns[i]?.key ?? i} className={columns[i]?.num ? "num" : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
