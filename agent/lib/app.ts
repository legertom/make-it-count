/**
 * The agent runs as its own service, so it reaches the app over HTTP.
 * Locally that is the Next dev server; on Vercel it is the production URL.
 */
export function appBaseUrl(): string {
  const explicit = process.env.APP_INTERNAL_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export async function internalPost<T>(path: string, body: unknown): Promise<T> {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error("INTERNAL_API_SECRET is not set, so the agent cannot write feedback.");
  }
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-internal-secret": secret,
  };
  // Lets the agent through Vercel Deployment Protection on preview deployments.
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypass) headers["x-vercel-protection-bypass"] = bypass;

  const res = await fetch(`${appBaseUrl()}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`App API ${path} responded ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}
