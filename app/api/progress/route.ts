import { z } from "zod";
import { auth } from "@/auth";
import { normalizeEmail } from "@/lib/access";
import { PAGE_COUNT, PAGES } from "@/lib/course-pages";
import { markSeen, recordPageView, saveProgress } from "@/lib/db/queries";

const MAX_ACTIVE_MS = 30 * 60 * 1000; // anything longer is an idle tab, not learning

const bodySchema = z.object({
  /** Page the learner just left. Omitted when only syncing state. */
  leftPage: z.string().optional(),
  activeMs: z.number().min(0).optional(),
  currentPage: z.string(),
  furthestIndex: z.number().int().min(0).max(PAGE_COUNT - 1),
  answers: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Learner telemetry. Called on every course page change and on tab close
 * (via sendBeacon, hence the tolerant body parsing).
 */
export async function POST(req: Request) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return Response.json({ error: "Sign in required." }, { status: 401 });

  let raw: unknown;
  try {
    raw = JSON.parse(await req.text());
  } catch {
    return Response.json({ error: "Bad JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "Invalid body.", issues: parsed.error.issues }, { status: 400 });
  }
  const body = parsed.data;
  const known = (k: string) => PAGES.some((p) => p.key === k);
  if (!known(body.currentPage)) return Response.json({ error: "Unknown page." }, { status: 400 });

  if (body.leftPage && known(body.leftPage) && typeof body.activeMs === "number") {
    await recordPageView({
      email,
      pageKey: body.leftPage,
      activeMs: Math.min(body.activeMs, MAX_ACTIVE_MS),
      leftAt: new Date(),
    });
  }

  await saveProgress({
    email,
    currentPage: body.currentPage,
    furthestIndex: body.furthestIndex,
    furthestPage: PAGES[body.furthestIndex]?.key ?? body.currentPage,
    answers: body.answers,
  });
  await markSeen({ email, name: session?.user?.name ?? null, image: session?.user?.image ?? null });

  return new Response(null, { status: 204 });
}
