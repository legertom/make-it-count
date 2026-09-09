"use client";

import { useState, useTransition } from "react";
import { updateFeedbackStatusAction } from "@/app/(app)/admin/actions";
import { FEEDBACK_STATUSES } from "@/lib/db/schema";

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  triaged: "Triaged",
  in_progress: "In progress",
  done: "Done",
  wont_fix: "Won't fix",
};

export function StatusSelect({ id, value }: { id: string; value: string }) {
  const [current, setCurrent] = useState(value);
  const [pending, start] = useTransition();
  return (
    <select
      className="adm-select"
      value={current}
      disabled={pending}
      aria-label="Status"
      onChange={(e) => {
        const next = e.target.value;
        setCurrent(next);
        start(() => updateFeedbackStatusAction(id, next));
      }}
    >
      {FEEDBACK_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
