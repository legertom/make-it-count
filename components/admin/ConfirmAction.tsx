"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";

type Props = {
  /** Trigger: an icon button with a hover tip (`compact`), or a full-size button. */
  compact?: boolean;
  /** Hover tip and accessible name for the compact trigger. */
  tip: string;
  /** Full-size trigger text, or the icon for the compact one. */
  children: ReactNode;
  /** Full-size trigger style, e.g. "cb-btn cb-btn-primary". */
  buttonClass?: string;
  /** Compact trigger hover colour. */
  tone?: "good" | "danger";
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<unknown>;
};

/**
 * A button that asks first, in an in-page dialog rather than window.confirm (which browsers
 * let people silence). The dialog stays open with the error if the action fails.
 */
export function ConfirmAction({ compact = false, tip, children, buttonClass, tone, title, body, confirmLabel, danger = false, onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setError(null);
    ref.current?.showModal();
  };
  const confirm = () =>
    start(async () => {
      try {
        await onConfirm();
        ref.current?.close();
      } catch (err) {
        setError(err instanceof Error ? err.message : "That didn't work. Try again.");
      }
    });

  return (
    <>
      {compact ? (
        <button type="button" className="adm-iconbtn" data-tone={tone} data-tip={tip} aria-label={tip} disabled={pending} onClick={open}>
          {children}
        </button>
      ) : (
        <button type="button" className={buttonClass ?? "cb-btn cb-btn-soft"} disabled={pending} onClick={open}>
          {children}
        </button>
      )}
      <dialog ref={ref} className="adm-dialog" onClick={(e) => e.target === ref.current && !pending && ref.current?.close()}>
        <h3>{title}</h3>
        <div className="adm-dialog-body">{body}</div>
        {error && <p className="adm-error">{error}</p>}
        <div className="adm-dialog-actions">
          <button type="button" className="cb-btn cb-btn-ghost" disabled={pending} onClick={() => ref.current?.close()} autoFocus>
            Cancel
          </button>
          <button type="button" className={danger ? "cb-btn cb-btn-danger" : "cb-btn cb-btn-primary"} disabled={pending} onClick={confirm}>
            {pending ? "Saving…" : confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}

/** A non-clickable icon in the actions column, with the same hover tip. */
export function StaticIcon({ tip, color, children }: { tip: string; color?: string; children: ReactNode }) {
  return (
    <span className="adm-iconbtn" data-static="true" data-tip={tip} aria-label={tip} role="img" tabIndex={0} style={color ? { color } : undefined}>
      {children}
    </span>
  );
}
