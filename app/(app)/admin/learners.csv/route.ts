import { auth } from "@/auth";
import { furthestIndexOf, pageTitle } from "@/lib/course-pages";
import { listEmployees, listLearners } from "@/lib/db/queries";
import { isAdminEmail } from "@/lib/access";
import { staffEntries, statusOf } from "@/lib/learning-stats";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) return new Response("Admins only.", { status: 403 });

  const [learners, employees] = await Promise.all([listLearners(), listEmployees()]);
  const header = [
    "email", "name", "on_roster", "department", "title", "manager", "site", "status", "marked_complete_by", "furthest_page", "furthest_page_title", "pages_reached",
    "started_at", "completed_at", "active_seconds", "elapsed_seconds_to_complete",
    "first_sign_in", "last_login", "last_active", "login_count", "admin_resets",
    "rating", "rating_comment", "rated_at", "is_admin",
  ];
  const lines = staffEntries(employees, learners).map(({ email, employee: e, learner: l }) => {
    const roster = [e ? "yes" : "", e?.department ?? "", e?.title ?? "", e?.managerName ?? "", e?.site ?? ""];
    if (!l) {
      return [email, e?.name ?? "", ...roster, "not_started", ...Array(header.length - 8).fill("")].map(csvCell).join(",");
    }
    const elapsed = l.completedAt && l.startedAt && !l.markedCompleteBy ? Math.round((l.completedAt.getTime() - l.startedAt.getTime()) / 1000) : "";
    const signedIn = l.loginCount > 0;
    return [
      l.email, l.name ?? e?.name ?? "", ...roster, statusOf(l), l.markedCompleteBy ?? "",
      l.furthestPage ?? "", l.furthestPage ? pageTitle(l.furthestPage) : "", l.startedAt ? furthestIndexOf(l) + 1 : 0,
      l.startedAt?.toISOString() ?? "", l.completedAt?.toISOString() ?? "", l.markedCompleteBy ? "" : Math.round(l.activeMs / 1000), elapsed,
      signedIn ? l.createdAt.toISOString() : "", signedIn ? l.lastLoginAt.toISOString() : "", signedIn ? l.lastSeenAt.toISOString() : "", l.loginCount, l.resetCount ?? 0,
      l.rating ?? "", l.ratingComment ?? "", l.ratedAt?.toISOString() ?? "", l.isAdmin || isAdminEmail(l.email) ? "yes" : "",
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
