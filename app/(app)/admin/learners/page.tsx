import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { AddAdminForm } from "@/components/admin/AddAdminForm";
import { AdminToggle } from "@/components/admin/AdminToggle";
import { MarkCompleteButton } from "@/components/admin/MarkCompleteButton";
import { ResetLearnerButton } from "@/components/admin/ResetLearnerButton";
import { LearnerRoster } from "@/components/admin/LearnerRoster";
import { RosterUpload } from "@/components/admin/RosterUpload";
import { SortableTable, type SortableRow } from "@/components/admin/SortableTable";
import { adminEmails, isAdminEmail, normalizeEmail } from "@/lib/access";
import { furthestIndexOf, pageTitle } from "@/lib/course-pages";
import { listEmployees, listLearners, listRatings, pageStats } from "@/lib/db/queries";
import { fmtDate, fmtDuration, initials, timeAgo } from "@/lib/format";
import { breakdown, elapsedMs, overview, pageRows, progressLabel, staffEntries, statusOf, type GroupRow } from "@/lib/learning-stats";

export const dynamic = "force-dynamic";

export default async function LearnersPage() {
  const [session, learners, stats, ratings, employees] = await Promise.all([
    auth(),
    listLearners(),
    pageStats(),
    listRatings(),
    listEmployees(),
  ]);
  const me = normalizeEmail(session?.user?.email) ?? "";
  const o = overview(learners, employees);
  const people = staffEntries(employees, learners);
  const rosterUpdatedAt = employees.reduce<Date | null>((d, e) => (!d || e.updatedAt > d ? e.updatedAt : d), null);
  const departments = [...new Set(employees.map((e) => e.department ?? "No department"))].sort();
  const byDept = breakdown(people, (e) => ({ key: e.department ?? "", label: e.department ?? "No department" }));
  // Direct reports per manager, finished first then by name, for the expandable manager list.
  const rank = { completed: 0, in_progress: 1, not_started: 2 } as const;
  const reportsOf = new Map<string, typeof people>();
  for (const p of people) {
    if (!p.employee) continue;
    const k = p.employee.managerEmail ?? "";
    reportsOf.set(k, [...(reportsOf.get(k) ?? []), p]);
  }
  for (const list of reportsOf.values()) {
    list.sort((a, b) => rank[statusOf(a.learner)] - rank[statusOf(b.learner)] || (a.employee?.name ?? "").localeCompare(b.employee?.name ?? ""));
  }
  const byManager = breakdown(people, (e) => ({ key: e.managerEmail ?? "", label: e.managerName ?? "No manager" }));
  const pages = pageRows(learners, stats);

  const isAdminOf = (l: { email: string; isAdmin: boolean }) => l.isAdmin || isAdminEmail(l.email);
  const admins = [
    ...learners.filter(isAdminOf).map((l) => ({ email: l.email, name: l.name, isAdmin: true, isConfigAdmin: isAdminEmail(l.email) })),
    // Config admins who haven't signed in yet still count.
    ...adminEmails()
      .filter((e) => !learners.some((l) => l.email === e))
      .map((e) => ({ email: e, name: null as string | null, isAdmin: true, isConfigAdmin: true })),
  ].sort((a, b) => a.email.localeCompare(b.email));

  const rosterRows: SortableRow[] = people.map(({ email, employee: emp, learner: l }) => {
    const name = emp?.name || l?.name || null;
    const status = statusOf(l);
    const p = l ? progressLabel(l) : null;
    const elapsed = l ? elapsedMs(l) : 0;
    const timed = Boolean(l && !l.markedCompleteBy);
    const signedIn = Boolean(l && l.loginCount > 0);
    const admin = l ? isAdminOf(l) : isAdminEmail(email);
    const avatar = (
      <span className="mic-avatar" aria-hidden="true">
        {l?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.image} alt="" referrerPolicy="no-referrer" />
        ) : (
          initials(name, email)
        )}
      </span>
    );
    const label = (
      <span>
        {name || email}
        {admin && <span className="badge" data-role="admin" style={{ marginLeft: "0.4rem" }}>Admin</span>}
        {name && <small>{email}</small>}
      </span>
    );
    return {
      id: email,
      meta: {
        text: [name, email, emp?.title, emp?.department, emp?.managerName, admin ? "admin" : ""].join(" ").toLowerCase(),
        status,
        dept: emp ? emp.department ?? "No department" : "",
      },
      sort: {
        person: (name || email).toLowerCase(),
        team: emp ? `${emp.department ?? ""} ${emp.title ?? ""}`.toLowerCase() : null,
        manager: emp?.managerName?.toLowerCase() ?? null,
        progress: status === "completed" ? 1000 : status === "in_progress" && l ? furthestIndexOf(l) : signedIn ? -1 : -2,
        active: timed && l?.activeMs ? l.activeMs : null,
        elapsed: timed && l?.startedAt ? elapsed : null,
        lastLogin: signedIn && l ? l.lastLoginAt.getTime() : null,
        lastActive: signedIn && l ? l.lastSeenAt.getTime() : null,
        logins: l?.loginCount ?? 0,
        rating: l?.rating ?? -1,
      },
      cells: [
        l ? (
          <Link key="p" href={`/admin/learners/${encodeURIComponent(email)}`} className="adm-person">{avatar}{label}</Link>
        ) : (
          <span key="p" className="adm-person">{avatar}{label}</span>
        ),
        <span key="t" className="adm-team">
          {emp ? (
            <>
              {emp.department ?? <span className="muted">No department</span>}
              {emp.title && <small className="muted">{emp.title}</small>}
            </>
          ) : (
            <span className="muted">{employees.length ? "Not on roster" : "—"}</span>
          )}
        </span>,
        <span key="m" className="muted">{emp?.managerName ?? "—"}</span>,
        <span key="s" className="adm-status">
          {l?.completedAt ? (
            <>
              <span className="badge" data-done="true">Completed</span>
              <small className="muted">
                {fmtDate(l.completedAt, true)}
                {l.markedCompleteBy ? ` · checked off by ${l.markedCompleteBy}` : ""}
              </small>
            </>
          ) : (
            <>
              <span className="badge" data-done="false">{status === "not_started" ? "Not started" : "In progress"}</span>
              {status === "in_progress" && l && p && (
                <>
                  <span className="adm-bar" title={p.text}><i style={{ width: `${Math.round(p.pct * 100)}%` }} /></span>
                  <small className="muted">{p.text} · {pageTitle(l.furthestPage ?? "why-frame")}</small>
                </>
              )}
              {!signedIn && <small className="muted">Never signed in</small>}
            </>
          )}
          {l?.resetCount ? <small className="muted">reset ×{l.resetCount}</small> : null}
        </span>,
        <span key="a" className="nowrap">{timed && l?.startedAt ? fmtDuration(l.activeMs) : <span className="muted">—</span>}</span>,
        <span key="e" className="nowrap muted">{!timed || !l?.startedAt ? "—" : l.completedAt ? fmtDuration(elapsed) : `${fmtDuration(elapsed)} so far`}</span>,
        signedIn && l ? (
          <span key="ll" className="nowrap muted" title={fmtDate(l.lastLoginAt, true)}>
            {timeAgo(l.lastLoginAt)}
            <small style={{ display: "block" }}>{l.loginCount} login{l.loginCount === 1 ? "" : "s"}</small>
          </span>
        ) : (
          <span key="ll" className="nowrap muted">Never</span>
        ),
        signedIn && l ? (
          <span key="la" className="nowrap muted" title={fmtDate(l.lastSeenAt, true)}>{timeAgo(l.lastSeenAt)}</span>
        ) : (
          <span key="la" className="muted">—</span>
        ),
        <span key="rt" className="nowrap" title={l?.ratingComment ?? undefined}>{l?.rating ? <Stars n={l.rating} /> : <span className="muted">—</span>}</span>,
        <span key="r" className="nowrap adm-rowactions">
          {l && <AdminToggle email={email} name={name} isAdmin={admin} isConfigAdmin={isAdminEmail(email)} isSelf={email === me} compact />}
          {status !== "completed" && <MarkCompleteButton email={email} name={name} compact />}
          {l?.startedAt && <ResetLearnerButton email={email} name={name} compact />}
        </span>,
      ],
    };
  });

  const groupRows = (groups: GroupRow[]): SortableRow[] =>
    groups.map((g) => ({
      id: g.key || "none",
      sort: { group: g.label.toLowerCase(), staff: g.staff, signedIn: g.signedIn, started: g.started, completed: g.completed, pct: g.completedPct },
      cells: [
        <span key="g">{g.label}</span>,
        <span key="s">{g.staff}</span>,
        <span key="i" className="muted">{g.signedIn}</span>,
        <span key="st" className="muted">{g.started}</span>,
        <span key="c">{g.completed}</span>,
        <span key="b" className="nowrap" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="adm-bar"><i style={{ width: `${Math.round(g.completedPct * 100)}%` }} /></span>
          {Math.round(g.completedPct * 100)}%
        </span>,
      ],
    }));
  const groupColumns = (label: string) => [
    { key: "group", label },
    { key: "staff", label: "Staff", num: true },
    { key: "signedIn", label: "Signed in", num: true },
    { key: "started", label: "Started", num: true },
    { key: "completed", label: "Completed", num: true },
    { key: "pct", label: "Finished", defaultDir: "desc" as const },
  ];

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
        Everyone on the employee roster, how far they've gotten, who has finished, and how long each page takes.
        Active time counts only while the course tab is visible; elapsed time is first visit to completion. People
        checked off by an admin have no timing and are left out of the time stats. Click a column to sort.
      </p>

      <div className="adm-stats">
        <div className="adm-stat"><b>{o.signedIn}</b><span>Signed in</span></div>
        <div className="adm-stat"><b>{o.started}</b><span>Started</span></div>
        <div className="adm-stat"><b>{o.completed}</b><span>Completed</span></div>
        <div className="adm-stat"><b>{Math.round(o.staffCompletionRate * 100)}%</b><span>Finished, of all {o.totalEmployees} staff{o.fromRoster ? "" : " (no roster yet)"}</span></div>
        <div className="adm-stat"><b>{Math.round(o.completionRate * 100)}%</b><span>Finished, of those who started</span></div>
        <div className="adm-stat"><b>{fmtDuration(o.avgActiveMsToComplete)}</b><span>Avg active time to finish</span></div>
        <div className="adm-stat"><b>{fmtDuration(o.medianActiveMsToComplete)}</b><span>Median active time</span></div>
        <div className="adm-stat"><b>{fmtDuration(o.avgElapsedMsToComplete)}</b><span>Avg elapsed to finish</span></div>
        <div className="adm-stat"><b>{o.activeLast7d}</b><span>Active in last 7 days</span></div>
        <div className="adm-stat"><b>{o.ratingCount ? `${o.avgRating.toFixed(1)} / 5` : "—"}</b><span>Avg rating ({o.ratingCount} rating{o.ratingCount === 1 ? "" : "s"})</span></div>
      </div>

      <h2>Admins</h2>
      <p className="adm-lede" style={{ fontSize: "0.88rem" }}>
        Admins see everything on these pages and can manage other admins. Promote anyone from the roster with the
        shield button, or add an address here before they've signed in. Admins marked &ldquo;config&rdquo; come
        from the <code>ADMIN_EMAILS</code> setting and can't be removed here.
      </p>
      <div className="adm-admins">
        {admins.map((a) => (
          <div key={a.email} className="adm-admin">
            <span className="mic-avatar" aria-hidden="true">{initials(a.name, a.email)}</span>
            <span className="adm-admin-name">
              {a.name || a.email}
              {a.name && <small>{a.email}</small>}
            </span>
            {a.isConfigAdmin && <span className="badge" data-status="wont_fix">config</span>}
            {a.email === me && <span className="badge" data-status="new">you</span>}
            <AdminToggle email={a.email} name={a.name} isAdmin isConfigAdmin={a.isConfigAdmin} isSelf={a.email === me} compact />
          </div>
        ))}
        <AddAdminForm />
      </div>

      {employees.length > 0 && (
        <>
          <Breakdown title="By department" groups={byDept}>
            <SortableTable columns={groupColumns("Department")} rows={groupRows(byDept)} initialSort={{ key: "pct", dir: "asc" }} />
          </Breakdown>
          <Breakdown
            title="By manager"
            note="Each manager’s direct reports, lowest completion first, so you know whose team to nudge. Click a manager to see who has and hasn’t finished."
            groups={byManager}
          >
            <div className="adm-mgrs">
              {[...byManager]
                .sort((a, b) => a.completedPct - b.completedPct || b.staff - a.staff)
                .map((g) => (
                  <details key={g.key || "none"} className="adm-mgr">
                    <summary>
                      <ChevronRight size={15} aria-hidden="true" className="adm-collapse-icon" />
                      <b>{g.label}</b>
                      <span className="muted">{g.completed} of {g.staff} finished</span>
                      <span className="adm-bar"><i style={{ width: `${Math.round(g.completedPct * 100)}%` }} /></span>
                      <span className="adm-mgr-pct">{Math.round(g.completedPct * 100)}%</span>
                    </summary>
                    <ul className="adm-reports">
                      {(reportsOf.get(g.key) ?? []).map(({ email, employee: e, learner: l }) => {
                        const st = statusOf(l);
                        const who = (
                          <>
                            {e?.name ?? l?.name ?? email}
                            {e?.title && <small className="muted">{e.title}</small>}
                          </>
                        );
                        return (
                          <li key={email}>
                            {l ? <Link href={`/admin/learners/${encodeURIComponent(email)}`}>{who}</Link> : <span>{who}</span>}
                            <span className="badge" data-done={st === "completed" ? "true" : "false"}>
                              {st === "completed" ? "Completed" : st === "in_progress" ? "In progress" : "Not started"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                ))}
            </div>
          </Breakdown>
        </>
      )}

      <h2>Roster</h2>
      <p className="adm-lede" style={{ fontSize: "0.88rem" }}>
        {employees.length ? (
          <>
            {employees.length} people from the employee roster
            {rosterUpdatedAt ? <>, updated {fmtDate(rosterUpdatedAt)}</> : null}
            {o.offRoster ? <>, plus {o.offRoster} signed-in {o.offRoster === 1 ? "person" : "people"} not on it</> : null}.{" "}
          </>
        ) : (
          <>No employee roster yet, so this lists only people who have signed in. </>
        )}
        Upload the latest HR export (CSV) to replace the roster. Use the check button to mark someone as completed
        if they finished some other way. <a href="/admin/learners.csv">Download as CSV</a>
      </p>
      <div style={{ margin: "0 0 0.9rem" }}>
        <RosterUpload />
      </div>
      <LearnerRoster
        columns={[
          { key: "person", label: "Person" },
          { key: "team", label: "Department" },
          { key: "manager", label: "Manager" },
          { key: "progress", label: "Status", defaultDir: "desc" },
          { key: "active", label: "Active", num: true },
          { key: "elapsed", label: "Elapsed", num: true },
          { key: "lastLogin", label: "Last login", defaultDir: "desc" },
          { key: "lastActive", label: "Last active", defaultDir: "desc" },
          { key: "rating", label: "Rating", defaultDir: "desc" },
          { key: "actions", label: "", sortable: false },
        ]}
        rows={rosterRows}
        departments={departments}
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
        Reach is the share of people who started the course here and got at least this far (people checked off by an admin aren't counted). Time is per visit, so a page
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

/** A completion breakdown, collapsed to a one-line summary until opened. */
function Breakdown({ title, note, groups, children }: { title: string; note?: string; groups: GroupRow[]; children: ReactNode }) {
  const lowest = groups.reduce<GroupRow | null>((lo, g) => (!lo || g.completedPct < lo.completedPct ? g : lo), null);
  return (
    <details className="adm-collapse">
      <summary>
        <ChevronRight size={16} aria-hidden="true" className="adm-collapse-icon" />
        <h2>{title}</h2>
        <span className="muted">
          {groups.length} groups
          {lowest ? ` · lowest: ${lowest.label}, ${Math.round(lowest.completedPct * 100)}%` : ""}
        </span>
      </summary>
      {note && <p className="adm-lede" style={{ fontSize: "0.88rem" }}>{note}</p>}
      {children}
    </details>
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
