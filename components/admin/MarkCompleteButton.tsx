"use client";

import { CircleCheck, CircleCheckBig } from "lucide-react";
import { markLearnerCompleteAction } from "@/app/(app)/admin/actions";
import { ConfirmAction, StaticIcon } from "./ConfirmAction";

/** Check off someone who finished the course outside the app. */
export function MarkCompleteButton({ email, name, compact = false, completed = false }: { email: string; name?: string | null; compact?: boolean; completed?: boolean }) {
  const who = name || email;
  if (completed) {
    return compact ? (
      <StaticIcon tip="Already completed" color="var(--good)">
        <CircleCheckBig size={15} aria-hidden="true" />
      </StaticIcon>
    ) : null;
  }
  return (
    <ConfirmAction
      compact={compact}
      tone="good"
      tip={`Mark ${who} as completed (finished outside the app)`}
      title={`Mark ${who} as completed?`}
      body={<p>Use this when they finished Make It Count some other way. No time is recorded, and the course opens on the job aid for them.</p>}
      confirmLabel="Mark as completed"
      onConfirm={() => markLearnerCompleteAction(email)}
    >
      {compact ? <CircleCheck size={15} aria-hidden="true" /> : "Mark as completed"}
    </ConfirmAction>
  );
}
