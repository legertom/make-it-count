import { PAGES, PAGE_COUNT, furthestIndexOf } from "@/lib/course-pages";
import type { EmployeeRow, LearnerRow, PageStat } from "@/lib/db/queries";

/**
 * Fallback headcount for the "finished, of all staff" stat, used only until an admin
 * uploads the employee roster (which then sets the headcount). See .env.example.
 */
export const TOTAL_EMPLOYEES = (() => {
  const n = Number(process.env.TOTAL_EMPLOYEES);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 240;
})();

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export type Overview = {
  signedIn: number;
  started: number;
  completed: number;
  /** Share of those who started that have finished. */
  completionRate: number;
  /** Company headcount the staff rate is measured against: the roster, or TOTAL_EMPLOYEES without one. */
  totalEmployees: number;
  /** Whether totalEmployees came from an uploaded roster. */
  fromRoster: boolean;
  /** Roster people who have finished (all finishers when there's no roster). */
  staffCompleted: number;
  /** Signed-in people whose email isn't on the roster (0 when there's no roster). */
  offRoster: number;
  /** Finishers an admin checked off by hand; they have no timing. */
  markedComplete: number;
  /** Share of all staff who have finished. */
  staffCompletionRate: number;
  avgActiveMsToComplete: number;
  medianActiveMsToComplete: number;
  avgElapsedMsToComplete: number;
  activeLast7d: number;
  ratingCount: number;
  avgRating: number;
};

export function overview(learners: LearnerRow[], employees: EmployeeRow[] = []): Overview {
  const started = learners.filter((l) => l.startedAt);
  const completed = learners.filter((l) => l.completedAt);
  // Hand-marked completions have no timing; keep them out of the time stats.
  const timed = completed.filter((l) => !l.markedCompleteBy);
  const activeToComplete = timed.map((l) => l.activeMs).filter((x) => x > 0);
  const roster = new Set(employees.map((e) => e.email));
  const fromRoster = roster.size > 0;
  const totalEmployees = fromRoster ? roster.size : TOTAL_EMPLOYEES;
  const staffCompleted = fromRoster ? completed.filter((l) => roster.has(l.email)).length : completed.length;
  const elapsed = timed
    .map((l) => (l.completedAt && l.startedAt ? l.completedAt.getTime() - l.startedAt.getTime() : 0))
    .filter((x) => x > 0);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const ratings = learners.map((l) => l.rating).filter((r): r is number => typeof r === "number");
  return {
    ratingCount: ratings.length,
    avgRating: mean(ratings),
    // Admins can create a user row before someone signs in (0 logins); don't count those.
    signedIn: learners.filter((l) => l.loginCount > 0).length,
    started: started.length,
    completed: completed.length,
    completionRate: started.length ? completed.length / started.length : 0,
    totalEmployees,
    fromRoster,
    staffCompleted,
    offRoster: fromRoster ? learners.filter((l) => !roster.has(l.email)).length : 0,
    markedComplete: completed.length - timed.length,
    staffCompletionRate: totalEmployees ? staffCompleted / totalEmployees : 0,
    avgActiveMsToComplete: mean(activeToComplete),
    medianActiveMsToComplete: median(activeToComplete),
    avgElapsedMsToComplete: mean(elapsed),
    activeLast7d: learners.filter((l) => l.loginCount > 0 && l.lastSeenAt.getTime() > weekAgo).length,
  };
}

export type PageRow = {
  key: string;
  index: number;
  reached: number;
  reachedPct: number;
  views: number;
  learners: number;
  avgMs: number;
  medianMs: number;
};

/**
 * Per-page reach (from furthest page) and timing (from page views). People an admin
 * checked off never went through the pages here, so they'd flatten the funnel; skip them.
 */
export function pageRows(learners: LearnerRow[], stats: PageStat[]): PageRow[] {
  const started = learners.filter((l) => l.startedAt && !l.markedCompleteBy);
  const byKey = new Map(stats.map((s) => [s.pageKey, s]));
  return PAGES.map((p) => {
    const reached = started.filter((l) => furthestIndexOf(l) >= p.index).length;
    const s = byKey.get(p.key);
    return {
      key: p.key,
      index: p.index,
      reached,
      reachedPct: started.length ? reached / started.length : 0,
      views: s?.views ?? 0,
      learners: s?.learners ?? 0,
      avgMs: s?.avgMs ?? 0,
      medianMs: s?.medianMs ?? 0,
    };
  });
}

export function progressLabel(l: LearnerRow): { pct: number; text: string; state: "done" | "active" | "new" } {
  if (l.completedAt) return { pct: 1, text: "Completed", state: "done" };
  if (!l.startedAt) return { pct: 0, text: "Not started", state: "new" };
  const idx = furthestIndexOf(l);
  return { pct: (idx + 1) / PAGE_COUNT, text: `${idx + 1} of ${PAGE_COUNT} pages`, state: "active" };
}

/** Wall-clock time from first visit to completion, or to now while in progress. 0 when not started. */
export function elapsedMs(l: LearnerRow): number {
  if (!l.startedAt) return 0;
  const end = l.completedAt ?? new Date();
  return Math.max(0, end.getTime() - l.startedAt.getTime());
}

export type LearnerStatus = "completed" | "in_progress" | "not_started";

export function statusOf(l: LearnerRow | null): LearnerStatus {
  if (!l) return "not_started";
  if (l.completedAt) return "completed";
  return l.startedAt ? "in_progress" : "not_started";
}

/** One person: on the roster, signed in, or both. */
export type StaffEntry = { email: string; employee: EmployeeRow | null; learner: LearnerRow | null };

/** Everyone on the roster, plus anyone who signed in but isn't on it. */
export function staffEntries(employees: EmployeeRow[], learners: LearnerRow[]): StaffEntry[] {
  const byEmail = new Map(learners.map((l) => [l.email, l]));
  const out: StaffEntry[] = employees.map((e) => ({ email: e.email, employee: e, learner: byEmail.get(e.email) ?? null }));
  const roster = new Set(employees.map((e) => e.email));
  for (const l of learners) if (!roster.has(l.email)) out.push({ email: l.email, employee: null, learner: l });
  return out;
}

export type GroupRow = {
  key: string;
  label: string;
  staff: number;
  signedIn: number;
  started: number;
  completed: number;
  completedPct: number;
};

/** Completion per roster group (department, manager, ...). People off the roster are left out. */
export function breakdown(
  entries: StaffEntry[],
  groupOf: (e: EmployeeRow) => { key: string; label: string },
): GroupRow[] {
  const groups = new Map<string, GroupRow>();
  for (const { employee, learner } of entries) {
    if (!employee) continue;
    const g = groupOf(employee);
    const row = groups.get(g.key) ?? { key: g.key, label: g.label, staff: 0, signedIn: 0, started: 0, completed: 0, completedPct: 0 };
    row.staff++;
    if (learner && learner.loginCount > 0) row.signedIn++;
    if (learner?.startedAt) row.started++;
    if (learner?.completedAt) row.completed++;
    groups.set(g.key, row);
  }
  return [...groups.values()].map((r) => ({ ...r, completedPct: r.staff ? r.completed / r.staff : 0 }));
}
