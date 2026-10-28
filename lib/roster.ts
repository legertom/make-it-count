import { normalizeEmail } from "@/lib/access";
import type { EmployeeInput } from "@/lib/db/queries";

/** RFC 4180-ish: quoted fields, doubled quotes, commas and newlines inside quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim()));
}

export type RosterParse = { rows: EmployeeInput[]; skipped: number };

/**
 * Read the HR roster export (employee_id, first_name, last_name, display_name, email,
 * title, department, site, start_date, manager_name, manager_email, ...). Only `email`
 * is required; a name comes from display_name, else first + last, else the email.
 */
export function parseRoster(text: string): RosterParse {
  const [header, ...body] = parseCsv(text);
  if (!header) throw new Error("That file is empty.");
  const cols = header.map((h) => h.trim().toLowerCase());
  const at = (name: string) => cols.indexOf(name);
  if (at("email") < 0) throw new Error("No “email” column. Upload the employee roster export as CSV.");

  const byEmail = new Map<string, EmployeeInput>();
  let skipped = 0;
  for (const r of body) {
    const get = (name: string) => {
      const i = at(name);
      const v = i < 0 ? "" : (r[i] ?? "").trim();
      return v || null;
    };
    const email = normalizeEmail(get("email"));
    if (!email) {
      skipped++;
      continue;
    }
    const first = get("preferred_first_name") ?? get("first_name");
    const full = [first, get("last_name")].filter(Boolean).join(" ");
    byEmail.set(email, {
      email,
      employeeId: get("employee_id"),
      name: get("display_name") ?? (full || email),
      title: get("title"),
      department: get("department"),
      site: get("site"),
      startDate: get("start_date"),
      managerName: get("manager_name"),
      managerEmail: normalizeEmail(get("manager_email")),
    });
  }
  return { rows: [...byEmail.values()], skipped };
}
