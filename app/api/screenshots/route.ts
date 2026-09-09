import { z } from "zod";
import { auth } from "@/auth";
import { normalizeEmail } from "@/lib/access";
import { createScreenshot } from "@/lib/db/queries";

const MAX_BYTES = 6 * 1024 * 1024; // ~6 MB of base64

const bodySchema = z.object({
  dataUrl: z.string().startsWith("data:image/"),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  page: z.string().max(500).optional(),
});

/** Stores an annotated screenshot and returns its id for the feedback record. */
export async function POST(req: Request) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return Response.json({ error: "Sign in required." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid body." }, { status: 400 });

  const { dataUrl, width, height, page } = parsed.data;
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return Response.json({ error: "Expected a base64 PNG/JPEG/WebP." }, { status: 400 });
  const [, mediaType, data] = match;
  if (data.length > MAX_BYTES) {
    return Response.json({ error: "Screenshot is too large." }, { status: 413 });
  }

  const id = await createScreenshot({
    ownerEmail: email,
    mediaType,
    data,
    width: width ?? null,
    height: height ?? null,
    page: page ?? null,
  });
  return Response.json({ id });
}
