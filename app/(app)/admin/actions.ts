"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { FEEDBACK_STATUSES, type FeedbackStatus } from "@/lib/db/schema";
import { resetProgress, updateFeedback } from "@/lib/db/queries";

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
