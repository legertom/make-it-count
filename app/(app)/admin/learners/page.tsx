import Link from "next/link";
import { ResetLearnerButton } from "@/components/admin/ResetLearnerButton";
import { SortableTable, type SortableRow } from "@/components/admin/SortableTable";
import { pageTitle } from "@/lib/course-pages";
import { listLearners, listRatings, pageStats } from "@/lib/db/queries";
import { fmtDate, fmtDuration, initials, timeAgo } from "@/lib/format";
import { elapsedMs, overview, pageRows, progressLabel } from "@/lib/learning-stats";

export const dynamic = "force-dynamic";

export default async function LearnersPage() {
  const [learners, stats, ratings] = await Promise.all([listLearners(), pageStats(), listRatings()]);
  const o = overview(learners);
  const pages = pageRows(learners, stats);

  const rosterRows: SortableRow[] = learners.map((l) => {
    const p = progressLabel(l);
    const elapsed = elapsedMs(l);
    const statusRank = l.completedAt ? 2 : p.state === "active" ? 1 : 0;
    return {
      id: l.email,
      sort: {
        person: (l.name || l.email).toLowerCase(),
        progress: l.completedAt ? 1000 : (l.furthestIndex ?? -1),
        status: statusRank,
        active: l.activeMs,
        elapsed,
        lastLogin: l.lastLoginAt.getTime(),
        lastActive: l.lastSeenAt.getTime(),
        logins: l.loginCount,
        rating: l.rating ?? -1,
      },
      cells: [
        <Link key="p" href={`/admin/learners/${encodeURIComponent(l.email)}`} className="adm-person">
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
        </Link>,
        <span key="pr">
          <span className="adm-bar" title={p.text}><i style={{ width: `${Math.round(p.pct * 100)}%` }} /></span>
          <small className="muted" style={{ display: "block" }}>
            {p.state === "active" ? `${p.text} · ${pageTitle(l.furthestPage ?? "why-frame")}` : p.text}
            {l.resetCount ? ` · reset ×${l.resetCount}` : ""}
          </small>
        </span>,
        l.completedAt ? (
          <span key="s"><span className="badge" data-done="true">Completed</span><br /><small className="muted">{fmtDate(l.completedAt, true)}</small></span>
        ) : (
          <span key="s" className="badge" data-done="false">{p.state === "new" ? "Not started" : "In progress"}</span>
        ),
        fmtDuration(l.activeMs),
        <span key="e" className="muted">{l.completedAt ? fmtDuration(elapsed) : l.startedAt ? `${fmtDuration(elapsed)} so far` : "—"}</span>,
        <span key="ll" className="nowrap muted" title={fmtDate(l.lastLoginAt, true)}>{timeAgo(l.lastLoginAt)}</span>,
        <span key="la" className="nowrap muted" title={fmtDate(l.lastSeenAt, true)}>{timeAgo(l.lastSeenAt)}</span>,
        <span key="lg" className="muted">{l.loginCount}</span>,
        <span key="rt" className="nowrap" title={l.ratingComment ?? undefined}>{l.rating ? <Stars n={l.rating} /> : <span className="muted">—</span>}</span>,
        <span key="r" className="nowrap">{l.startedAt && <ResetLearnerButton email={l.email} name={l.name} compact />}</span>,
      ],
    };
  });

  const pageTableRows: SortableRow[] = pages.map((p) => ({
    id: p.key,
    sort: {
      n: p.index,
      page: p.index,
      reach: p.reachedPct,
      reached: p.reached,
      visits: p.views,
      avg: p.avgMs,
      median: p.medianMs,
    },
    cells: [
      <span key="n" className="muted">{p.index + 1}</span>,
      <span key="t">{pageTitle(p.key)}<br /><small className="muted">{p.key}</small></span>,
      <span key="b" className="adm-bar"><i style={{ width: `${Math.round(p.reachedPct * 100)}%` }} /></span>,
      <span key="r">{p.reached} <span className="muted">({Math.round(p.reachedPct * 100)}%)</span></span>,
      <span key="v" className="muted">{p.views}</span>,
      fmtDuration(p.avgMs),
      <span key="m" className="muted">{fmtDuration(p.medianMs)}</span>,
    ],
  }));

  return (
    <>
      <h1>Learners</h1>
      <p className="adm-lede">
        Who has signed in, how far they've gotten, who has finished, and how long each page takes. Active time counts
        only while the course tab is visible; elapsed time is first visit to completion. Click a column to sort.
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
        <div className="adm-stat"><b>{o.ratingCount ? `${o.avgRating.toFixed(1)} / 5` : "—"}</b><span>Avg rating ({o.ratingCount} rating{o.ratingCount === 1 ? "" : "s"})</span></div>
      </div>

      <h2>Roster</h2>
      <p className="adm-lede" style={{ fontSize: "0.88rem" }}>
        <a href="/admin/learners.csv">Download as CSV</a>
      </p>
      <SortableTable
        columns={[
          { key: "person", label: "Person" },
          { key: "progress", label: "Progress", defaultDir: "desc" },
          { key: "status", label: "Status", defaultDir: "desc" },
          { key: "active", label: "Active time", num: true },
          { key: "elapsed", label: "Elapsed", num: true },
          { key: "lastLogin", label: "Last login", defaultDir: "desc" },
          { key: "lastActive", label: "Last active", defaultDir: "desc" },
          { key: "logins", label: "Logins", num: true },
          { key: "rating", label: "Rating", defaultDir: "desc" },
          { key: "actions", label: "", sortable: false },
        ]}
        rows={rosterRows}
        initialSort={{ key: "lastActive", dir: "desc" }}
        empty="Nobody has signed in yet."
      />

      <h2>What people said</h2>
      <p className="adm-lede" style={{ fontSize: "0.88rem" }}>
        Every rating and comment learners have left after finishing, newest first. People can leave more than one,
        and they survive an admin reset. Each also appears on the Feedback page under the &ldquo;Rating&rdquo; type.
      </p>
      {ratings.length === 0 ? (
        <p className="adm-empty" style={{ border: "1px solid var(--line)", borderRadius: 12 }}>No ratings yet.</p>
      ) : (
        <div className="adm-ratings">
          {ratings.map((r) => (
            <div key={r.id} className="adm-rating">
              <div className="adm-rating-head">
                <Stars n={r.rating} />
                <Link href={`/admin/learners/${encodeURIComponent(r.email)}`}>{r.name || r.email}</Link>
                <span className="muted">{fmtDate(r.ratedAt, true)}</span>
              </div>
              {r.comment ? <p>{r.comment}</p> : <p className="muted">No written comment.</p>}
            </div>
          ))}
        </div>
      )}

      <h2>Time per page</h2>
      <p className="adm-lede" style={{ fontSize: "0.88rem" }}>
        Reach is the share of people who started the course and got at least this far. Time is per visit, so a page
        someone returns to counts each visit.
      </p>
      <SortableTable
        columns={[
          { key: "n", label: "#" },
          { key: "page", label: "Page" },
          { key: "reach", label: "Reach", defaultDir: "desc" },
          { key: "reached", label: "Reached", num: true },
          { key: "visits", label: "Visits", num: true },
          { key: "avg", label: "Avg time", num: true },
          { key: "median", label: "Median time", num: true },
        ]}
        rows={pageTableRows}
        initialSort={{ key: "n", dir: "asc" }}
      />
    </>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="adm-stars" aria-label={`${n} out of 5 stars`} title={`${n} out of 5`}>
      {"★".repeat(n)}
      <span className="adm-stars-off">{"★".repeat(5 - n)}</span>
    </span>
  );
}
