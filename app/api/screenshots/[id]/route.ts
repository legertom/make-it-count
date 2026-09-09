import { auth } from "@/auth";
import { normalizeEmail } from "@/lib/access";
import { getScreenshot } from "@/lib/db/queries";

/** Serves a stored screenshot to its owner or to an admin. */
export async function GET(_req: Request, ctx: RouteContext<"/api/screenshots/[id]">) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return Response.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await ctx.params;
  const shot = await getScreenshot(id);
  if (!shot) return Response.json({ error: "Not found." }, { status: 404 });
  if (shot.ownerEmail !== email && !session?.user?.isAdmin) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }

  const bytes = Buffer.from(shot.data, "base64");
  return new Response(bytes, {
    headers: {
      "content-type": shot.mediaType,
      "content-length": String(bytes.byteLength),
      "cache-control": "private, max-age=3600",
    },
  });
}
