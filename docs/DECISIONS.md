# DECISIONS.md

ADR-lite decision log. Append only. Newest at the bottom.

Record any decision that a future session could plausibly reverse by accident.

Format:

```
## YYYY-MM-DD — Topic

Decision:
What we're doing.

Why:
The reasoning.

Rejected:
What we considered and why not.
```

---

## 2026-09-01 — Authentication

Decision:
Use Better Auth with PostgreSQL.

Why:
We want auth data in Postgres without implementing
password/session security ourselves.

Rejected:
Clerk — external user store.
Custom auth — unnecessary security risk.

SUPERSEDED by 2026-09-03 — Database and auth provider.

## 2026-09-01 — Aura

Decision:
Use Elo with K=24.

Why:
Simple, understandable and sufficient for MVP.

## 2026-09-02 — Sponsored creators

Decision:
Creators cannot pay for additional battle exposure.

Why:
Paid exposure could undermine trust in rankings.

## 2026-09-03 — Database and auth provider

Decision:
Use Supabase for both Postgres and auth. Drizzle still owns the schema and
migrations; Supabase Auth owns `auth.users`.

Why:
One third-party service for database and auth instead of two. Auth data sits
next to application data in the same Postgres, and we do not implement
password/session security ourselves.

Consequences:
RLS must be enabled and deny-by-default on every table in `public` — Supabase
exposes Postgres over a public API, so the server-only service role key is what
keeps Aura unwritable from the client.
Supabase Realtime, Storage, and Edge Functions are not adopted in V1. Images
stay on Vercel Blob.

Rejected:
Neon + Better Auth — two services to run and wire together.
Clerk — external user store, auth data outside our Postgres.

## 2026-09-04 — Creator submission gate: Google OAuth

Decision:
Require Google OAuth sign-in to submit or manage a creator; one account owns
at most one creator.

Why:
Simplest way to prevent duplicate submissions and give a creator a durable
identity to edit their profile later.

SUPERSEDED by 2026-09-05 — Creator submission gate: entry fee, not auth.

## 2026-09-05 — Creator submission gate: entry fee, not auth

Decision:
Submitting a creator requires a one-time entry fee (any amount from $1)
instead of a Google account. No sign-in step. Submitted creators are
unclaimed (`user_id` null). The fee amount never affects Aura, pairing, or
rank — it is platform revenue only, same trust boundary as the sponsor slot.
(Payment provider is Dodo Payments — see 2026-09-06.)

Why:
An OAuth account is friction without a payoff for a one-time submission, and
doesn't actually stop spam — a free Google account costs nothing to make. A
small payment is real friction that filters for people who mean it, and it
matches how the rest of the platform already collects revenue (sponsor slot).

Consequences:
The Google OAuth sign-in flow (built for the superseded decision above) stays
in the codebase but has no entry point in the UI — kept for a likely future
"manage your profile" feature, not deleted.
`creators.user_id` stays nullable; nothing currently sets it.
Duplicate-person spam (someone submitting the same real person repeatedly
under different usernames) is not prevented in V1 — paying $1 per fake entry
is a weak deterrent, not a strong one. Revisit if it becomes a real problem.

Rejected:
Payment amount determines leaderboard rank (a "highest stake wins" model) —
directly contradicts "rankings cannot be bought" in PRODUCT.md and would
replace the Elo/battle mechanic with a different game entirely.
Money goes to the creator being submitted (payment-provider payouts) — much
larger scope than a V1 entry fee; revisit in ROADMAP.md if creator
monetization becomes a real feature.

## 2026-09-06 — Payment provider: Dodo Payments, not Stripe

Decision:
Use Dodo Payments for both the submission fee and the (unbuilt) sponsor slot.
Not Stripe.

Why:
Explicit choice — no Stripe account in the loop for this project.

Consequences:
Dodo is product-based rather than ad-hoc-price-based: charging a variable,
user-chosen amount requires a pre-created Product in the Dodo dashboard with
"pay what you want" pricing enabled, referenced by
`DODO_PAYMENTS_SUBMISSION_PRODUCT_ID`. This is a manual one-time setup step
outside the codebase — same category of external dependency as the Google
OAuth client was.
Webhook verification uses the SDK's `webhooks.unwrap()` with three headers
(`webhook-id`, `webhook-signature`, `webhook-timestamp`) rather than Stripe's
single-header HMAC scheme.
`creators.dodo_payment_id` and `sponsorships.dodo_payment_id` replace the
`stripe_*` column names used before any Stripe key was ever wired up — no
real Stripe data existed, so this was a rename, not a migration of live data.
