-- Receipts: a picker's public identity, keyed by auth.users.id.
-- DATABASE.md says never extend auth.users — own profile fields live here.
-- The username is derived from the Google email on first sign-in and is what
-- /[username]/receipts resolves against, so it is unique (case-insensitively).
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Lowercased so @Harsh and @harsh can never both exist; lookups lowercase too.
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles" (lower("username"));
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_auth_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade;
--> statement-breakpoint
-- Deny-by-default, no policies: server-only via the service role, like every
-- other table in this schema.
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
