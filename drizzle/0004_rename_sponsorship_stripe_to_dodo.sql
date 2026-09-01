-- Same provider switch as 0003, applied to the (still unbuilt) sponsorships
-- table for consistency.
ALTER TABLE "sponsorships" RENAME COLUMN "stripe_id" TO "dodo_payment_id";
