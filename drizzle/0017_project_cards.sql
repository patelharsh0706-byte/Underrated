-- 0017 — project cards (DATABASE.md § Project cards, 2026-10-13).
-- Adds columns only (nullable, or defaulted), so the live code is unaffected.
SET LOCAL lock_timeout = '3s';--> statement-breakpoint
ALTER TABLE "creator_past_projects" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "creator_past_projects" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "project_image_url" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "project_logo_url" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "projects_view" text DEFAULT 'cards' NOT NULL;--> statement-breakpoint
ALTER TABLE "creators" ADD CONSTRAINT "creators_projects_view_check" CHECK ("creators"."projects_view" in ('cards', 'rows'));