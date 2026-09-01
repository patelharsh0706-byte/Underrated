-- Submission is now gated by a Stripe entry fee instead of an account.
-- See DECISIONS.md — 2026-09-05.
ALTER TABLE "creators" ADD COLUMN "entry_fee_cents" integer;
ALTER TABLE "creators" ADD COLUMN "stripe_checkout_session_id" text;
CREATE UNIQUE INDEX "creators_stripe_session_key" ON "creators" ("stripe_checkout_session_id");
