"use client";

import { useState, useTransition } from "react";
import { setAdminAction } from "@/app/(app)/admin/actions";

/** Grant admin to a Clever address, whether or not they've signed in yet. */
export function AddAdminForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="adm-addadmin"
      onSubmit={(e) => {
        e.preventDefault();
        const target = email.trim().toLowerCase();
        if (!target) return;
        setMsg(null);
        start(async () => {
          try {
            await setAdminAction(target, true);
            setMsg({ ok: true, text: `${target} is now an admin.` });
            setEmail("");
          } catch (err) {
            setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't add that admin." });
          }
        });
      }}
    >
      <input
        className="mic-input"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="name@clever.com"
        aria-label="Email address to make admin"
        required
      />
      <button type="submit" className="cb-btn cb-btn-soft" disabled={pending || !email.trim()}>
        {pending ? "Adding…" : "Add admin"}
      </button>
      {msg && <span className={msg.ok ? "adm-saved" : "adm-error"}>{msg.text}</span>}
    </form>
  );
}
