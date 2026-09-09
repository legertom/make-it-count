CREATE TYPE "public"."feedback_status" AS ENUM('new', 'triaged', 'in_progress', 'done', 'wont_fix');--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM('bug', 'feature', 'other');--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "feedback_type" DEFAULT 'other' NOT NULL,
	"status" "feedback_status" DEFAULT 'new' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"page" text,
	"course_page" text,
	"user_agent" text,
	"submitted_by" text NOT NULL,
	"submitter_name" text,
	"screenshot_id" text,
	"source" text DEFAULT 'agent' NOT NULL,
	"agent_session_id" text,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"page_key" text NOT NULL,
	"active_ms" integer NOT NULL,
	"entered_at" timestamp with time zone NOT NULL,
	"left_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress" (
	"email" text PRIMARY KEY NOT NULL,
	"current_page" text DEFAULT 'why-frame' NOT NULL,
	"furthest_index" integer DEFAULT 0 NOT NULL,
	"furthest_page" text DEFAULT 'why-frame' NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"reset_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screenshots" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"media_type" text DEFAULT 'image/png' NOT NULL,
	"data" text NOT NULL,
	"width" integer,
	"height" integer,
	"page" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"email" text PRIMARY KEY NOT NULL,
	"name" text,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"login_count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_screenshot_id_screenshots_id_fk" FOREIGN KEY ("screenshot_id") REFERENCES "public"."screenshots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_created_idx" ON "feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "feedback_status_idx" ON "feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "page_views_email_idx" ON "page_views" USING btree ("email");--> statement-breakpoint
CREATE INDEX "page_views_page_idx" ON "page_views" USING btree ("page_key");