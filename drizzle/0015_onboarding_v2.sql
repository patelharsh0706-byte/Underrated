ALTER TABLE "creators" ALTER COLUMN "wants_to_meet" SET DATA TYPE text[] USING CASE WHEN "wants_to_meet" IS NULL THEN '{}'::text[] ELSE ARRAY["wants_to_meet"] END;--> statement-breakpoint
ALTER TABLE "creators" ALTER COLUMN "wants_to_meet" SET DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "creators" ALTER COLUMN "wants_to_meet" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "profile_only" boolean DEFAULT false NOT NULL;
