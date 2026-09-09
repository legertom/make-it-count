import { and, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./index";
import { newId } from "@/lib/ids";
import {
  feedback,
  pageViews,
  progress,
  screenshots,
  users,
  type FeedbackStatus,
  type FeedbackType,
} from "./schema";

/* ------------------------------------------------------------------ */
/*  Users                                                              */
/* ------------------------------------------------------------------ */

export async function touchUser(input: { email: string; name: string | null; image: string | null }) {
  const db = await getDb();
  const now = new Date();
  await db
    .insert(users)
    .values({ ...input, createdAt: now, lastLoginAt: now, lastSeenAt: now, loginCount: 1 })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: input.name ?? sql`${users.name}`,
        image: input.image ?? sql`${users.image}`,
        lastLoginAt: now,
        lastSeenAt: now,
        loginCount: sql`${users.loginCount} + 1`,
      },
    });
}

/** Called on every progress report. Also repairs a missing user row. */
export async function markSeen(input: { email: string; name: string | null; image: string | null }) {
  const db = await getDb();
  const now = new Date();
  await db
    .insert(users)
    .values({ ...input, createdAt: now, lastLoginAt: now, lastSeenAt: now, loginCount: 1 })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        lastSeenAt: now,
        name: input.name ?? sql`${users.name}`,
        image: input.image ?? sql`${users.image}`,
      },
    });
}

/* ------------------------------------------------------------------ */
/*  Progress + page timing                                             */
/* ------------------------------------------------------------------ */

export type ProgressRow = typeof progress.$inferSelect;

export async function getProgress(email: string): Promise<ProgressRow | null> {
  const db = await getDb();
  const rows = await db.select().from(progress).where(eq(progress.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function saveProgress(input: {
  email: string;
  currentPage: string;
  furthestIndex: number;
  furthestPage: string;
  answers?: Record<string, unknown>;
}) {
  const db = await getDb();
  const now = new Date();
  await db
    .insert(progress)
    .values({
      email: input.email,
      currentPage: input.currentPage,
      furthestIndex: input.furthestIndex,
      furthestPage: input.furthestPage,
      answers: input.answers ?? {},
      startedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: progress.email,
      set: {
        currentPage: input.currentPage,
        furthestIndex: sql`greatest(${progress.furthestIndex}, excluded.furthest_index)`,
        furthestPage: sql`case when excluded.furthest_index > ${progress.furthestIndex} then excluded.furthest_page else ${progress.furthestPage} end`,
        answers: input.answers ?? sql`${progress.answers}`,
        updatedAt: now,
      },
    });
}

export async function recordPageView(input: {
  email: string;
  pageKey: string;
  activeMs: number;
  leftAt: Date;
}) {
  const db = await getDb();
  const activeMs = Math.max(0, Math.round(input.activeMs));
  await db.insert(pageViews).values({
    id: newId("pv"),
    email: input.email,
    pageKey: input.pageKey,
    activeMs,
    enteredAt: new Date(input.leftAt.getTime() - activeMs),
    leftAt: input.leftAt,
  });
}

export async function markComplete(email: string): Promise<ProgressRow> {
  const db = await getDb();
  const now = new Date();
  const rows = await db
    .insert(progress)
    .values({ email, completedAt: now, startedAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: progress.email,
      set: { completedAt: sql`coalesce(${progress.completedAt}, ${now})`, updatedAt: now },
    })
    .returning();
  return rows[0];
}

const STARS = ["", "★☆☆☆☆", "★★☆☆☆", "★★★☆☆", "★★★★☆", "★★★★★"];

/** Every rating is its own feedback row; progress keeps the latest for the roster. */
export async function saveRating(input: {
  email: string;
  name: string | null;
  rating: number;
  comment: string | null;
}) {
  const db = await getDb();
  const now = new Date();
  const rows = await db
    .insert(feedback)
    .values({
      id: newId("fb"),
      type: "rating",
      rating: input.rating,
      title: `${STARS[input.rating]} ${input.rating}/5 course rating`,
      description: input.comment ?? "(No written comment.)",
      page: "/course/done",
      coursePage: "done",
      submittedBy: input.email,
      submitterName: input.name,
      source: "rating",
    })
    .returning({ id: feedback.id });
  const feedbackId = rows[0].id;

  await db
    .insert(progress)
    .values({
      email: input.email,
      rating: input.rating,
      ratingComment: input.comment,
      ratedAt: now,
      ratingFeedbackId: feedbackId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: progress.email,
      set: {
        rating: input.rating,
        ratingComment: input.comment,
        ratedAt: now,
        ratingFeedbackId: feedbackId,
        updatedAt: now,
      },
    });
}

export type RatingRow = {
  id: string;
  email: string;
  name: string | null;
  rating: number;
  comment: string | null;
  ratedAt: Date;
};

/** Every course rating ever left, newest first. */
export async function listRatings(): Promise<RatingRow[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: feedback.id,
      email: feedback.submittedBy,
      name: users.name,
      submitterName: feedback.submitterName,
      rating: feedback.rating,
      title: feedback.title,
      comment: feedback.description,
      ratedAt: feedback.createdAt,
    })
    .from(feedback)
    .leftJoin(users, eq(users.email, feedback.submittedBy))
    .where(eq(feedback.type, "rating"))
    .orderBy(desc(feedback.createdAt));
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name ?? r.submitterName,
    // Rows written before the rating column existed carry the stars in the title.
    rating: r.rating ?? Number(/(\d)\/5/.exec(r.title)?.[1] ?? 0),
    comment: r.comment === "(No written comment.)" ? null : r.comment,
    ratedAt: r.ratedAt,
  }));
}

export async function clearCompletion(email: string) {
  const db = await getDb();
  await db
    .update(progress)
    .set({ completedAt: null, updatedAt: new Date() })
    .where(eq(progress.email, email));
}

/** Admin: wipe a learner's progress and timing. Ratings are kept; we love feedback. */
export async function resetProgress(email: string) {
  const db = await getDb();
  await db.delete(pageViews).where(eq(pageViews.email, email));
  const now = new Date();
  await db
    .update(progress)
    .set({
      currentPage: "why-frame",
      furthestIndex: 0,
      furthestPage: "why-frame",
      answers: {},
      startedAt: now,
      updatedAt: now,
      completedAt: null,
      resetCount: sql`${progress.resetCount} + 1`,
    })
    .where(eq(progress.email, email));
}

export type LearnerRow = {
  email: string;
  name: string | null;
  image: string | null;
  createdAt: Date;
  lastLoginAt: Date;
  lastSeenAt: Date;
  loginCount: number;
  currentPage: string | null;
  furthestIndex: number | null;
  furthestPage: string | null;
  startedAt: Date | null;
  updatedAt: Date | null;
  completedAt: Date | null;
  rating: number | null;
  ratingComment: string | null;
  ratedAt: Date | null;
  resetCount: number | null;
  activeMs: number;
  views: number;
};

export async function listLearners(): Promise<LearnerRow[]> {
  const db = await getDb();
  const pv = db
    .select({
      email: pageViews.email,
      activeMs: sql<number>`coalesce(sum(${pageViews.activeMs}), 0)::int`.as("active_ms"),
      views: sql<number>`count(*)::int`.as("views"),
    })
    .from(pageViews)
    .groupBy(pageViews.email)
    .as("pv");

  const rows = await db
    .select({
      email: users.email,
      name: users.name,
      image: users.image,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      lastSeenAt: users.lastSeenAt,
      loginCount: users.loginCount,
      currentPage: progress.currentPage,
      furthestIndex: progress.furthestIndex,
      furthestPage: progress.furthestPage,
      startedAt: progress.startedAt,
      updatedAt: progress.updatedAt,
      completedAt: progress.completedAt,
      rating: progress.rating,
      ratingComment: progress.ratingComment,
      ratedAt: progress.ratedAt,
      resetCount: progress.resetCount,
      activeMs: sql<number>`coalesce(${pv.activeMs}, 0)::int`,
      views: sql<number>`coalesce(${pv.views}, 0)::int`,
    })
    .from(users)
    .leftJoin(progress, eq(progress.email, users.email))
    .leftJoin(pv, eq(pv.email, users.email))
    .orderBy(desc(users.lastSeenAt));
  return rows;
}

export async function getLearner(email: string): Promise<LearnerRow | null> {
  const all = await listLearners();
  return all.find((r) => r.email === email) ?? null;
}

export type PageStat = {
  pageKey: string;
  views: number;
  learners: number;
  avgMs: number;
  medianMs: number;
};

/** Per-page timing across every learner. */
export async function pageStats(): Promise<PageStat[]> {
  const db = await getDb();
  return db
    .select({
      pageKey: pageViews.pageKey,
      views: sql<number>`count(*)::int`,
      learners: sql<number>`count(distinct ${pageViews.email})::int`,
      avgMs: sql<number>`coalesce(avg(${pageViews.activeMs}), 0)::int`,
      medianMs: sql<number>`coalesce(percentile_cont(0.5) within group (order by ${pageViews.activeMs}), 0)::int`,
    })
    .from(pageViews)
    .groupBy(pageViews.pageKey);
}

export type LearnerPageTime = {
  pageKey: string;
  visits: number;
  activeMs: number;
  firstSeen: Date;
  lastSeen: Date;
};

/** How long one learner spent on each page. */
export async function learnerPageTimes(email: string): Promise<LearnerPageTime[]> {
  const db = await getDb();
  return db
    .select({
      pageKey: pageViews.pageKey,
      visits: sql<number>`count(*)::int`,
      activeMs: sql<number>`coalesce(sum(${pageViews.activeMs}), 0)::int`,
      firstSeen: sql<Date>`min(${pageViews.enteredAt})`,
      lastSeen: sql<Date>`max(${pageViews.leftAt})`,
    })
    .from(pageViews)
    .where(eq(pageViews.email, email))
    .groupBy(pageViews.pageKey);
}

/* ------------------------------------------------------------------ */
/*  Screenshots                                                        */
/* ------------------------------------------------------------------ */

export async function createScreenshot(input: {
  ownerEmail: string;
  mediaType: string;
  data: string;
  width: number | null;
  height: number | null;
  page: string | null;
}): Promise<string> {
  const db = await getDb();
  const id = newId("shot");
  await db.insert(screenshots).values({ id, ...input });
  return id;
}

export async function getScreenshot(id: string) {
  const db = await getDb();
  const rows = await db.select().from(screenshots).where(eq(screenshots.id, id)).limit(1);
  return rows[0] ?? null;
}

/* ------------------------------------------------------------------ */
/*  Feedback                                                           */
/* ------------------------------------------------------------------ */

export type FeedbackRow = typeof feedback.$inferSelect;

export async function createFeedback(input: {
  type: FeedbackType;
  title: string;
  description: string;
  page: string | null;
  coursePage: string | null;
  userAgent: string | null;
  submittedBy: string;
  submitterName: string | null;
  screenshotId: string | null;
  source: "agent" | "form";
  agentSessionId: string | null;
}): Promise<FeedbackRow> {
  const db = await getDb();
  const rows = await db
    .insert(feedback)
    .values({ id: newId("fb"), ...input })
    .returning();
  return rows[0];
}

export async function listFeedback(filter: { type?: FeedbackType; status?: FeedbackStatus } = {}) {
  const db = await getDb();
  const where = [
    filter.type ? eq(feedback.type, filter.type) : undefined,
    filter.status ? eq(feedback.status, filter.status) : undefined,
  ].filter(Boolean);
  const q = db.select().from(feedback);
  const rows = where.length
    ? await q.where(and(...(where as [ReturnType<typeof eq>]))).orderBy(desc(feedback.createdAt))
    : await q.orderBy(desc(feedback.createdAt));
  return rows;
}

export async function getFeedback(id: string): Promise<FeedbackRow | null> {
  const db = await getDb();
  const rows = await db.select().from(feedback).where(eq(feedback.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateFeedback(
  id: string,
  patch: { status?: FeedbackStatus; adminNotes?: string | null },
) {
  const db = await getDb();
  await db
    .update(feedback)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(feedback.id, id));
}

export async function feedbackCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db
    .select({ status: feedback.status, n: count() })
    .from(feedback)
    .groupBy(feedback.status);
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
}
