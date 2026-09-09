import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createFeedback, getScreenshot } from "@/lib/db/queries";
import { feedbackInputSchema } from "@/lib/feedback-input";

const bodySchema = feedbackInputSchema.extend({
  submittedBy: z.string().email(),
  submitterName: z.string().max(200).optional().nullable(),
  agentSessionId: z.string().max(200).optional().nullable(),
  userAgent: z.string().max(1000).optional().nullable(),
});

function secretMatches(header: string | null): boolean {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Called by the eve feedback agent's `submit_feedback` tool. The agent runs as
 * its own service, so it authenticates with a shared secret rather than a
 * browser session. The submitter identity comes from the agent's verified
 * session principal.
 */
export async function POST(req: Request) {
  if (!secretMatches(req.headers.get("x-internal-secret"))) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid body.", issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;
  const submittedBy = input.submittedBy.toLowerCase();

  let screenshotId: string | null = null;
  if (input.screenshotId) {
    const shot = await getScreenshot(input.screenshotId);
    if (shot && shot.ownerEmail === submittedBy) screenshotId = shot.id;
  }

  const row = await createFeedback({
    type: input.type,
    title: input.title,
    description: input.description,
    page: input.page ?? null,
    coursePage: input.coursePage ?? null,
    userAgent: input.userAgent ?? null,
    submittedBy,
    submitterName: input.submitterName ?? null,
    screenshotId,
    source: "agent",
    agentSessionId: input.agentSessionId ?? null,
  });
  return Response.json({ id: row.id, screenshotAttached: Boolean(screenshotId) });
}
