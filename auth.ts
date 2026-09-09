import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { normalizeEmail } from "@/lib/access";
import { touchUser } from "@/lib/db/queries";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
