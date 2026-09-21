-- Receipts: Picker identity markers
CREATE TABLE IF NOT EXISTS "spots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"rank_at_spot" integer,
	"aura_at_spot" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "spots_user_creator_key" ON "spots" ("user_id","creator_id");
--> statement-breakpoint
CREATE INDEX "spots_user_id_idx" ON "spots" ("user_id");
--> statement-breakpoint
CREATE INDEX "spots_creator_id_idx" ON "spots" ("creator_id");
--> statement-breakpoint
-- Receipts: Session-to-identity linker
CREATE TABLE IF NOT EXISTS "picker_sessions" (
	"voter_session" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "picker_sessions_user_id_idx" ON "picker_sessions" ("user_id");
--> statement-breakpoint
-- Add foreign key constraints
ALTER TABLE "spots" ADD CONSTRAINT "spots_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "spots" ADD CONSTRAINT "spots_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action;
--> statement-breakpoint
ALTER TABLE "picker_sessions" ADD CONSTRAINT "picker_sessions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action;
--> statement-breakpoint
-- Enable RLS on both tables
ALTER TABLE "spots" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "picker_sessions" ENABLE ROW LEVEL SECURITY;
