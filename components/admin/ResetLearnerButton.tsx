"use client";

import { RotateCcw } from "lucide-react";
import { resetLearnerAction } from "@/app/(app)/admin/actions";
import { ConfirmAction, StaticIcon } from "./ConfirmAction";

export function ResetLearnerButton({ email, name, compact = false, started = true }: { email: string; name?: string | null; compact?: boolean; started?: boolean }) {
  const who = name || email;
  if (!started) {
    return compact ? (
      <StaticIcon tip="Reset progress: nothing to reset, they haven't started" color="var(--line)">
        <RotateCcw size={15} aria-hidden="true" />
      </StaticIcon>
    ) : null;
  }
  return (
    <ConfirmAction
      compact={compact}
      tone="danger"
      tip={`Reset ${who}'s progress so they start over`}
      buttonClass="cb-btn cb-btn-danger"
      title={`Reset ${who}'s progress?`}
      body={<p>This clears their current page, answers, completion and page timings, so they start the course over. Their sign-in history and any ratings are kept.</p>}
      confirmLabel="Reset progress"
      danger
      onConfirm={() => resetLearnerAction(email)}
    >
      {compact ? <RotateCcw size={15} aria-hidden="true" /> : "Reset progress"}
    </ConfirmAction>
  );
}
