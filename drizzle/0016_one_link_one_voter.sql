-- 0016 — the X user id is the only account↔creator link, one voter id per
-- vote ("x:<X user id>"), the X prefill lives in accounts.draft.
-- DATABASE.md § "One link, one voter id, prefill in the draft" (2026-10-06).
-- Data first, then the new index, then the drops. Runs in one transaction.
-- Kept on purpose: creators.user_id (the live `main` code still selects it).
SET LOCAL lock_timeout = '3s';--> statement-breakpoint

-- 1. Every linked creator carries its account's X user id.
UPDATE "creators" AS c SET "x_user_id" = a."x_user_id"
FROM "accounts" AS a
WHERE a."creator_id" = c."id" AND c."x_user_id" IS NULL;--> statement-breakpoint

-- 2. The X prefill moves into the draft (same shape as initialDraft() in
--    src/lib/profile/draft.ts) where nothing is saved yet.
UPDATE "accounts" SET "draft" = jsonb_build_object(
  'tagline', btrim(left(regexp_replace(btrim(coalesce("x_bio", '')), '\s+', ' ', 'g'), 140)),
  'about', btrim(left(regexp_replace(btrim(coalesce("x_bio", '')), '\s+', ' ', 'g'), 200)),
  'location', btrim(left(regexp_replace(btrim(coalesce("x_location", '')), '\s+', ' ', 'g'), 40)),
  'projectUrl', CASE
    WHEN coalesce(btrim("x_url"), '') = '' THEN ''
    WHEN "x_url" ~* '^https?://' THEN btrim("x_url")
    ELSE 'https://' || btrim("x_url") END,
  'projectName', left(coalesce(substring(btrim(coalesce("x_url", '')) from '^(?:https?://)?(?:www\.)?([^/:?#]+)'), ''), 40)
)
WHERE "draft" IS NULL AND ("x_bio" IS NOT NULL OR "x_location" IS NOT NULL OR "x_url" IS NOT NULL);--> statement-breakpoint

-- 3. Any signed-in vote keyed by account ("u:<account id>") is re-keyed by X person.
UPDATE "battles" AS b SET "voter_session" = 'x:' || a."x_user_id"
FROM "accounts" AS a
WHERE b."voter_session" = 'u:' || a."id"::text;--> statement-breakpoint
UPDATE "demo_judgements" AS d SET "voter_session" = 'x:' || a."x_user_id"
FROM "accounts" AS a
WHERE d."voter_session" = 'u:' || a."id"::text;--> statement-breakpoint

-- 4. The new one-pick-per-pair rule exists before the old one goes.
CREATE UNIQUE INDEX "battles_x_pair_key" ON "battles" USING btree ("voter_session",least("creator_a_id", "creator_b_id"),greatest("creator_a_id", "creator_b_id")) WHERE "battles"."voter_session" like 'x:%';--> statement-breakpoint

-- 5. Drop the duplicates.
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_creator_id_creators_id_fk";--> statement-breakpoint
DROP INDEX "accounts_creator_id_key";--> statement-breakpoint
DROP INDEX "battles_account_pair_key";--> statement-breakpoint
DROP INDEX "demo_judgements_demo_account_key";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "creator_id";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "x_bio";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "x_location";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "x_url";--> statement-breakpoint
ALTER TABLE "battles" DROP COLUMN "voter_user_id";--> statement-breakpoint
ALTER TABLE "demo_judgements" DROP COLUMN "voter_user_id";
