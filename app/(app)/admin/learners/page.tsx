import Link from "next/link";
import { ResetLearnerButton } from "@/components/admin/ResetLearnerButton";
import { pageTitle } from "@/lib/course-pages";
import { listLearners, pageStats } from "@/lib/db/queries";
import { fmtDate, fmtDuration, initials, timeAgo } from "@/lib/format";
import { elapsedMs, overview, pageRows, progressLabel } from "@/lib/learning-stats";

export const dynamic = "force-dynamic";

export default async function LearnersPage() {
  const [learners, stats] = await Promise.all([listLearners(), pageStats()]);
  const o = overview(learners);
  const pages = pageRows(learners, stats);

  return (
    <>
      <h1>Learners</h1>
      <p className="adm-lede">
        Who has signed in, how far they've gotten, who has finished, and how long each page takes. Active time counts
        only while the course tab is visible; elapsed time is first visit to completion.
      </p>

      <div className="adm-stats">
        <div className="adm-stat"><b>{o.signedIn}</b><span>Signed in</span></div>
        <div className="adm-stat"><b>{o.started}</b><span>Started</span></div>
        <div className="adm-stat"><b>{o.completed}</b><span>Completed</span></div>
        <div className="adm-stat"><b>{Math.round(o.completionRate * 100)}%</b><span>Completion rate</span></div>
        <div className="adm-stat"><b>{fmtDuration(o.avgActiveMsToComplete)}</b><span>Avg active time to finish</span></div>
        <div className="adm-stat"><b>{fmtDuration(o.medianActiveMsToComplete)}</b><span>Median active time</span></div>
        <div className="adm-stat"><b>{fmtDuration(o.avgElapsedMsToComplete)}</b><span>Avg elapsed to finish</span></div>
        <div className="adm-stat"><b>{o.activeLast7d}</b><span>Active in last 7 days</span></div>
      </div>

      <h2>Roster</h2>
      <p className="adm-lede" style={{ fontSize: "0.88rem" }}>
        <a href="/admin/learners.csv">Download as CSV</a>
      </p>
      <div className="adm-tablewrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Progress</th>
              <th>Status</th>
              <th className="num">Active time</th>
              <th className="num">Elapsed</th>
              <th>Last login</th>
              <th>Last active</th>
              <th className="num">Logins</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {learners.length === 0 && (
              <tr><td colSpan={9} className="adm-empty">Nobody has signed in yet.</td></tr>
            )}
            {learners.map((l) => {
              const p = progressLabel(l);
              const elapsed = elapsedMs(l);
              return (
                <tr key={l.email}>
                  <td>
                    <Link href={`/admin/learners/${encodeURIComponent(l.email)}`} className="adm-person">
                      <span className="mic-avatar" aria-hidden="true">
                        {l.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.image} alt="" referrerPolicy="no-referrer" />
                        ) : (
                          initials(l.name, l.email)
                        )}
                      </span>
                      <span>
                        {l.name || l.email}
                        {l.name && <small>{l.email}</small>}
                      </span>
                    </Link>
                  </td>
                  <td>
                    <div className="adm-bar" title={p.text}><i style={{ width: `${Math.round(p.pct * 100)}%` }} /></div>
                    <small className="muted">
                      {p.state === "active" ? `${p.text} · ${pageTitle(l.furthestPage ?? "why-frame")}` : p.text}
                      {l.resetCount ? ` · reset ×${l.resetCount}` : ""}
                    </small>
                  </td>
                  <td>
                    {l.completedAt ? (
                      <><span className="badge" data-done="true">Completed</span><br /><small className="muted">{fmtDate(l.completedAt, true)}</small></>
                    ) : (
                      <span className="badge" data-done="false">{p.state === "new" ? "Not started" : "In progress"}</span>
                    )}
                  </td>
                  <td className="num">{fmtDuration(l.activeMs)}</td>
                  <td className="num muted">{l.completedAt ? fmtDuration(elapsed) : l.startedAt ? `${fmtDuration(elapsed)} so far` : "—"}</td>
                  <td className="nowrap muted" title={fmtDate(l.lastLoginAt, true)}>{timeAgo(l.lastLoginAt)}</td>
                  <td className="nowrap muted" title={fmtDate(l.lastSeenAt, true)}>{timeAgo(l.lastSeenAt)}</td>
                  <td className="num muted">{l.loginCount}</td>
                  <td className="nowrap">{l.startedAt && <ResetLearnerButton email={l.email} name={l.name} compact />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>Time per page</h2>
      <p className="adm-lede" style={{ fontSize: "0.88rem" }}>
        Reach is the share of people who started the course and got at least this far. Time is per visit, so a page
        someone returns to counts each visit.
      </p>
      <div className="adm-tablewrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Page</th>
              <th>Reach</th>
              <th className="num">Reached</th>
              <th className="num">Visits</th>
              <th className="num">Avg time</th>
              <th className="num">Median time</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.key}>
                <td className="muted">{p.index + 1}</td>
                <td>{pageTitle(p.key)}<br /><small className="muted">{p.key}</small></td>
                <td><div className="adm-bar"><i style={{ width: `${Math.round(p.reachedPct * 100)}%` }} /></div></td>
                <td className="num">{p.reached} <span className="muted">({Math.round(p.reachedPct * 100)}%)</span></td>
                <td className="num muted">{p.views}</td>
                <td className="num">{fmtDuration(p.avgMs)}</td>
                <td className="num muted">{fmtDuration(p.medianMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
