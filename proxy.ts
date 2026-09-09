import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Gate every page behind sign-in. The admin role is enforced where the
 * database is available (admin layout, server actions, CSV route), because
 * admins can be promoted from the UI, not only from ADMIN_EMAILS.
 * The eve agent routes (/eve/*) run their own auth walk, so they're excluded
 * from the matcher below.
 */
export default auth((req) => {
  const { pathname, search, origin } = req.nextUrl;
  const signedIn = Boolean(req.auth?.user);

  if (pathname === "/login") {
    return signedIn ? NextResponse.redirect(new URL("/", origin)) : NextResponse.next();
  }

  if (!signedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const url = new URL("/login", origin);
    if (pathname !== "/") url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|api/internal|eve/|_next/|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml|webmanifest)$).*)",
  ],
};
