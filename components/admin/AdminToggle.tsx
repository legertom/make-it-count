"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, ShieldMinus, ShieldPlus } from "lucide-react";
import { setAdminAction } from "@/app/(app)/admin/actions";

type Props = {
  email: string;
  name?: string | null;
  isAdmin: boolean;
  /** Listed in ADMIN_EMAILS: always an admin, can't be removed here. */
  isConfigAdmin: boolean;
  isSelf: boolean;
  compact?: boolean;
};

/** Promote a learner to admin, or demote an admin back to learner. */
export function AdminToggle({ email, name, isAdmin, isConfigAdmin, isSelf, compact = false }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const who = name || email;

  const locked = isConfigAdmin || (isAdmin && isSelf);
  const lockReason = isConfigAdmin
    ? "Set in the ADMIN_EMAILS configuration"
    : isSelf
      ? "You can't remove your own admin access"
      : "";

  const run = (makeAdmin: boolean) => {
    const msg = makeAdmin
      ? `Make ${who} an admin?\n\nThey'll be able to see all feedback, every learner's progress, and manage other admins.`
      : `Remove ${who}'s admin access?\n\nThey keep their course progress and become a regular learner.`;
    if (!window.confirm(msg)) return;
    setError(null);
    start(async () => {
      try {
        await setAdminAction(email, makeAdmin);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't change the role.");
      }
    });
  };

  if (compact) {
    if (isAdmin && locked) {
      return (
        <span className="adm-iconbtn" data-static="true" title={`Admin · ${lockReason}`} aria-label={`Admin: ${lockReason}`}>
          <ShieldCheck size={15} aria-hidden="true" />
        </span>
      );
    }
    return (
      <button
        type="button"
        className="adm-iconbtn"
        data-tone={isAdmin ? "danger" : "good"}
        disabled={pending}
        onClick={() => run(!isAdmin)}
        title={isAdmin ? `Remove ${who}'s admin access` : `Make ${who} an admin`}
        aria-label={isAdmin ? `Remove ${who}'s admin access` : `Make ${who} an admin`}
      >
        {isAdmin ? <ShieldMinus size={15} aria-hidden="true" /> : <ShieldPlus size={15} aria-hidden="true" />}
      </button>
    );
  }

  return (
    <div>
      {isAdmin && locked ? (
        <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>{lockReason}.</p>
      ) : (
        <button type="button" className={isAdmin ? "cb-btn cb-btn-danger" : "cb-btn cb-btn-primary"} disabled={pending} onClick={() => run(!isAdmin)}>
          {pending ? "Saving…" : isAdmin ? "Remove admin access" : "Make admin"}
        </button>
      )}
      {error && <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "var(--bad)" }}>{error}</p>}
    </div>
  );
}
