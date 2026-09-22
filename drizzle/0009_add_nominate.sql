CREATE TABLE "nominate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"x_profile_url" text NOT NULL,
	"handle" text NOT NULL,
	"note" text,
	"voter_session" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "nominate_voter_session_key" ON "nominate" USING btree ("voter_session");--> statement-breakpoint
ALTER TABLE "nominate" ENABLE ROW LEVEL SECURITY;