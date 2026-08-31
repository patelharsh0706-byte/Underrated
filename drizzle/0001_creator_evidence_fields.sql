-- Replace the generic `links` blob with structured evidence fields, plus a
-- self-reported follower count shown pre-vote instead of Aura. See
-- DATABASE.md for the rationale.
ALTER TABLE "creators" DROP COLUMN IF EXISTS "links";
ALTER TABLE "creators" ADD COLUMN "work_url" text;
ALTER TABLE "creators" ADD COLUMN "socials" jsonb;
ALTER TABLE "creators" ADD COLUMN "primary_social" text;
ALTER TABLE "creators" ADD COLUMN "follower_count" integer;
