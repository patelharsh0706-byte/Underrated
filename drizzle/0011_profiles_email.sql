-- Receipts: the login email on the picker's profile, so the owner can see
-- which account each profile belongs to in the dashboard without joining
-- auth.users. Nullable — a provider can omit it. Written once at creation
-- (ensureProfile); it is a snapshot, not kept in sync with auth.users.
-- Never rendered: the public receipts route selects a projection without it.
-- See DATABASE.md § profiles.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "email" text;
--> statement-breakpoint
-- Link every profile that already exists. Same role and privilege the FK to
-- auth.users in 0010 relied on.
UPDATE "profiles" p
SET "email" = u."email"
FROM "auth"."users" u
WHERE u."id" = p."id" AND p."email" IS NULL;
