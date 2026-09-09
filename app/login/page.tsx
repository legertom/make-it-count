import { devBypassEnabled } from "@/auth.config";
import { ALLOWED_DOMAIN } from "@/lib/access";
import { devSignInAction, googleSignInAction } from "./actions";

const ERRORS: Record<string, string> = {
  AccessDenied: `Only ${ALLOWED_DOMAIN} Google accounts can use this course. Pick your Clever account and try again.`,
  Configuration: "Google sign-in isn't configured yet. An admin needs to add AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.",
  CredentialsSignin: `That address isn't on ${ALLOWED_DOMAIN}.`,
  OAuthCallbackError: "Google didn't complete the sign-in. Try again.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const callbackUrl = typeof sp.callbackUrl === "string" ? sp.callbackUrl : "/";
  const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <main className="login">
      <div className="login-card">
        <div className="login-brand">Make It Count</div>
        <p className="login-sub">Using AI where it pays off. A short course for everyone at Clever.</p>

        {error && <p className="login-error" role="alert">{ERRORS[error] ?? "Sign-in failed. Try again."}</p>}

        <form action={googleSignInAction}>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <button type="submit" className="login-google" disabled={!googleConfigured}>
            <GoogleMark />
            Continue with Google
          </button>
        </form>
        <p className="login-note">
          {googleConfigured
            ? `Sign in with your @${ALLOWED_DOMAIN} account.`
            : "Google sign-in is not configured on this environment yet."}
        </p>

        {devBypassEnabled && (
          <form action={devSignInAction} className="login-dev">
            <h3>Local dev sign-in</h3>
            <p>Only shown when AUTH_DEV_BYPASS=1 and not in production. Any @{ALLOWED_DOMAIN} address works.</p>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <input className="mic-input" name="email" type="email" placeholder={`you@${ALLOWED_DOMAIN}`} required />
            <input className="mic-input" name="name" type="text" placeholder="Display name (optional)" />
            <button type="submit" className="cb-btn cb-btn-soft">Sign in as this person</button>
          </form>
        )}
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.5-4.1 7-10.2 7-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C1 16.4 0 20.1 0 24s1 7.6 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.6-5.9c-2.1 1.4-4.8 2.3-8 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
