"use server";

import { auth, signOut } from "@/auth";
import { normalizeEmail } from "@/lib/access";
import { clearCompletion, markComplete } from "@/lib/db/queries";

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
