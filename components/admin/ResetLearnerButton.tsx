"use client";

import { useTransition } from "react";
import { resetLearnerAction } from "@/app/(app)/admin/actions";

export function ResetLearnerButton({ email, name, compact = false }: { email: string; name?: string | null; compact?: boolean }) {
  const [pending, start] = useTransition();
  const who = name || email;
  return (
    <button
      type="button"
      className={compact ? "cb-linkbtn" : "cb-btn cb-btn-danger"}
      style={compact ? { color: "var(--bad)" } : undefined}
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Reset ${who}'s progress?\n\nThis clears their current page, answers, completion, and page timings. Their sign-in history is kept.`)) {
          start(() => resetLearnerAction(email));
        }
      }}
    >
      {pending ? "Resetting…" : "Reset progress"}
    </button>
  );
}
