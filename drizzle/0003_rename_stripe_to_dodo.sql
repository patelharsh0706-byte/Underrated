-- Switched payment provider from Stripe to Dodo Payments before Stripe was
-- ever wired to real keys — see DECISIONS.md.
ALTER TABLE "creators" RENAME COLUMN "stripe_checkout_session_id" TO "dodo_payment_id";
ALTER INDEX "creators_stripe_session_key" RENAME TO "creators_dodo_payment_key";
