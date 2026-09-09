"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { SortableTable, type SortableColumn, type SortableRow } from "./SortableTable";

type Status = "all" | "completed" | "in_progress" | "not_started";

const STATUS_CHIPS: { id: Status; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "completed", label: "Completed" },
  { id: "in_progress", label: "In progress" },
  { id: "not_started", label: "Not started" },
];

/**
 * Search box + completion filter around the sortable roster. Rows carry
 * `meta.text` (name and email, lowercased) and `meta.status` from the server.
 */
export function LearnerRoster({ columns, rows }: { columns: SortableColumn[]; rows: SortableRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("all");

  const counts = useMemo(() => {
    const c: Record<Status, number> = { all: rows.length, completed: 0, in_progress: 0, not_started: 0 };
    for (const r of rows) {
      const s = r.meta?.status as Status | undefined;
      if (s && s in c) c[s]++;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.meta?.status !== status) return false;
      if (needle && !(r.meta?.text ?? "").includes(needle)) return false;
      return true;
    });
  }, [rows, q, status]);

  return (
    <>
      <div className="adm-toolbar">
        <label className="adm-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email"
            aria-label="Search learners"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </label>
        <div className="adm-chips" role="group" aria-label="Filter by completion">
          {STATUS_CHIPS.map((c) => (
            <button key={c.id} type="button" className="adm-chip" aria-pressed={status === c.id} onClick={() => setStatus(c.id)}>
              {c.label} <span className="adm-chip-n">{counts[c.id]}</span>
            </button>
          ))}
        </div>
        <span className="adm-toolbar-count">
          {filtered.length === rows.length ? `${rows.length} learner${rows.length === 1 ? "" : "s"}` : `${filtered.length} of ${rows.length}`}
        </span>
      </div>
      <SortableTable
        columns={columns}
        rows={filtered}
        initialSort={{ key: "lastActive", dir: "desc" }}
        empty={rows.length === 0 ? "Nobody has signed in yet." : "No learners match."}
      />
    </>
  );
}
