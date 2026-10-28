"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { FEEDBACK_STATUSES, type FeedbackStatus } from "@/lib/db/schema";
import { getEmployee, markCompleteByAdmin, replaceEmployees, resetProgress, setAdmin, updateFeedback } from "@/lib/db/queries";
import { parseRoster } from "@/lib/roster";
import { isAdminEmail, isAllowedEmail, normalizeEmail } from "@/lib/access";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("Admins only.");
  return session;
}

export async function updateFeedbackStatusAction(id: string, status: string) {
  await requireAdmin();
  if (!FEEDBACK_STATUSES.includes(status as FeedbackStatus)) throw new Error("Bad status.");
  await updateFeedback(id, { status: status as FeedbackStatus });
  revalidatePath("/admin");
  revalidatePath(`/admin/feedback/${id}`);
}

export async function saveAdminNotesAction(id: string, notes: string) {
  await requireAdmin();
  await updateFeedback(id, { adminNotes: notes.trim() || null });
  revalidatePath(`/admin/feedback/${id}`);
}

export async function resetLearnerAction(email: string) {
  await requireAdmin();
  await resetProgress(email.toLowerCase());
  revalidatePath("/admin/learners");
  revalidatePath(`/admin/learners/${encodeURIComponent(email)}`);
}

export async function setAdminAction(email: string, makeAdmin: boolean) {
  const session = await requireAdmin();
  const target = normalizeEmail(email);
  if (!target || !isAllowedEmail(target)) throw new Error("Admins must have a Clever address.");
  const me = normalizeEmail(session.user.email);
  if (!makeAdmin && target === me) throw new Error("You can't remove your own admin access.");
  if (!makeAdmin && isAdminEmail(target)) {
    throw new Error("That admin is set in the ADMIN_EMAILS configuration and can't be removed here.");
  }
  await setAdmin(target, makeAdmin);
  revalidatePath("/admin/learners");
  revalidatePath(`/admin/learners/${encodeURIComponent(target)}`);
}

/** Check off someone who finished the course outside the app. No timing is recorded. */
export async function markLearnerCompleteAction(email: string) {
  const session = await requireAdmin();
  const target = normalizeEmail(email);
  if (!target || !isAllowedEmail(target)) throw new Error("Only Clever addresses can take the course.");
  const employee = await getEmployee(target);
  await markCompleteByAdmin(target, employee?.name ?? null, normalizeEmail(session.user.email) ?? "admin");
  revalidatePath("/admin/learners");
  revalidatePath(`/admin/learners/${encodeURIComponent(target)}`);
}

export type RosterUploadResult = { ok: true; count: number; skipped: number } | { ok: false; error: string };

/** Replace the employee roster with an uploaded HR export (CSV). */
export async function uploadRosterAction(_prev: RosterUploadResult | null, form: FormData): Promise<RosterUploadResult> {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a CSV file first." };
  try {
    const { rows, skipped } = parseRoster(await file.text());
    if (!rows.length) return { ok: false, error: "No rows with an email address in that file." };
    await replaceEmployees(rows);
    revalidatePath("/admin/learners");
    return { ok: true, count: rows.length, skipped };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't read that file." };
  }
}
