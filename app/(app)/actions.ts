"use server";

import { auth, signOut } from "@/auth";
import { normalizeEmail } from "@/lib/access";
import { clearCompletion, markComplete, saveRating } from "@/lib/db/queries";

async function requireEmail(): Promise<string> {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) throw new Error("Sign in required.");
  return email;
}

export async function markCompleteAction(): Promise<{ completedAt: string }> {
  const email = await requireEmail();
  const row = await markComplete(email);
  return { completedAt: (row.completedAt ?? new Date()).toISOString() };
}

export async function clearCompletionAction(): Promise<void> {
  const email = await requireEmail();
  await clearCompletion(email);
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function submitRatingAction(rating: number, comment: string): Promise<void> {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) throw new Error("Sign in required.");
  const stars = Math.round(Number(rating));
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) throw new Error("Rating must be 1 to 5.");
  const text = comment.trim().slice(0, 4000);
  await saveRating({ email, name: session?.user?.name ?? null, rating: stars, comment: text || null });
}
