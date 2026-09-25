CREATE TABLE "email_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"source" text NOT NULL,
	"voter_session" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "email_signups_email_key" ON "email_signups" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_signups_session_created_idx" ON "email_signups" USING btree ("voter_session","created_at");--> statement-breakpoint
ALTER TABLE "email_signups" ENABLE ROW LEVEL SECURITY;