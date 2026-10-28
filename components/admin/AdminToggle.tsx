"use client";

import { ShieldCheck, ShieldMinus, ShieldPlus } from "lucide-react";
import { setAdminAction } from "@/app/(app)/admin/actions";
import { ConfirmAction, StaticIcon } from "./ConfirmAction";

type Props = {
  email: string;
  name?: string | null;
  isAdmin: boolean;
  /** Listed in ADMIN_EMAILS: always an admin, can't be removed here. */
  isConfigAdmin: boolean;
  isSelf: boolean;
  compact?: boolean;
};

/** Promote a learner to admin, or demote an admin back to learner. Always asks first. */
export function AdminToggle({ email, name, isAdmin, isConfigAdmin, isSelf, compact = false }: Props) {
  const who = name || email;
  const locked = isConfigAdmin || (isAdmin && isSelf);
  const lockReason = isConfigAdmin
    ? "Set in the ADMIN_EMAILS configuration"
    : "You can't remove your own admin access";

  if (isAdmin && locked) {
    return compact ? (
      <StaticIcon tip={`Admin. ${lockReason}.`} color="#4B2FB5">
        <ShieldCheck size={15} aria-hidden="true" />
      </StaticIcon>
    ) : (
      <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>{lockReason}.</p>
    );
  }

  return isAdmin ? (
    <ConfirmAction
      compact={compact}
      tone="danger"
      tip={`Remove admin access for ${who}`}
      buttonClass="cb-btn cb-btn-danger"
      title={`Remove ${who}'s admin access?`}
      body={<p>They keep their course progress and become a regular learner. They&rsquo;ll lose access to the admin pages.</p>}
      confirmLabel="Remove admin access"
      danger
      onConfirm={() => setAdminAction(email, false)}
    >
      {compact ? <ShieldMinus size={15} aria-hidden="true" /> : "Remove admin access"}
    </ConfirmAction>
  ) : (
    <ConfirmAction
      compact={compact}
      tone="good"
      tip={`Make ${who} an admin`}
      buttonClass="cb-btn cb-btn-primary"
      title={`Make ${who} an admin?`}
      body={
        <>
          <p>Admins can:</p>
          <ul>
            <li>see every learner&rsquo;s progress, answers and ratings</li>
            <li>read and triage all feedback</li>
            <li>upload the roster, reset or check off learners, and make or remove other admins</li>
          </ul>
          <p>Only do this if {who} should have that access.</p>
        </>
      }
      confirmLabel={`Yes, make ${name || "them"} an admin`}
      onConfirm={() => setAdminAction(email, true)}
    >
      {compact ? <ShieldPlus size={15} aria-hidden="true" /> : "Make admin"}
    </ConfirmAction>
  );
}
