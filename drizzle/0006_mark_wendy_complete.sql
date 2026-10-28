-- Wendy Yu finished Make It Count outside the app. Check her off so the course opens on
-- the job aid for her, with no page timings, and record that an admin did it. Leaves
-- an existing in-app completion alone. The users row (0 logins) puts her on the roster
-- table even if she has never signed in; signing in later updates it as usual.
INSERT INTO "users" ("email", "name", "login_count")
VALUES ('wendy.yu@clever.com', 'Wendy Yu', 0)
ON CONFLICT ("email") DO NOTHING;
--> statement-breakpoint
INSERT INTO "progress" ("email", "current_page", "furthest_index", "furthest_page", "completed_at", "marked_complete_by")
VALUES ('wendy.yu@clever.com', 'done', 19, 'done', now(), 'tom.leger@clever.com')
ON CONFLICT ("email") DO UPDATE SET
  "current_page" = 'done',
  "furthest_index" = 19,
  "furthest_page" = 'done',
  "completed_at" = now(),
  "marked_complete_by" = 'tom.leger@clever.com',
  "updated_at" = now()
WHERE "progress"."completed_at" IS NULL;
