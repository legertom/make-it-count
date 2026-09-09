import { auth } from "@/auth";
import { normalizeEmail } from "@/lib/access";
import { createFeedback, getScreenshot } from "@/lib/db/queries";
import { feedbackInputSchema } from "@/lib/feedback-input";

/** Direct (no-chat) feedback submission from the feedback panel. */
export async function POST(req: Request) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return Response.json({ error: "Sign in required." }, { status: 401 });

  const parsed = feedbackInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid body.", issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;

  if (input.screenshotId) {
    const shot = await getScreenshot(input.screenshotId);
    if (!shot || shot.ownerEmail !== email) {
      return Response.json({ error: "Unknown screenshot." }, { status: 400 });
    }
  }

  const row = await createFeedback({
    type: input.type,
    title: input.title,
    description: input.description,
    page: input.page ?? null,
    coursePage: input.coursePage ?? null,
    userAgent: req.headers.get("user-agent"),
    submittedBy: email,
    submitterName: session?.user?.name ?? null,
    screenshotId: input.screenshotId ?? null,
    source: "form",
    agentSessionId: null,
  });
  return Response.json({ id: row.id });
}
