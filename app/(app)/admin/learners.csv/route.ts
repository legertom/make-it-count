import { auth } from "@/auth";
import { pageTitle } from "@/lib/course-pages";
import { listLearners } from "@/lib/db/queries";
import { progressLabel } from "@/lib/learning-stats";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) return new Response("Admins only.", { status: 403 });

  const learners = await listLearners();
  const header = [
    "email", "name", "status", "furthest_page", "furthest_page_title", "pages_reached",
    "started_at", "completed_at", "active_seconds", "elapsed_seconds_to_complete",
    "first_sign_in", "last_login", "last_active", "login_count", "admin_resets",
    "rating", "rating_comment", "rated_at",
  ];
  const lines = learners.map((l) => {
    const p = progressLabel(l);
    const elapsed = l.completedAt && l.startedAt ? Math.round((l.completedAt.getTime() - l.startedAt.getTime()) / 1000) : "";
    return [
      l.email, l.name ?? "", l.completedAt ? "completed" : p.state === "new" ? "not_started" : "in_progress",
      l.furthestPage ?? "", l.furthestPage ? pageTitle(l.furthestPage) : "", l.startedAt ? (l.furthestIndex ?? 0) + 1 : 0,
      l.startedAt?.toISOString() ?? "", l.completedAt?.toISOString() ?? "", Math.round(l.activeMs / 1000), elapsed,
      l.createdAt.toISOString(), l.lastLoginAt.toISOString(), l.lastSeenAt.toISOString(), l.loginCount, l.resetCount ?? 0,
      l.rating ?? "", l.ratingComment ?? "", l.ratedAt?.toISOString() ?? "",
    ].map(csvCell).join(",");
  });
  const body = [header.join(","), ...lines].join("\n");
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="make-it-count-learners-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
