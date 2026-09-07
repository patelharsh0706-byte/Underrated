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

## 2026-09-01 — Live stats bar on the homepage

Decision:
Add a homepage panel showing total battles, all-time visitors, submission-fee
revenue, total site visits, a live "N here now" count, and a "just happened"
feed of recent creator joins. Promoted into MVP.md MUST HAVE (was not
previously in scope).

Why:
Explicitly requested, inspired by bigbubble.lol's live wall stats. Gives the
homepage social proof and a sense of a live, active game — reinforces "the
battle is the product" instead of turning into a dashboard.

Implementation:
One new table, `visitor_pings`, keyed by the same `voter_session` cookie
`battles` already uses — no new client-side identity. A client component
calls a `pingVisitor` server action every 45s (paused via
`document.hidden`/`visibilitychange`, matching bigbubble's pattern), which
upserts the visitor's row and returns the freshly computed stats bundle in
the same round trip; the client re-renders the tiles and "N here now" badge
from that response. "Site visit" vs "unique visitor" is derived purely from
timestamps already on the row (a ping more than 30 minutes after the last one
counts as a new visit) — no client-side session flag needed.
The "just happened" feed only surfaces creator joins (mirroring what
bigbubble actually ships, not battle picks) and is refreshed at page load
only, not on the 45s tick — a live-updating feed wasn't asked for and adds a
second polling path for a "nice to have" liveliness detail.

Rejected:
Supabase Realtime for presence — banned in V1 (see 2026-09-03). Polling
matches the existing anti-abuse posture ("deliberately light") and needs no
new infrastructure.
PostHog-backed live counters — PostHog is for our own analytics dashboard,
not for a number rendered directly on the page; querying its API on every
homepage request for a number we can compute from our own Postgres in one
query is unnecessary coupling.
A separate client-generated visitor id (localStorage uuid, bigbubble's
approach) — the anonymous `voter_session` cookie already serves that exact
purpose for battles; reusing it avoids a second identity system.

## 2026-09-03 — Fixed $3 submission fee and three starting categories

Decision:
The creator submission fee is a fixed **$3**, set server-side. The client no
longer sends an amount at all — `SUBMISSION_FEE_CENTS` in
`lib/creator-schema.ts` is the single source of truth, applied in
`createSubmissionCheckout`. The amount picker is gone from `/submit`.

V1 also ships exactly three categories: **Indie Developers, Builders,
CEO/Founders**, stored as human labels rather than slugs.

Why:
"Pay what you want, from $1" made the entry fee a decision the creator had to
think about, on a page whose whole job is to get them into the pool. A single
number is one less thing to weigh. Fixing it server-side also closes a real
hole: a crafted request could previously submit for $1 regardless of what the
UI showed.

The categories narrow the product to one audience — people who build things —
so battles compare like with like. Labels are stored rather than slugs because
every display site (battle card, profile, OG image) renders
`creator.category` straight through with CSS casing; a slug would render as
"Indie-developers" under the profile page's `capitalize`, and labels need no
lookup map anywhere.

Consequence:
The Dodo submission product becomes a plain fixed-price $3 product — it no
longer needs "pay what you want" pricing enabled. Seeded creators keep their
old categories (music, comedy, film…), so the taxonomy stays mixed until real
creators replace seed data. Deliberate and temporary.

This SUPERSEDES the "any amount from $1" part of the 2026-09-05 submission-fee
decision. The rest of that entry — fee instead of auth, fee never affecting
rank, row created by the webhook — still stands.

Rejected:
Keeping the picker with $3 as the default — still asks a question we don't
want asked, and leaves the tamperable client-supplied amount in place.
Slug-based categories with a display map — a lookup at four display sites to
solve a problem we don't have.

## 2026-09-04 — Placement period for new creators

Decision:
A creator needs **10 valid battles** (the existing `battles_count` column,
`>= 10`) before they get an official rank. Below that threshold they're
excluded from `/leaderboard` and the homepage Top 10, and the UI shows
**"🔥 NEW CHALLENGER"** in place of a rank — on the profile page, the OG
image, and the battle card itself. Aura updates live throughout placement;
only the *display* of rank/leaderboard presence is gated, never the Elo math.

Matchmaking gets a guaranteed placement slot: whenever any active creator is
unranked, every battle pairing includes one (weighted random among the
unranked pool, favoring fewest battles). The other slot is drawn from the
full active pool with the existing mild bias, so placement creators get
calibrated against established Aura, not just each other.

Why:
A first battle (or zero) produced a numeric rank that meant nothing, and the
existing continuous pairing bias never guaranteed a new creator would
actually get evaluated in reasonable time as the pool grows. Ten battles is
enough signal for a rank to mean something without making a new creator wait
long. "NEW CHALLENGER" instead of "unranked" is deliberate framing — this
status should read as exciting to voters ("help place someone new"), not as
a penalty visible on the creator's own profile.

This SUPERSEDES the "Provisional / uncertainty periods (Glicko-style)" line
in RANKING.md's "Deliberately Not in V1" list. This isn't a Glicko rework —
Aura's math is untouched — but a hide-until-threshold display gate is
exactly what that line was excluding, so it's removed and replaced with the
full Placement section in RANKING.md.

Rejected:
Category-specific rank (the mockup's "#7 AI") in this pass — new query
surface (per-category leaderboard), and RANKING.md already excludes
category-scoped ranking; deferred rather than adding both at once.
A probabilistic-only pairing bias (steepen the existing formula instead of
guaranteeing a slot) — simpler diff, but doesn't guarantee placement
actually completes quickly as the pool grows, which was the point.

## 2026-09-07 — Analytics provider: DataFast, not PostHog

Decision:
Use DataFast for web analytics. A single `<Script>` in the root layout
(`src/app/layout.tsx`) with `strategy="afterInteractive"`, carrying the
website id and `data-domain`. This replaces PostHog in ARCHITECTURE.md's
service table.

Why:
PostHog was recorded on day one but never built — `NEXT_PUBLIC_POSTHOG_KEY`
and `_HOST` exist in `.env.example` and nothing else. Nothing is being
migrated or thrown away, so the switching cost is zero. DataFast is a
page-analytics script: one tag, no SDK, no client wrapper, no provider
component around the tree, which suits a site whose only client components
are the battle loop.

The credentials are public by design (a website id and a domain, both visible
in page source), so unlike every other service here they are hardcoded rather
than routed through `.env.example` and `lib/env.ts`. There is nothing to keep
secret and nothing for `clientEnv()` to validate.

Rejected:
Building PostHog as recorded — it is the heavier tool (session capture,
feature flags, funnels) and V1 needs traffic counts. Its value would come
from product analytics on the battle loop, which is not what is being asked
for here; reinstating it later is a fresh decision, not a reversal of this
one.

Self-hosting or a first-party proxy route to dodge ad blockers — real data
loss, but it means owning an endpoint and a CSP surface for a number that
only informs marketing. Not worth it at V1.
