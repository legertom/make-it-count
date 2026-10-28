"use client";

import { useTransition } from "react";
import { CircleCheck } from "lucide-react";
import { markLearnerCompleteAction } from "@/app/(app)/admin/actions";

/** Check off someone who finished the course outside the app. */
export function MarkCompleteButton({ email, name, compact = false }: { email: string; name?: string | null; compact?: boolean }) {
  const [pending, start] = useTransition();
  const who = name || email;
  const onClick = () => {
    if (window.confirm(`Mark ${who} as having finished Make It Count?\n\nUse this when they completed it some other way. No time is recorded, and the course opens on the job aid for them.`)) {
      start(() => markLearnerCompleteAction(email));
    }
  };

  if (compact) {
    return (
      <button type="button" className="adm-iconbtn" data-tone="good" disabled={pending} onClick={onClick} title={`Mark ${who} as completed`} aria-label={`Mark ${who} as completed`}>
        <CircleCheck size={15} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button type="button" className="cb-btn cb-btn-soft" disabled={pending} onClick={onClick}>
      {pending ? "Saving…" : "Mark as completed"}
    </button>
  );
}
