-- A sponsor can genuinely opt out of a logo (real removal, not a UI toggle)
-- and can add a short description shown on the banner.
ALTER TABLE "sponsorships" ALTER COLUMN "image_url" DROP NOT NULL;
ALTER TABLE "sponsorships" ADD COLUMN "description" text;
