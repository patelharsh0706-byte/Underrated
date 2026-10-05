CREATE TABLE "creator_past_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"name" text NOT NULL,
	"line" text,
	"url" text,
	"year" integer,
	"status" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_past_projects_status_check" CHECK ("creator_past_projects"."status" in ('live', 'sold', 'sunset', 'failed', 'oss'))
);
--> statement-breakpoint
CREATE TABLE "profile_hypes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "x_bio" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "x_location" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "x_url" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "onboarded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "draft" jsonb;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "about" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "location_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "project_name" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "project_tagline" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "work_how" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "work_stage" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "work_career" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "wants_to_meet" text;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "open_to" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "into" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_past_projects" ADD CONSTRAINT "creator_past_projects_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_hypes" ADD CONSTRAINT "profile_hypes_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_past_projects_creator_idx" ON "creator_past_projects" USING btree ("creator_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_hypes_creator_user_key" ON "profile_hypes" USING btree ("creator_id","user_id");--> statement-breakpoint
ALTER TABLE "creator_past_projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profile_hypes" ENABLE ROW LEVEL SECURITY;
