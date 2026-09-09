/**
 * The course's page map, shared by the learner UI and the admin analytics.
 * Keep this file free of React so server code can import it.
 */
export type Chapter = { name: string; pages: string[] };

export const CHAPTERS: Chapter[] = [
  { name: "Why this course", pages: ["why-frame", "why-scenario"] },
  { name: "How context works", pages: ["model-what", "model-desk", "model-three"] },
  {
    name: "Five habits",
    pages: ["habits-map", "h1", "h2", "h3a", "h3b", "h4a", "h4g", "h4b", "h4c", "h5"],
  },
  { name: "Spotting waste", pages: ["burn-challenge", "burn-checks"] },
  { name: "Requesting more", pages: ["more-why", "more-ask"] },
  { name: "Check for knowledge", pages: ["final"] },
  { name: "Job aid", pages: ["done"] },
];

export type PageRef = { key: string; ci: number; pi: number; of: number; index: number };

export const PAGES: PageRef[] = [];
CHAPTERS.forEach((c, ci) =>
  c.pages.forEach((key, pi) => PAGES.push({ key, ci, pi, of: c.pages.length, index: PAGES.length })),
);

export const PAGE_TITLES: Record<string, string> = {
  "why-frame": "What this course is for",
  "why-scenario": "Check: what counts as good usage",
  "model-what": "How context works",
  "model-desk": "What belongs on the desk",
  "model-three": "Three things to keep in mind",
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
  "burn-checks": "Four things to check",
  "more-why": "When more usage is right",
  "more-ask": "How to ask for more",
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
