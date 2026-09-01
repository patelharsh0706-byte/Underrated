CREATE TABLE "visitor_pings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voter_session" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"visit_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "visitor_pings_voter_session_key" ON "visitor_pings" USING btree ("voter_session");--> statement-breakpoint
CREATE INDEX "visitor_pings_last_seen_idx" ON "visitor_pings" USING btree ("last_seen_at");--> statement-breakpoint
ALTER TABLE "visitor_pings" ENABLE ROW LEVEL SECURITY;
