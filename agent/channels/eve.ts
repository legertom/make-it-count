import { eveChannel } from "eve/channels/eve";
import { localDev, type AuthFn } from "eve/channels/auth";
import { decode } from "@auth/core/jwt";

/**
 * Route auth for the feedback agent.
 *
 * The browser talks to the agent on the same origin as the app, so every
 * request carries the Auth.js session cookie. We decode that cookie here (it is
 * an encrypted JWT keyed by AUTH_SECRET) and turn it into an eve user
 * principal, which the submit_feedback tool uses as the submitter identity.
 *
 * `localDev()` only ever accepts requests while running under `eve dev`, so a
 * production deployment with no valid cookie gets a 401.
 */

const COOKIE_NAMES = ["__Secure-authjs.session-token", "authjs.session-token"] as const;

function parseCookies(header: string | null): Map<string, string> {
  const out = new Map<string, string>();
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const name = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    try {
      out.set(name, decodeURIComponent(value));
    } catch {
      out.set(name, value);
    }
  }
  return out;
}

/** Auth.js splits large JWTs into `name.0`, `name.1`, ... chunks. */
function readSessionToken(cookies: Map<string, string>): { name: string; token: string } | null {
  for (const name of COOKIE_NAMES) {
    const whole = cookies.get(name);
    if (whole) return { name, token: whole };
    const chunks: string[] = [];
    for (let i = 0; ; i++) {
      const c = cookies.get(`${name}.${i}`);
      if (c === undefined) break;
      chunks.push(c);
    }
    if (chunks.length) return { name, token: chunks.join("") };
  }
  return null;
}

type SessionClaims = {
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  isAdmin?: boolean;
};

function appSession(): AuthFn<Request> {
  return async (request) => {
    const secret = process.env.AUTH_SECRET;
    if (!secret) return null;
    const found = readSessionToken(parseCookies(request.headers.get("cookie")));
    if (!found) return null;

    let claims: SessionClaims | null = null;
    try {
      claims = await decode<SessionClaims>({ token: found.token, secret, salt: found.name });
    } catch {
      return null;
    }
    const email = claims?.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) return null;

    return {
      authenticator: "app",
      principalId: email,
      principalType: "user",
      attributes: {
        email,
        name: claims?.name ?? "",
        isAdmin: claims?.isAdmin ? "true" : "false",
      },
    };
  };
}

export default eveChannel({
  auth: [appSession(), localDev()],
});
