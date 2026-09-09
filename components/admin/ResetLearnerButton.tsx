"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { resetLearnerAction } from "@/app/(app)/admin/actions";

export function ResetLearnerButton({ email, name, compact = false }: { email: string; name?: string | null; compact?: boolean }) {
  const [pending, start] = useTransition();
  const who = name || email;
  const onClick = () => {
    if (window.confirm(`Reset ${who}'s progress?\n\nThis clears their current page, answers, completion, and page timings. Their sign-in history and any ratings are kept.`)) {
      start(() => resetLearnerAction(email));
    }
  };

  if (compact) {
    return (
      <button type="button" className="adm-iconbtn" disabled={pending} onClick={onClick} title={`Reset ${who}'s progress`} aria-label={`Reset ${who}'s progress`}>
        <RotateCcw size={15} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button type="button" className="cb-btn cb-btn-danger" disabled={pending} onClick={onClick}>
      {pending ? "Resetting…" : "Reset progress"}
    </button>
  );
}
