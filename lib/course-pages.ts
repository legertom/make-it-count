/**
 * The course's page map, shared by the learner UI and the admin analytics.
 * Keep this file free of React so server code can import it.
 */
export type Chapter = { name: string; pages: string[] };

export const CHAPTERS: Chapter[] = [
  { name: "Why this course", pages: ["why-frame"] },
  { name: "How context works", pages: ["model-what", "model-desk"] },
  {
    name: "Five habits",
    pages: ["habits-map", "h1", "h2", "h3a", "h3b", "h4a", "h4g", "h4b", "h4c", "h5"],
  },
  { name: "Spotting waste", pages: ["burn-challenge", "burn-tools", "burn-surfaces", "burn-checks"] },
  { name: "Requesting more", pages: ["more-ask"] },
  { name: "Check for knowledge", pages: ["final"] },
  { name: "Job aid", pages: ["done"] },
];

/**
 * Pages that no longer exist, and the page that absorbed each one. Saved
 * progress and bookmarked URLs that point at them land on the replacement.
 * Keep in step with drizzle/0004_course_pages.sql, which rewrites stored rows.
 */
export const LEGACY_PAGES: Record<string, string> = {
  "why-scenario": "why-frame",
  "model-three": "model-desk",
  "more-why": "more-ask",
};

export type PageRef = { key: string; ci: number; pi: number; of: number; index: number };

export const PAGES: PageRef[] = [];
CHAPTERS.forEach((c, ci) =>
  c.pages.forEach((key, pi) => PAGES.push({ key, ci, pi, of: c.pages.length, index: PAGES.length })),
);

export const PAGE_TITLES: Record<string, string> = {
  "why-frame": "What this course is for",
  "model-what": "How context works",
  "model-desk": "What belongs on the desk",
  "habits-map": "The five habits",
  h1: "Habit 1 · One job, one chat",
  h2: "Habit 2 · What it needs, not everything",
  h3a: "Habit 3 · Be specific (RACE)",
  h3b: "Habit 3 · Practice",
  h4a: "Habit 4 · Match the horsepower",
  h4g: "Habit 4 · Where Gemini fits",
  h4b: "Habit 4 · The effort setting",
  h4c: "Habit 4 · Check for knowledge",
  h5: "Habit 5 · Clean handoff",
  "burn-challenge": "Spotting a mismatch",
  "burn-tools": "What runs without you",
  "burn-surfaces": "Switching things off",
  "burn-checks": "Your daily routine",
  "more-ask": "When and how to ask for more",
  final: "Apply your learnings",
  done: "Job aid: the five-second check",
};

export const PAGE_COUNT = PAGES.length;

export function pageIndex(key: string): number {
  const i = PAGES.findIndex((p) => p.key === key);
  return i < 0 ? 0 : i;
}

export function pageTitle(key: string): string {
  return PAGE_TITLES[key] ?? key;
}

export function chapterOf(key: string): string {
  const p = PAGES.find((x) => x.key === key);
  return p ? CHAPTERS[p.ci].name : "";
}

export function isPageKey(key: string): boolean {
  return PAGES.some((p) => p.key === key);
}

/** A current page key for `key`, following LEGACY_PAGES; null if it was never a page. */
export function resolvePageKey(key: string | null | undefined): string | null {
  if (!key) return null;
  if (isPageKey(key)) return key;
  const moved = LEGACY_PAGES[key];
  return moved && isPageKey(moved) ? moved : null;
}

/**
 * A learner's furthest page as an index in the current page order. Trusts the page
 * key over the stored integer, so rows written against an older order (or by an
 * old client during a deploy) still read correctly, and never indexes past the end.
 */
export function furthestIndexOf(row: { furthestIndex: number | null; furthestPage: string | null }): number {
  const key = resolvePageKey(row.furthestPage);
  if (key) return pageIndex(key);
  return Math.max(0, Math.min(PAGE_COUNT - 1, row.furthestIndex ?? 0));
}

export function pageUrl(key: string): string {
  return `/course/${key}`;
}
