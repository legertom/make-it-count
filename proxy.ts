import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Gate every page behind sign-in, and /admin behind the admin role.
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

  if (pathname.startsWith("/admin") && !req.auth?.user?.isAdmin) {
    return NextResponse.redirect(new URL("/?denied=admin", origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|api/internal|eve/|_next/|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml|webmanifest)$).*)",
  ],
};
