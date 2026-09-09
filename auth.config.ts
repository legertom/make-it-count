import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { ALLOWED_DOMAIN, isAdminEmail, isAllowedEmail, normalizeEmail } from "@/lib/access";

/**
 * Auth.js configuration that is safe to import from `proxy.ts` (no database).
 * `auth.ts` layers the database-touching events on top of this.
 */
export const devBypassEnabled =
  process.env.AUTH_DEV_BYPASS === "1" && process.env.NODE_ENV !== "production";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Google({
      authorization: {
        params: {
          // Ask Google to only offer accounts on our Workspace domain. This is a
          // UX hint; the signIn callback below is the real enforcement.
          hd: ALLOWED_DOMAIN,
          prompt: "select_account",
        },
      },
    }),
    ...(devBypassEnabled
      ? [
          Credentials({
            id: "dev",
            name: "Dev sign-in",
            credentials: {
              email: { label: "Email" },
              name: { label: "Name" },
            },
            async authorize(credentials) {
              const email = normalizeEmail(String(credentials?.email ?? ""));
              if (!email || !isAllowedEmail(email)) return null;
              const name = String(credentials?.name ?? "").trim() || email.split("@")[0];
              return { id: email, email, name };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === "google") {
        return Boolean(profile?.email_verified) && isAllowedEmail(profile?.email);
      }
      if (account?.provider === "dev") {
        return devBypassEnabled && isAllowedEmail(user.email);
      }
      return false;
    },
    async jwt({ token, user }) {
      if (user?.email) token.email = normalizeEmail(user.email);
      token.isAdmin = isAdminEmail(token.email);
      return token;
    },
    async session({ session, token }) {
      if (token.email) session.user.email = token.email;
      session.user.isAdmin = Boolean(token.isAdmin);
      return session;
    },
  },
} satisfies NextAuthConfig;
