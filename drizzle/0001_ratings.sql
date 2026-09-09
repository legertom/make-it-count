ALTER TYPE "public"."feedback_type" ADD VALUE 'rating';--> statement-breakpoint
ALTER TABLE "progress" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "progress" ADD COLUMN "rating_comment" text;--> statement-breakpoint
ALTER TABLE "progress" ADD COLUMN "rated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "progress" ADD COLUMN "rating_feedback_id" text;