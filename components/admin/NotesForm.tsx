"use client";

import { useState, useTransition } from "react";
import { saveAdminNotesAction } from "@/app/(app)/admin/actions";

export function NotesForm({ id, initial }: { id: string; initial: string }) {
  const [notes, setNotes] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div>
      <textarea
        className="mic-input"
        rows={4}
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        placeholder="Internal notes for other admins"
      />
      <div className="adm-actions">
        <button
          type="button"
          className="cb-btn cb-btn-soft"
          disabled={pending || notes === initial}
          onClick={() =>
            start(async () => {
              await saveAdminNotesAction(id, notes);
              setSaved(true);
            })
          }
        >
          {pending ? "Saving…" : "Save notes"}
        </button>
        {saved && <span className="adm-saved">Saved</span>}
      </div>
    </div>
  );
}
