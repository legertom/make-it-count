import { PAGES, PAGE_COUNT } from "@/lib/course-pages";
import type { LearnerRow, PageStat } from "@/lib/db/queries";

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
  completionRate: number;
  avgActiveMsToComplete: number;
  medianActiveMsToComplete: number;
  avgElapsedMsToComplete: number;
  activeLast7d: number;
};

export function overview(learners: LearnerRow[]): Overview {
  const started = learners.filter((l) => l.startedAt);
  const completed = learners.filter((l) => l.completedAt);
  const activeToComplete = completed.map((l) => l.activeMs).filter((x) => x > 0);
  const elapsed = completed
    .map((l) => (l.completedAt && l.startedAt ? l.completedAt.getTime() - l.startedAt.getTime() : 0))
    .filter((x) => x > 0);
  const weekAgo = Date.now() - 7 * 86_400_000;
  return {
    signedIn: learners.length,
    started: started.length,
    completed: completed.length,
    completionRate: started.length ? completed.length / started.length : 0,
    avgActiveMsToComplete: mean(activeToComplete),
    medianActiveMsToComplete: median(activeToComplete),
    avgElapsedMsToComplete: mean(elapsed),
    activeLast7d: learners.filter((l) => l.lastSeenAt.getTime() > weekAgo).length,
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

/** Per-page reach (from furthest page) and timing (from page views). */
export function pageRows(learners: LearnerRow[], stats: PageStat[]): PageRow[] {
  const started = learners.filter((l) => l.startedAt);
  const byKey = new Map(stats.map((s) => [s.pageKey, s]));
  return PAGES.map((p) => {
    const reached = started.filter((l) => (l.furthestIndex ?? -1) >= p.index).length;
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
  const idx = l.furthestIndex ?? 0;
  return { pct: (idx + 1) / PAGE_COUNT, text: `${idx + 1} of ${PAGE_COUNT} pages`, state: "active" };
}

/** Wall-clock time from first visit to completion, or to now while in progress. 0 when not started. */
export function elapsedMs(l: LearnerRow): number {
  if (!l.startedAt) return 0;
  const end = l.completedAt ?? new Date();
  return Math.max(0, end.getTime() - l.startedAt.getTime());
}
