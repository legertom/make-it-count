import { index, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

const tsNow = (name: string) => timestamp(name, { withTimezone: true }).defaultNow().notNull();

/** Everyone who has signed in. Written by the Auth.js signIn event and the progress API. */
export const users = pgTable("users", {
  email: text("email").primaryKey(),
  name: text("name"),
  image: text("image"),
  createdAt: tsNow("created_at"),
  lastLoginAt: tsNow("last_login_at"),
  /** Bumped every time the learner's browser reports progress. */
  lastSeenAt: tsNow("last_seen_at"),
  loginCount: integer("login_count").notNull().default(1),
});

/** Where each learner is in the course, plus their answers. One row per person. */
export const progress = pgTable("progress", {
  email: text("email").primaryKey(),
  currentPage: text("current_page").notNull().default("why-frame"),
  furthestIndex: integer("furthest_index").notNull().default(0),
  furthestPage: text("furthest_page").notNull().default("why-frame"),
  /** Their quiz picks and interactive state, so the course resumes across devices. */
  answers: jsonb("answers").$type<Record<string, unknown>>().notNull().default({}),
  startedAt: tsNow("started_at"),
  updatedAt: tsNow("updated_at"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  /** 1-5 stars, asked once the learner marks the course complete. */
  rating: integer("rating"),
  ratingComment: text("rating_comment"),
  ratedAt: timestamp("rated_at", { withTimezone: true }),
  /** The feedback row that mirrors this rating on the admin Feedback page. */
  ratingFeedbackId: text("rating_feedback_id"),
  /** How many times an admin has reset this learner. */
  resetCount: integer("reset_count").notNull().default(0),
});

/** One row each time a learner leaves a course page. `activeMs` counts only visible-tab time. */
export const pageViews = pgTable(
  "page_views",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    pageKey: text("page_key").notNull(),
    activeMs: integer("active_ms").notNull(),
    enteredAt: timestamp("entered_at", { withTimezone: true }).notNull(),
    leftAt: timestamp("left_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("page_views_email_idx").on(t.email), index("page_views_page_idx").on(t.pageKey)],
);

/** Annotated screenshots attached to feedback. Stored inline as base64. */
export const screenshots = pgTable("screenshots", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  mediaType: text("media_type").notNull().default("image/png"),
  /** Base64 payload without the `data:` prefix. */
  data: text("data").notNull(),
  width: integer("width"),
  height: integer("height"),
  page: text("page"),
  createdAt: tsNow("created_at"),
});

export const feedbackTypeEnum = pgEnum("feedback_type", ["bug", "feature", "other", "rating"]);
export const feedbackStatusEnum = pgEnum("feedback_status", [
  "new",
  "triaged",
  "in_progress",
  "done",
  "wont_fix",
]);

export const feedback = pgTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    type: feedbackTypeEnum("type").notNull().default("other"),
    status: feedbackStatusEnum("status").notNull().default("new"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    /** Browser path where the feedback was raised, e.g. `/`. */
    page: text("page"),
    /** Course page key at the time, e.g. `h3b`. */
    coursePage: text("course_page"),
    userAgent: text("user_agent"),
    submittedBy: text("submitted_by").notNull(),
    submitterName: text("submitter_name"),
    screenshotId: text("screenshot_id").references(() => screenshots.id, {
      onDelete: "set null",
    }),
    /** `agent` (via the eve chat), `form` (direct submit), or `rating` (end-of-course stars). */
    source: text("source").notNull().default("agent"),
    agentSessionId: text("agent_session_id"),
    adminNotes: text("admin_notes"),
    createdAt: tsNow("created_at"),
    updatedAt: tsNow("updated_at"),
  },
  (t) => [
    index("feedback_created_idx").on(t.createdAt),
    index("feedback_status_idx").on(t.status),
  ],
);

export type FeedbackType = (typeof feedbackTypeEnum.enumValues)[number];
export type FeedbackStatus = (typeof feedbackStatusEnum.enumValues)[number];
export const FEEDBACK_TYPES = feedbackTypeEnum.enumValues;
export const FEEDBACK_STATUSES = feedbackStatusEnum.enumValues;
