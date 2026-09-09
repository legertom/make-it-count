"use server";

import { signIn } from "@/auth";
import { devBypassEnabled } from "@/auth.config";

function safeCallback(raw: FormDataEntryValue | null): string {
  const v = typeof raw === "string" ? raw : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

export async function googleSignInAction(formData: FormData) {
  await signIn("google", { redirectTo: safeCallback(formData.get("callbackUrl")) });
}

export async function devSignInAction(formData: FormData) {
  if (!devBypassEnabled) throw new Error("Dev sign-in is disabled.");
  await signIn("dev", {
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    redirectTo: safeCallback(formData.get("callbackUrl")),
  });
}
