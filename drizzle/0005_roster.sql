CREATE TABLE "employees" (
	"email" text PRIMARY KEY NOT NULL,
	"employee_id" text,
	"name" text NOT NULL,
	"title" text,
	"department" text,
	"site" text,
	"start_date" text,
	"manager_name" text,
	"manager_email" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "progress" ADD COLUMN "marked_complete_by" text;--> statement-breakpoint
CREATE INDEX "employees_department_idx" ON "employees" USING btree ("department");