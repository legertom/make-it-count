"use client";

import { useActionState } from "react";
import { uploadRosterAction } from "@/app/(app)/admin/actions";

/** Upload the HR employee roster export; it replaces the current roster. */
export function RosterUpload() {
  const [result, action, pending] = useActionState(uploadRosterAction, null);
  return (
    <form action={action} className="adm-addadmin">
      <input className="mic-input" type="file" name="file" accept=".csv,text/csv" aria-label="Employee roster CSV" required />
      <button type="submit" className="cb-btn cb-btn-soft" disabled={pending}>
        {pending ? "Uploading…" : "Upload roster"}
      </button>
      {result?.ok && (
        <span className="adm-saved">
          Roster updated: {result.count} people{result.skipped ? `, skipped ${result.skipped} ${result.skipped === 1 ? "row" : "rows"} without an email` : ""}.
        </span>
      )}
      {result && !result.ok && <span className="adm-error">{result.error}</span>}
    </form>
  );
}
