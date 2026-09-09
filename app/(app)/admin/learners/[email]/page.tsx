import Link from "next/link";
import { notFound } from "next/navigation";
import { ResetLearnerButton } from "@/components/admin/ResetLearnerButton";
import { PAGES, pageTitle } from "@/lib/course-pages";
import { getLearner, getProgress, learnerPageTimes, pageStats } from "@/lib/db/queries";
import { fmtDate, fmtDuration, initials } from "@/lib/format";
import { elapsedMs, progressLabel } from "@/lib/learning-stats";

export const dynamic = "force-dynamic";

export default async function LearnerDetailPage({ params }: PageProps<"/admin/learners/[email]">) {
  const { email: raw } = await params;
  const email = decodeURIComponent(raw).toLowerCase();
  const [l, times, stats, progress] = await Promise.all([
    getLearner(email),
    learnerPageTimes(email),
    pageStats(),
    getProgress(email),
  ]);
  if (!l) notFound();

  const p = progressLabel(l);
  const byKey = new Map(times.map((t) => [t.pageKey, t]));
  const avgByKey = new Map(stats.map((s) => [s.pageKey, s.avgMs]));
  const elapsed = elapsedMs(l);

  return (
    <>
      <Link href="/admin/learners" className="adm-back">&larr; All learners</Link>
      <h1 style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
        <span className="mic-avatar" style={{ width: 40, height: 40, fontSize: "0.95rem" }} aria-hidden="true">
          {l.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.image} alt="" referrerPolicy="no-referrer" />
          ) : (
            initials(l.name, l.email)
          )}
        </span>
        {l.name || l.email}
      </h1>
      <p className="adm-lede">{l.email}</p>

      <div className="adm-stats">
        <div className="adm-stat">
          <b>{l.completedAt ? "Completed" : p.state === "new" ? "Not started" : "In progress"}</b>
          <span>{l.completedAt ? fmtDate(l.completedAt, true) : p.state === "active" ? `${p.text} · ${pageTitle(l.furthestPage ?? "why-frame")}` : "Hasn't opened the course"}</span>
        </div>
        <div className="adm-stat"><b>{fmtDuration(l.activeMs)}</b><span>Active time in the course</span></div>
        <div className="adm-stat"><b>{fmtDuration(elapsed)}</b><span>{l.completedAt ? "Elapsed, start to finish" : "Elapsed since first visit"}</span></div>
        <div className="adm-stat"><b>{l.startedAt ? fmtDate(l.startedAt, true) : "—"}</b><span>Started</span></div>
        <div className="adm-stat"><b>{fmtDate(l.lastLoginAt, true)}</b><span>Last login ({l.loginCount} total)</span></div>
        <div className="adm-stat"><b>{fmtDate(l.lastSeenAt, true)}</b><span>Last active</span></div>
        <div className="adm-stat"><b>{fmtDate(l.createdAt)}</b><span>First sign-in</span></div>
        <div className="adm-stat"><b>{l.resetCount ?? 0}</b><span>Admin resets</span></div>
      </div>

      <div className="adm-detail">
        <div>
          <h2>Time on each page</h2>
          <div className="adm-tablewrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Page</th>
                  <th className="num">Visits</th>
                  <th className="num">Their time</th>
                  <th className="num">Everyone's avg</th>
                  <th>First seen</th>
                </tr>
              </thead>
              <tbody>
                {PAGES.map((pg) => {
                  const t = byKey.get(pg.key);
                  const reached = (l.furthestIndex ?? -1) >= pg.index;
                  return (
                    <tr key={pg.key} style={reached ? undefined : { opacity: 0.45 }}>
                      <td className="muted">{pg.index + 1}</td>
                      <td>
                        {pageTitle(pg.key)}
                        {l.currentPage === pg.key && !l.completedAt ? <span className="badge" data-status="new" style={{ marginLeft: "0.4rem" }}>current</span> : null}
                      </td>
                      <td className="num muted">{t?.visits ?? 0}</td>
                      <td className="num">{t ? fmtDuration(t.activeMs) : "—"}</td>
                      <td className="num muted">{fmtDuration(avgByKey.get(pg.key))}</td>
                      <td className="nowrap muted">{t ? fmtDate(t.firstSeen, true) : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div className="adm-card">
            <h3>Reset progress</h3>
            <p style={{ margin: "0 0 0.6rem", fontSize: "0.88rem", color: "var(--ink-2)" }}>
              Clears their page, answers, completion, and timings so they start fresh. Sign-in history stays.
            </p>
            <ResetLearnerButton email={l.email} name={l.name} />
          </div>
          <div className="adm-card">
            <h3>Course rating</h3>
            {l.rating ? (
              <>
                <p style={{ margin: "0 0 0.4rem", fontSize: "1.2rem", letterSpacing: "0.05em", color: "#F5B400" }} aria-label={`${l.rating} out of 5 stars`}>
                  {"★".repeat(l.rating)}<span style={{ color: "var(--line)" }}>{"★".repeat(5 - l.rating)}</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--ink-2)", marginLeft: "0.5rem", letterSpacing: 0 }}>{l.rating}/5 · {fmtDate(l.ratedAt, true)}</span>
                </p>
                <p className="adm-desc" style={{ margin: 0 }}>{l.ratingComment || <span className="muted">No written comment.</span>}</p>
              </>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>Not rated yet.</p>
            )}
          </div>
          <div className="adm-card">
            <h3>Answers and interactive state</h3>
            <pre className="adm-answers">{JSON.stringify(progress?.answers ?? {}, null, 2)}</pre>
          </div>
        </div>
      </div>
    </>
  );
}
