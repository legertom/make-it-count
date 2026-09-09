import { cache } from "react";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { isAdminEmail, normalizeEmail } from "@/lib/access";
import { isDbAdmin, touchUser } from "@/lib/db/queries";

/** One role lookup per request, however many times auth() is called. */
const dbAdmin = cache(async (email: string) => {
  try {
    return await isDbAdmin(email);
  } catch (err) {
    console.error("[auth] admin lookup failed", err);
    return false;
  }
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, token }) {
      const email = normalizeEmail(token.email);
      if (email) session.user.email = email;
      // Admins come from ADMIN_EMAILS (config) or from a promotion in the admin UI (database).
      session.user.isAdmin = Boolean(email && (isAdminEmail(email) || (await dbAdmin(email))));
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      const email = normalizeEmail(user.email);
      if (!email) return;
      try {
        await touchUser({ email, name: user.name ?? null, image: user.image ?? null });
      } catch (err) {
        // Sign-in must not fail because the roster write did.
        console.error("[auth] could not record sign-in", err);
      }
    },
  },
});
