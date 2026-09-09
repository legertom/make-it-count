/**
 * Who may sign in, and who is an admin.
 *
 * Both rules are driven by env vars so they can differ between local dev,
 * preview, and production without a code change:
 *   ALLOWED_EMAIL_DOMAIN  – Google Workspace domain allowed to sign in (clever.com)
 *   ADMIN_EMAILS          – comma-separated list of admins (see .env.example)
 */
export const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN ?? "clever.com")
  .trim()
  .toLowerCase();

export function normalizeEmail(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return e.includes("@") ? e : null;
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  const e = normalizeEmail(email);
  return Boolean(e && e.endsWith(`@${ALLOWED_DOMAIN}`));
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const e = normalizeEmail(email);
  return Boolean(e && adminEmails().includes(e));
}
