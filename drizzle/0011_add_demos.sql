CREATE TABLE "demo_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"demo_id" uuid NOT NULL,
	"voter_session" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_judgements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"demo_id" uuid NOT NULL,
	"voter_session" text NOT NULL,
	"verdict" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demo_judgements_verdict_check" CHECK ("demo_judgements"."verdict" in ('underhyped', 'not_yet'))
);
--> statement-breakpoint
CREATE TABLE "demos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_name" text NOT NULL,
	"tagline" text NOT NULL,
	"product_url" text NOT NULL,
	"category" text NOT NULL,
	"contact_email" text NOT NULL,
	"video_url" text NOT NULL,
	"video_bytes" integer NOT NULL,
	"video_width" integer,
	"video_height" integer,
	"duration_ms" integer NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"voter_session" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demos_status_check" CHECK ("demos"."status" in ('submitted', 'approved', 'rejected', 'hidden'))
);
--> statement-breakpoint
ALTER TABLE "demo_clicks" ADD CONSTRAINT "demo_clicks_demo_id_demos_id_fk" FOREIGN KEY ("demo_id") REFERENCES "public"."demos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_judgements" ADD CONSTRAINT "demo_judgements_demo_id_demos_id_fk" FOREIGN KEY ("demo_id") REFERENCES "public"."demos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "demo_clicks_demo_session_key" ON "demo_clicks" USING btree ("demo_id","voter_session");--> statement-breakpoint
CREATE UNIQUE INDEX "demo_judgements_demo_session_key" ON "demo_judgements" USING btree ("demo_id","voter_session");--> statement-breakpoint
CREATE INDEX "demo_judgements_demo_created_idx" ON "demo_judgements" USING btree ("demo_id","created_at");--> statement-breakpoint
CREATE INDEX "demos_status_created_idx" ON "demos" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "demos_session_created_idx" ON "demos" USING btree ("voter_session","created_at");--> statement-breakpoint
ALTER TABLE "demos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "demo_judgements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "demo_clicks" ENABLE ROW LEVEL SECURITY;