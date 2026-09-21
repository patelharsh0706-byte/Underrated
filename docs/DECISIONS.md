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

V1 also ships exactly three categories: **Indie Developer, Builder,
CEO/Founder**, stored as human labels rather than slugs.

> **Corrected 2026-09-14.** This entry recorded the plural spelling while the
> shipped UI used the singular, and the two never reconciled — every category
> filter returned an empty board. Singular is correct, a category labels one
> person, and `CATEGORIES` in `src/lib/creator-schema.ts` is now the single
> definition. See the 2026-09-14 entry below.

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

## 2026-09-10 — V2 visual direction

Decision:
Adopt the V2 design language captured in the design mockup, and record it as
version 2 of [DESIGN.md](DESIGN.md). Six changes to V1's visual rules:

1. **Lime `#D8FF3E` joins the palette** as the celebration/action accent. The
   primary CTA, the #1 podium card, the headline marker swipe and the
   post-payment check badge are lime. Aura orange stays a *value* colour — the
   Aura number and the "new challenger" state — and is never a button fill.
2. **Hairlines and soft shadows replace the universal 2px black border.** Card
   radius moves 12px -> 18px; buttons and inputs stay at 12px. A black border
   now means "selected", not "this is a card".
3. **Three type families instead of one** — Archivo for display, Geist for
   body, Caveat for marginalia.
4. **Handwritten marginalia becomes a brand element** — two rotated pen notes
   per page in the outer margins, with hand-drawn SVG arrows, going inline and
   centred below 1040px.
5. **Avatars are circular in list contexts, square in identity contexts** —
   circles for leaderboard rows, facepiles and podium cards; squares for the
   profile page, the post-payment card and battle portraits.
6. **The battle pair stays side by side at every width.** The cards shed
   detail on a phone instead of stacking.

Two UX rules in DESIGN.md are amended as a consequence: rule 1 (which forbade
any hero above the battle) now permits a single headline and subhead, and
rule 4 (which required the pair to stack on mobile) is reversed. Both are
marked in place rather than deleted.

Why:
Every one of these came out of review on the mockup, several by explicit
instruction, and the mockup is now the agreed direction for the whole site.
Leaving DESIGN.md describing V1 would put the codebase permanently at odds
with its own documentation: AGENTS.md makes DESIGN.md authoritative, so the
next session reading it would "correct" the shipped V2 UI back toward V1 and
think it was fixing drift. Recording the change is what makes it a decision
rather than an accident.

Rules 1 and 4 are the two that most deserve the marked-in-place treatment,
because both were written for good reasons and were overridden on evidence —
rule 4 in particular after the stacked mobile layout was seen to break the
side-by-side comparison the pick depends on.

Rejected:
Deleting the superseded V1 lines outright — cheaper to read, but it loses the
fact that a deliberate call was made, which is the entire purpose of this log.

Keeping V1's 2px-black-border card treatment and applying lime on top — the
two do not sit together; the border language is loud enough that lime reads as
a third competing element rather than the accent.

Introducing lime *instead of* Aura orange to avoid a two-accent palette —
rejected because Aura is the product's core number and its colour is load-
bearing across the leaderboard, the battle cards and the profile. The split
(lime = action, orange = value) is a rule, not a compromise.

## 2026-09-10 — "Live on Underhyped" replaces the stats bar

Decision:
Rebuild the homepage live stats bar as a full section below Hottest 10: four
large counters, a live online indicator, and a "Just happened" activity
ticker. It supersedes the existing `ArenaStatsBar` component, which is
deleted rather than kept alongside — it already showed battles and creators.

The four counters are **battles fought**, **creators in the Arena**, **people
deciding**, and **nominations**. Three of the four are real today:
`getHomeStats()` already returns `battlesSoFar`, `creatorsInArena` and
`onlineNow`; "people deciding" is one new `count(distinct voter_session)`.

Why:
The section's job is social proof, not analytics: someone should read it and
conclude that people are actually competing here. Lifetime totals are the
right choice at this stage because they are the larger numbers; once daily
activity is consistently strong, these should quietly switch to "today" or
"this week", because "726 votes today" is more alive than "8,943 votes since
launch". That switch is a content change, not a rebuild.

**"Votes cast" is deliberately not one of the four.** In this schema one
`battles` row *is* one pick — it carries `voter_session` and `winner_id`
together — so a votes counter and a battles counter would render the identical
number in two adjacent cards. "People deciding" (distinct voter sessions) is
a genuinely different number and makes the stronger claim: real humans, not
just events. If a large "votes cast" figure is wanted later, the fix is
upstream — log every pairing *shown* as an impression, separate from the pick,
at which point impressions and picks diverge honestly.

The **nominations** counter and the "was nominated" ticker row depend on a
feature that does not exist; see the entry below. They stay in the mockup and
out of production until it does.

Two ticker rows — "climbed to #4" and "took the #1 spot" — need the
`rank_snapshots` table described in [DATABASE.md](DATABASE.md). Everything
else in the feed is derivable today: joins from `getRecentJoins()`, wins from
a battles join, and Aura milestones from the `aura_*_after` columns already on
every battle row.

Rejected:
Keeping `ArenaStatsBar` above the battle as well — two places on one page
reporting the same two numbers, one of them worse.

Showing "votes cast" anyway, as a synonym for battles — reads as padding the
moment anyone compares the two cards.

## 2026-09-10 — Nominations are not V1

Decision:
Nominations — one person putting another creator into the Arena — are not in
V1. No table, no route, no UI. The idea moves to [ROADMAP.md](ROADMAP.md), and
[MVP.md](MVP.md) records it under NOT V1 so the question is settled in the
scope contract rather than reopened each time it appears in a mockup.

Why:
It has surfaced three times in design review — a "Nominate" nav item, a
"nominate a friend" strip on the welcome screen, and a nominations counter in
the live section — and each time there was nothing behind it. Writing it down
as out of scope is cheaper than re-deciding it every session.

It is also a genuinely different product surface, not a small addition: a
nominated creator has no payment, no consent, and no profile they control,
which touches the entry-fee invariant, moderation, and the "creators cannot be
added without paying" rule at once.

Rejected:
Building a minimal version now — the interesting questions (does a nomination
skip the fee, can someone refuse one, what stops a mass-nomination farm) are
exactly the ones a minimal version would have to answer anyway.

## 2026-09-10 — Battle portraits go rectangular

Decision:
Battle-card portraits switch from square (12px radius, the V2 default for
every identity context) to a rectangular 5:4 banner crop, full-bleed at the
top of the card, `object-position: top`. This is the one identity context
that stays rectangular; the profile page and the post-payment welcome card
keep the square treatment DESIGN.md otherwise specifies.

Why:
Phase 3a's port followed DESIGN.md's stated rule literally — square
everywhere identity is the subject, which at the time included battle
portraits. Reviewed side by side against the design mockup, the wider 5:4
crop reads better specifically on the battle card: the whole surface is
built around comparing two people's work at a glance, and a bigger, wider
photo carries that better than a small square headshot. This is a case where
the documented rule was reasonable in the abstract but wrong for this one
surface once seen rendered.

Rejected:
Keeping it square for consistency with every other identity context —
consistency isn't a good enough reason on its own once the wider crop is
visibly the better choice for this specific card, and DESIGN.md already
carries an explicit exception mechanism for exactly this ("Changed in V2"
call-outs) rather than requiring uniformity for its own sake.

## 2026-09-10 — The Trend column shows Aura moved today, not rank movement

Decision:
The homepage Top 10 becomes a five-column table (`# / Creator / Category /
Aura / Trend`), matching the design mockup. Its Trend column shows **Aura
gained or lost today**, not rank movement. A creator with no battles today —
including anyone padded in from the all-time leaderboard when fewer than ten
qualify — gets an em dash, not a zero.

The number is summed from the `aura_*_after` / `aura_*_before` columns of
today's battles, folded into the aggregate `getTop24h()` already runs, so the
column costs no extra query.

Why:
The mockup's Trend column shows small integers with up/down arrows, which
reads as rank movement ("↑ +1" = climbed one place). Rank movement is not
derivable from this schema and never will be without the `rank_snapshots`
table, which [MVP.md](MVP.md) lists under NOT V1 and [DATABASE.md](DATABASE.md)
specs as deliberately unbuilt. [RANKING.md](RANKING.md) § Rank movement
already anticipated this exact situation and named the answer: a trend column
that needs a number today shows 24h Aura change, "which *is* derivable ...
and which is a different claim honestly made." This implements that.

The visual is identical to the mockup — arrow, colour, alignment. Only the
claim underneath it is different, and it is one we can actually stand behind.

Rejected:
- Building `rank_snapshots` to get literal rank movement — it is out of scope
  by the MVP contract, and needs a daily capture job, not just a table.
- Showing Daily Heat (today's win−loss differential) in the column instead.
  It is already fetched and its magnitudes match the mockup's small integers
  more closely, but sitting directly beside an Aura column, "+3" reads as
  three Aura, which is wrong by an order of magnitude.
- Dropping the column. It is real information and the design has a slot for it.

## 2026-09-10 — Pulse-row faces are creators, never voters

Decision:
The facepile beside "N picks today" shows creators who were picked in today's
battles — the top of the Daily Heat list — and each avatar links to that
creator's profile. It renders only when someone has qualified today; with no
qualifiers it is omitted rather than backfilled.

Why:
In the mockup the faces beside a pick count read as the people who did the
picking. Those faces cannot exist here: voting is anonymous by design — no
account is required to play, which is the whole point of the loop — so there
is no identity or avatar attached to a voter session, and there never will be
while that holds. Showing invented faces there would be fabricating the one
thing the product deliberately does not collect.

Creators who were picked today are real, already fetched with `getTop24h()`,
and are the people the row is actually about. Linking each avatar to a profile
makes what they are self-evident rather than leaving it ambiguous.

Rejected:
- Generic silhouettes or generated avatars as stand-in voters — fabricated
  participants, which is the exact failure mode this avoids.
- Showing all-time leaderboard creators when nobody qualifies today — faces of
  people who were not in today's battles, next to a count of today's battles.

## 2026-09-10 — The Live panel's fourth tile is picks today, not nominations

Decision:
"Live on Underhyped" grows from three stat tiles to four, matching the design
mockup's layout. The mockup's fourth tile counts nominations; ours counts
today's picks (`battlesToday`) instead.

The "Just happened" feed also gains an Aura-milestone event — ⚡ "X reached
1,600 Aura" — derived in JS from the `aura_*_before` / `aura_*_after` pair on
the battle row that crossed a round hundred. It replaces the ⚔️ framing of
that same battle rather than adding a row, and costs no extra query: the
columns come back on the `getRecentBattleResults()` select that was already
running. Creators start at 1500, so the crossing must be strictly above where
they already were — a first win never renders as "reached 1,500 Aura".

Why:
Nominations are NOT V1 — [MVP.md](MVP.md) lists them, and DECISIONS.md
§ 2026-09-10 "Nominations are not V1" settled it after the idea resurfaced
three times in design review. There is no nominations count to show because
there are no nominations. Today's picks is a real number, already fetched,
and carries the same "things are happening right now" job the tile is there
to do.

The mockup's feed also includes 👑 "Mira Alston took the #1 spot". That is
rank movement, which [RANKING.md](RANKING.md) § Rank movement forbids showing
until `rank_snapshots` exists: "no surface may show a rank delta." The Aura
milestone is the honest way to get the same "someone just did something
notable" beat into the feed.

Rejected:
- A nominations tile wired to a placeholder or a zero — displaying a counter
  for a feature that does not exist, which is the fabrication this avoids.
- Leaving three tiles and letting the grid go lopsided — there is a real
  fourth number available, so the layout does not have to be compromised.
- A separate milestone query — the battle rows already carry the Aura columns
  needed, so a second round trip would buy nothing.

## 2026-09-11 — Enter the Arena is two links, and the name comes from you

Decision:
`/submit` becomes the five-step flow from the design mockup: two link fields
→ a build step → a preview card with a one-tap category → an edit escape
hatch → the handoff to checkout. The old single-screen form with six labelled
inputs is gone.

The mockup's lookup fills in a creator's real name and bio from their X
handle. Ours does not, because it cannot: X publishes neither to an
unauthenticated fetch. So the preview opens with the handle as the name and
the bio reading "Building **Project**. *Add a line about yourself under Edit
details.*" — and "Edit details" is where both get set.

Why:
That is not a compromise bolted on; it is the mockup's own fallback path. Its
lookup is a hardcoded map of eight seeded handles, and every handle outside
that map already gets exactly this treatment — `name: known ? known.name :
handle`, and the same "Building …" bio line. The demo shortcut is the part
that does not survive contact with production; the fallback is the design.

What *is* real: the handle and username are parsed from the URL, the project
name and its mark colour are derived from the domain, and the avatar comes
from unavatar with a generated Dicebear fallback already baked into the URL —
the same derivation every other avatar in the app uses. The build step waits
on that avatar request rather than on a timer, so the preview card never
renders an empty circle.

Rejected:
- Shipping the mockup's KNOWN map of eight handles — hardcoded real people's
  names and bios, correct for eight users and fabricated for everyone else.
- Scraping X, or fetching the project site's OG metadata to invent a bio.
  The first needs credentials we do not have; the second is a server-side
  fetch of a user-supplied URL, which is new scope and an SSRF surface, for
  a line the creator can type in one tap.
- Keeping the long form so every field is asked for up front. Two links is
  the product promise on the page itself ("Two links. That's the whole
  form."), and the edit step already covers everyone it does not fit.

## 2026-09-11 — /submit/success renders the welcome screen instead of redirecting

Decision:
`/submit/success` now renders the design mockup's step-6 welcome screen —
check badge, identity card, placement progress, "what happens next", Explore
the Arena, and a share panel — instead of bouncing straight to `/c/<username>`
the moment the webhook lands.

Why:
The redirect dropped the one screen that explains what a creator just bought.
A brand-new profile is, correctly, empty: 1500 Aura, 0/10 placement battles,
0/0 wins. Landing on it cold reads as "nothing happened". The welcome screen
frames that same emptiness as a starting line, and the share panel gives the
creator the one lever they actually have — placement clears on distinct
voters, so more eyes genuinely does move it faster.

Every number on it is read from the row the webhook inserted. Nothing is
illustrative.

Two things in the mockup are not built:

- **The "Edit" button** on the card. There is no edit-profile route in V1 —
  ARCHITECTURE.md § Auth records that Google OAuth exists but has no UI entry
  point, and profile editing is the future feature it was kept for. The
  mockup's button has no handler either. A visible control that does nothing
  is worse than its absence, so it is omitted until there is something to
  wire it to.
- **The three hardcoded faces** in the share panel (`harshpatel502`,
  `romg_dev`, `heyadeel`). Those are real people's avatars stamped onto every
  new creator's welcome screen. Replaced with the top three creators
  currently in the Arena — the ones this creator will actually be matched
  against — each linking to its profile, per the rule already set in
  § 2026-09-10 "Pulse-row faces are creators, never voters".

Rejected:
- Keeping the redirect and putting this content on the profile page — the
  profile is a public page about a creator, not a receipt, and "here's what
  happens next" is wrong for every visitor who isn't the owner.
- Shipping the Edit button as a link to `/submit` — it would restart payment.

## 2026-09-11 — The submission checkout goes back to an API session

Decision:
`createSubmissionCheckout` creates a real Dodo checkout session again —
product from `DODO_PAYMENTS_SUBMISSION_PRODUCT_ID`, amount fixed server-side
from `SUBMISSION_FEE_CENTS`, the validated creator payload in
`metadata.creator_data`, and `return_url` / `cancel_url` on our own origin.
It replaces the static Payment Link (`https://dodo.pe/submit`) that commit
`c80213f` put in as a temporary bridge.

Why:
The bridge broke the chain in three places at once. It set no `return_url`,
so where a payer landed was configured in the Dodo dashboard rather than in
code. It carried no metadata, so the webhook hit its "not a submission
payment" guard and never inserted the row. And `/submit/success` therefore
never found a creator — every real payer got the polling state and timed out
on "Still processing".

Worse, the payload was validated and then dropped on the redirect, so a paid
submission could not be reconstructed by hand either. Someone could pay $3
and leave no recoverable trace of what they submitted.

This is not a new design; it is what ARCHITECTURE.md § Payments steps 1-4
already specified and what the webhook was already written to consume. The
bridge was the deviation.

Two changes from the pre-bridge version:

- `return_url` comes from `getAppOrigin()` (the request's Host header), not
  `NEXT_PUBLIC_APP_URL`. That env var went stale across the domain move and
  took the profile page down in production; a checkout return pointed at a
  dead domain is a strictly worse version of the same bug. The profile page
  and `/submit/success` now share that helper.
- The payload is serialized before the API call and rejected if it exceeds a
  conservative metadata ceiling, so an oversized bio fails at checkout
  creation rather than after the money has moved.

`src/lib/creator-schema.test.ts` pins the serialize -> parse -> re-validate
round trip, including the bare-domain URL rewrite and the absent-bio case.
That round trip is the whole flow's single point of silent failure: if it
ever stops holding, the payment succeeds and the creator row never appears.

Rejected:
- Keeping the bridge and having a human create rows by hand — there is no
  data left to create them from.
- Persisting a pending-submission row and passing only its id. More robust
  against metadata limits, but it is a new table (DATABASE.md first, per
  AGENTS.md) to solve a problem the ceiling check already covers at this
  payload size. Worth revisiting if the schema grows.

Note: the sponsor flow (`src/app/actions/sponsor.ts`) still uses its own
static Payment Link and has the same break. Out of scope here, not fixed.

## 2026-09-11 — Reverted to the static Payment Link (supersedes the entry above)

Decision:
`createSubmissionCheckout` goes back to redirecting to the static Payment
Link `https://dodo.pe/submit`. The API checkout session from the previous
entry is reverted. Everything else from that work stays: `getAppOrigin()`,
`/submit/success` rendering the welcome screen, and the metadata round-trip
tests.

Why:
The API session requires `DODO_PAYMENTS_API_KEY` and
`DODO_PAYMENTS_WEBHOOK_KEY`, and neither is set. `dodoEnv()` validates them
with Zod inside `getDodoClient()`, so checkout threw before any network call
and every submission failed with "Couldn't start checkout." A static link
needs no credentials, so the submit button works again immediately.

This is a deliberate trade, not a fix. The consequences from the bridge are
back in full:

- No metadata, so the `payment.succeeded` webhook returns early at its
  "not a submission payment" guard and never inserts the creator row.
- So `/submit/success` never finds a row, and the welcome screen built on
  2026-09-11 is unreachable — a real payer sees the polling state time out.
- The validated fields are discarded at the redirect, so a paid submission
  cannot be reconstructed by hand either.

Someone can pay $3 and leave no recoverable trace of what they submitted.
That is the accepted cost of not having the keys today.

Reversing this is a git revert plus two environment variables — the webhook,
the success page, and the schema round-trip tests are all already written
against the API-session flow and do not need to change.

Rejected:
- Inserting the creator row before payment so the success page works. It
  would let anyone enter the Arena without paying, breaking the entry-fee
  gate that replaces auth entirely (ARCHITECTURE.md § Auth).
- Stashing the draft in a cookie and rendering the welcome screen from it —
  the screen would show a profile that does not exist in the database, with
  an Explore/share link to a 404.

## 2026-09-11 — Mobile nav collapses into a dropdown

Decision:
Below `sm` the header's four nav links move behind a hamburger button. The
open state is a panel that drops in flow under the masthead row (wordmark ·
Enter-the-arena pill · hamburger), pushing the page down rather than
covering it. The pill stays in the header; only the nav links live in the
menu. The current route renders in Aura orange inside the panel. Full rule
in DESIGN.md § Components "Mobile nav".

Why:
The V2 shell's mobile header wrapped the nav onto a second full-width row
under the wordmark and CTA. That row cost ~40px of the first phone viewport
on every page — directly against UX rule 1 (the battle must be visible
without scrolling) and rule 4 (mobile first). A hamburger costs nothing
until it is tapped, and the panel is one tap away on every page.

Rejected:
- A full-screen sheet or overlay menu — covers the battle, needs a backdrop,
  scroll lock, and a focus trap. Heavier than a four-link nav deserves.
- Moving "Enter the arena" into the menu — buries the one money link
  behind a tap. It fits on the masthead row next to the hamburger.
- Radix `DropdownMenu` (already a dependency via `radix-ui`) — a floating,
  positioned action menu with roving-focus semantics, the wrong shape for
  in-flow site navigation. A `useState` client island is ~40 lines.
- Native `<details>/<summary>` — zero JS, but it cannot close on route
  change and cannot animate the panel in cleanly.
- Adding the active-route highlight to the desktop nav at the same time —
  it would make `SiteHeader` a Client Component on every page for a state
  the mobile island already renders. Still deferred.

## 2026-09-11 — Vercel functions pinned to the database's region

Decision:
`vercel.json` sets `regions: ["hnd1"]` (Tokyo), the Vercel region closest
to the Supabase project in `ap-northeast-1`. Recorded in ARCHITECTURE.md
§ Environments.

Why:
Production `/` returned 500 after the V2 merge. Runtime logs showed
`canceling statement due to statement timeout` on
`select count(distinct voter_session) from battles` — a table of 271 rows.
`pg_stat_activity` showed a backend `active` on `ClientRead` for over five
minutes on an equally trivial `count(*)`: Postgres had received the start
of a query and was waiting for the rest to arrive from the client. The
client was a Vercel function in `iad1` (Washington) talking to a database
in Tokyo; with six parallel queries per homepage request, each needing its
own TLS and auth round trips across the Pacific, connections stalled and
the statement timer — which starts on the first packet — ran out. The
other routes survived only because they issue fewer queries.

The same mismatch was behind the ~15 s homepage loads seen during
development, which were previously written off as "Supabase latency".

Rejected:
- Raising `statement_timeout` — hides the stall instead of removing it,
  and Vercel's own 300 s function limit still applies.
- Moving the Supabase project to us-east — a database migration to fix a
  one-line hosting setting.
- Collapsing the six homepage stat queries into one — worth doing, but as
  an optimisation after the region is right, not as the fix.

## 2026-09-11 — The database client is configured for a frozen function, not a long-lived server

Decision:
`src/lib/db/index.ts` creates the postgres.js client with `prepare: false`,
`max_pipeline: 1`, `idle_timeout: 20`, `max_lifetime: 300`, and
`connect_timeout: 10`.

> **Corrected 2026-09-12.** This shipped as `max_pipeline: 0`, which broke
> every transaction in the app — including the one that moves Aura. The value
> is 1; the reasoning below is unchanged. See the 2026-09-12 entry
> "max_pipeline is 1, because 0 silently disables every transaction".

Why:
After pinning the function region (entry above), `/` still hung
intermittently — sometimes a full page in under a second, sometimes no
bytes at all for minutes — while `pg_stat_activity` showed nothing in
flight from the app. The earlier symptoms fit the same cause: a backend
stuck `active` on `ClientRead`, and one query whose Bind carried `'f'`,
the wire encoding of a boolean from a different statement.

A Vercel function is frozen between requests. postgres.js keeps its
module-level pool across that freeze, but Supavisor and the network do not
keep the idle sockets alive underneath it. On the next request the client
writes to a socket it believes is open: nothing answers, so the request
waits out TCP rather than the database. When a socket dies mid-pipeline,
postgres.js re-sends its queued statements and the queue can misalign,
which is where the crossed parameter came from.

The defaults — no idle timeout, no lifetime, a 30 s connect timeout, up to
100 pipelined statements per socket — are for a long-lived server. Each
option above closes one of those gaps: idle sockets are dropped before the
function is likely to be frozen, every socket is recycled, a dead handshake
fails fast, and no statement is ever queued behind another on one socket
through a transaction-mode pooler, which PgBouncer and Supavisor both
document as unsafe.

Rejected:
- Switching to the session-mode pooler (port 5432) — supports pipelining
  and prepared statements, but the pool is small and serverless instances
  would exhaust it.
- A per-request client (`postgres()` inside the render) — correct but pays
  the full handshake on every request; the tuned pool keeps warm sockets
  for bursts while still dropping them across a freeze.
- Raising Vercel `maxDuration` or Postgres `statement_timeout` — both only
  change how long the hang lasts.

## 2026-09-12 — The pulse-row facepile is always populated

Decision:
The facepile beside the pick counter shows today's battled creators when
there are any and the top of the board when there are not, instead of
rendering nothing. Four faces, always. `top10` is already resolved on the
page, so the fallback costs no extra query.

Why:
The faces came only from `dailyHeat`, which resets at 00:00 UTC. For the
hours between the day rolling over and the day's first pick — which is most
of the European and American morning — production rendered a bare
"0 picks today · Skip this battle" with an empty space where the pile
belongs. It read as broken rather than as quiet. Requested directly: keep
the facepile constant.

The cost, stated plainly: in fallback the faces no longer mean "these
people were in today's battles". They are still real, active creators and
every avatar still links to a real profile, so nothing on screen is
fabricated — but the row is decorative in that window rather than
informative. This softens UX rule 10 ("nothing on screen implies a feature
that does not exist") at its edge; it does not break it, because the
feature and the people are both real.

Rejected:
- Hardcoding four usernames — the faces would survive those creators being
  deactivated or renamed, and would eventually 404.
- A rolling 24-hour window instead of the UTC-day boundary — it would fill
  the gap, but it desynchronises the pulse row from Daily Heat and Main
  Character, which all deliberately reset at the same instant (DECISIONS.md
  § 2026-09-10 "The Trend column shows Aura moved today").
- Leaving it empty — the honest option, and what shipped first; overruled
  because an empty row looks like a bug to everyone who is not us.

## 2026-09-12 — max_pipeline is 1, because 0 silently disables every transaction

Decision:
The postgres.js `max_pipeline` is `1`, not `0`. The entry above
("The database client is configured for a frozen function") stands in full —
only the value changes.

Why:
`0` looks like the strongest form of "never pipeline", and it is not a value
postgres.js rejects. What it actually does is turn off transactions. In
`node_modules/postgres/src/connection.js` the executor returns:

```js
write(toBuffer(q))
  && !q.describeFirst
  && !q.cursorFn
  && sent.length < max_pipeline          // 0 < 0 → false
  && (!q.options.onexecute || q.options.onexecute(connection))
```

`&&` short-circuits, so at `max_pipeline: 0` the `onexecute` callback never
runs — and `onexecute` is what moves the connection into the reserved queue
for `sql.begin` (`src/index.js`, `onexecute` → `move(c, reserved)`). The
connection therefore never counts as reserved, and the guard that fires when
a `BEGIN` completes:

```js
if (result.command === 'BEGIN' && max !== 1 && !connection.reserved)
  return errored(Errors.generic('UNSAFE_TRANSACTION', ...))
```

kills the transaction immediately. `1` keeps the intent exactly — one
in-flight statement per socket, nothing queued behind it — while letting the
reservation handshake happen.

What it cost: `pickWinner` is entirely inside `db.transaction()`, because
AGENTS.md requires voting to be transactional. So every pick on production
threw `UNSAFE_TRANSACTION`, `handlePick`'s `catch` treated it as a stale pair
and advanced to the next battle, and Aura never moved for anyone. Reads are
not transactional, so the leaderboard and profiles looked perfectly healthy
throughout — the site appeared to work while the core loop scored nothing.

Verified against the production database before and after: `sql.begin` at
`max_pipeline: 0` fails with `UNSAFE_TRANSACTION`; at `1` and at the default
`100` it commits.

Rejected:
- Dropping to `max: 1` — also satisfies the driver's guard, but serialises
  every request in the instance onto one socket.
- `sql.reserve()` around the vote — the reservation `sql.begin` already does,
  written out by hand; it would work and it hides the real misconfiguration
  from every other transaction in the app.
- Removing the option — the default of 100 pipelines freely through a
  transaction-mode pooler, which is what the entry above exists to prevent.

## 2026-09-12 — Today's pick count is live client state, seeded by the server

Decision:
`battlesToday` is no longer a server prop read once per render. A small client
context (`src/components/battle/picks-today.tsx`) holds it, seeded from
`getHomeStats()` on every page render, and `pickWinner` returns the
authoritative count from inside its own transaction for the arena to publish.
Both places the arena block shows the figure — the pulse row's "N picks today"
and the stats bar's "Battles today" — read that one value.

Why:
The number a pick moves was the one number on the page that never moved. Both
counters were server props, so they sat frozen for the life of the page while
the voter kept picking; only the Live panel's tile corrected itself, on its own
45 s ping, which meant the same page could show two different figures for the
same thing. "Feedback is immediate" (DESIGN.md § Principles 6) applies to the
counter as much as to Aura.

The count comes back from inside the vote transaction rather than being
incremented locally, so it stays honest: it already includes this pick, it
includes everyone else's picks since the page loaded, and a repeat pick that
scored nothing reports the unchanged count instead of a fake bump. Published
monotonically, so a slow response cannot walk the number backwards.

Rejected:
- `router.refresh()` after each pick — refetches the whole tree, and the
  battle loop is meant to have no dead time (DESIGN.md § Principles 3).
- Incrementing locally on a counted pick — cheaper, but invents a number that
  drifts from the server and ignores every other voter.
- Polling it like the Live panel does — a second heartbeat for one integer,
  and still up to 45 s late for the voter's own pick.
- One live-stats provider shared with the Live panel — the right end state,
  but a larger refactor than this fix needs; the panel keeps its own poll and
  converges on the same figure.

## 2026-09-12 — The app connects in session mode, and max_pipeline is never set

Decision:
`DATABASE_URL` points at the Supabase pooler in **session mode** (port 5432 on
the pooler host), not transaction mode (6543). `max_pipeline` is not set at all,
and `max: 4` bounds what one function instance can take.

This reverses the "Rejected: switching to the session-mode pooler" line in the
2026-09-11 entry above. That rejection reasoned about pool size and never
tested correctness; transaction mode turned out not to work for this app at all.

Why:
Transaction mode hands a client's statements between backends. With
`prepare: false` every parameterised query uses a split
Describe → Flush → Execute exchange, and a handoff inside that exchange puts
parameters from one statement into another statement's Bind. The visible
result was `invalid input syntax for type integer: "f"` — `'f'` being the wire
encoding of a boolean from a different query — backends stuck `active` on
`ClientRead`, and requests hanging until they were cancelled.

Measured on the production build against the real database: transaction mode
failed 9 of 14 homepage requests; session mode passed 35 of 35, including 10
concurrent, at roughly half the latency (~0.55 s vs 1.2–3.2 s).

`max_pipeline` is left unset because both values it was ever given broke the
app — 0 disabled every transaction (see the entry above), 1 desynchronised the
protocol. The library default is correct.

Honest status:
Session mode did **not** end the outage on its own. After the switch and a
redeploy, production still failed 8 of 12 homepage requests, and backends were
still observed stuck `active` on `ClientRead` running the homepage's
recent-battles and recent-joins queries. So the pooler mode was one real
defect, not the whole cause. The remaining suspect is the homepage itself: it
fires roughly fifteen queries per render across several `Promise.all` groups,
and it is the only route that fails — every cached or lighter route
(`/leaderboard`, `/about`, `/rules`, `/sponsor`, creator profiles) has been
reliable at 0.2–0.5 s throughout. See ISSUES.md § 2026-09-12 "The homepage
fails roughly half the time in production".

Rejected:
- Staying on transaction mode — measured worse on every axis.
- The direct connection (`db.<ref>.supabase.co:5432`) — the host no longer
  resolves for this project, so it is not an option even for migrations.
- `max: 1` — hangs outright; postgres.js needs room for more than one socket.

## 2026-09-14 — One definition of the categories, enforced at the write path

Decision:
`CATEGORIES` lives in `src/lib/creator-schema.ts` — singular: **Indie
Developer, Builder, CEO/Founder** — and is the only definition. The submit
chips, the leaderboard filter and `creatorFieldsSchema` all read it, and
`category` is validated with `z.enum(CATEGORIES)` instead of a free string.
`scripts/seed.ts` types its category field as `Category`, so it cannot
produce a value the app does not know.

Why:
The list existed in a component while the values lived free-form in the
database, with nothing tying them together. They drifted: the UI shipped
singular, the rows stored plural, and the decision record said plural too. The
result was silent and total — every category chip filtered on exact equality
and matched nothing, so the board went empty. The taxonomy had already
flip-flopped three times in one day on 2026-09-07 without settling.

An enum at the write path is what makes this structural rather than a
convention. Both paths that create a creator — the checkout action and the
Dodo webhook — validate against the same list, so a value no filter can match
can no longer be stored. The enum immediately earned its place: it caught the
submit flow carrying `category` as an unconstrained `string`.

Data migrated with the decision: six creators from "Indie Developers" to
"Indie Developer", and the three seeded demo people (Kenji Osei, Mira Alston,
Priya Nandan) deactivated — they were fictional profiles on a live public
leaderboard whose categories (`dev`, `illustration`, `music`) predated the
taxonomy entirely. Their battle history is untouched, so no real creator's
Aura moved.

Rejected:
- Plural, to match the old record — it would have broken the newest real
  creator's row and every creator added since, to preserve a line of text.
- A tolerant filter (case- and plural-insensitive matching) — hides the drift
  instead of preventing it, and the next new value breaks it again.
- Recategorising the seeded three into Builder — an illustrator and a musician
  are not builders, and inventing a label for a fabricated person to fill a
  leaderboard is worse than removing them from it.

## 2026-09-17 — V1 is done; V2 begins

Decision:
The MVP Definition of Done for V1 was met as of 2026-09-17. V1 scope is shipped
and stable on production. [MVP.md](MVP.md) now carries the scope contract for **V2**
("Picker Identity via Receipts"), which begins immediately.

V2's opening feature is Receipts: proof you backed a creator before they blew up.
Identity is opt-in and never read by ranking — a picker can play battles forever
without an account, and spotting (the new identity-related action) never affects Aura,
pairing, battles, or leaderboard.

V1's "NOT V1" list is kept intact as historical record. V2's "NOT V2" list pulls
in each V2 item explicitly, and adds new deferred items (auto-spotting, `user_id`
on battles, public picker profiles, spot undo).

Why:
V1 was defined to answer a narrow question: can we build a trustworthy creator
ranking with minimal complexity? Yes, and it ships now. V2 asks: given that
foundation, can pickers get something for the trust they place in us early?
Receipts answers that.

Rejected:
- Extending V1 scope to include Receipts — Receipts requires identity, which
  V1 explicitly rejects ("picking stays account-free"). Reopening that in V1
  destabilizes the already-shipped boundary.
- Deferring Receipts to "V2 later" — identity is now a product lever that
  changes gameplay ("why create an account?"), so delaying it delays V2's
  value. Ship it now as Phase 1 of V2.
- Keeping separate codebases for V1 and V2 — this is one codebase that
  evolves. V1 is a historical fact, not a deployable branch.

## 2026-09-17 — Receipts: opt-in picker identity, spots are not picks

Decision:
**Spot** is a new deliberate action, separate from a pick. Tapping the eye button
on a battle card or creator profile never counts as a pick, never affects Aura,
pairing, battles, or leaderboard, and never increments the session's pick count.
It requires Google sign-in (entry point to Receipts); picking stays account-free.

After 5 picks in a session, a dismissible prompt appears: "5 battles in. Want us
to keep your receipts?" Tapping "Keep my receipts" routes to Google sign-in.
Dismissing sets a cookie; nudge reappears at 25 picks.

After sign-in, `/receipts` shows: battles played (all-time, all-time in Phase 1),
people backed (unique creators spotted), best spot card, and spot list with rank
at spot and current rank. `/receipts/card` renders a shareable OG image.

Rank at spot time is stored as a snapshot (`rank_at_spot`, nullable); if the
creator was in placement at spot time, `rank_at_spot = null` and the UI falls
back to "backed at {aura} Aura". This is an accepted risk for Phase 1 — future
phases can handle placement-time spots differently.

Why:
- **Spot is separate:** Conflating spot with pick tempts ranking/pairing to read it,
  breaking the invariant that identity never affects ranking. Spot is opt-in,
  pick is not; they must be separate tables and queries.
- **Google only in Phase 1:** Supabase Auth is already wired for Google, and
  Receipts is strong enough a use case to justify the sign-in friction. X later.
- **Session nudge:** After 5 picks, a voter has enough context to decide if
  Receipts matter to them. Nudging them then respects picker agency; forcing
  sign-in at pick #1 breaks rule 2 ("signing in is only ever offered, never required").
- **Dismissal cookie:** Respects the picker's choice; re-showing at 25 picks gives
  them another chance if they reconsider after more battle context.
- **Rank at spot is nullable:** Spotting a creator in placement has no rank to
  snapshot yet. Storing null and falling back to Aura is cheaper than retroactively
  computing rank when the creator gets ranked later.

Amends:
- 2026-09-05 (Google OAuth) — Google OAuth now has a UI entry point (Receipts nudge),
  whereas 2026-09-05 noted there was none in V1.
- 2026-09-10 (identity as opt-in) — Reinforces that a voter *may* have an identity
  (opt-in via Receipts), but facepile rule stands: voter faces are never shown.

Rejected:
- Auto-spotting every pick — Spot must be deliberate. A picker should feel the
  difference between "I think they're great" (spot) and "I pick them this round"
  (pick). Auto-spotting erases that distinction.
- `user_id` on `battles` table — Identity stays separate from ranking. Queries
  that rank creators never read `user_id`; attribution of battles to pickers is
  done via `battles.voter_session` → `picker_sessions.user_id` join, so the
  tables are decoupled. Adding `user_id` to battles risks a future dev reading it
  by mistake in a ranking query.
- Public picker profiles / facepile — Voters stay private in V2. A picker can
  share *their* receipts (what they spotted), but not a public URL where others
  can see who spotted whom (facepile risk). Deferred to V3+.
- Spot undo / un-spot — A spot is a historical record (like a pick). Once done,
  it stays. Future phases can add retraction UI if needed, but Phase 1 doesn't
  offer it.

## 2026-09-21 — OAuth redirect URLs are always built from the request origin

Decision:
Every sign-in entry point builds its Supabase `redirectTo` from
`window.location.origin`, through one shared helper
(`src/lib/supabase/callback-url.ts`). No sign-in code reads a
`NEXT_PUBLIC_*_URL` env var.

Why:
Two of the three entry points (the Spot/nudge prompt, the receipts pitch
button) built their callback URL from `NEXT_PUBLIC_SITE_URL` — present in
`.env.local`, absent from `.env.example` and the env schema, and unset on
Vercel. Supabase rejected the malformed URL against its redirect allow-list
and fell back to the dashboard Site URL, so `/auth/callback` — the only place
a profile was created — never ran for those two entry points, while the third
(`/sign-in`, already origin-based) worked. Same bug class as the 2026-09-05
entry above (`NEXT_PUBLIC_APP_URL` took down every profile page): a
deploy-time env var duplicating something the request already knows. See
`ISSUES.md § 2026-09-21`.

Rejected:
- Fixing only the two broken entry points — would leave three copies of the
  same URL-building logic to keep in sync by hand, which is exactly how this
  drifted the first time.

## 2026-09-21 — A missing profile self-heals; the auth callback is not the only path

Decision:
`getOrCreateProfile` (`src/lib/receipts/profile.ts`) creates a signed-in
user's profile — and links their voter session — the first time a page
actually needs one, rather than relying solely on the auth callback having
run. It fails closed to `null`; callers render a signed-in fallback, never
the signed-out pitch. It is called from `/receipts` and `/account` (both
`force-dynamic`) — not from the header avatar, which stays a plain read-only
lookup because it renders on every route, including ISR pages that must not
gain a write on render.

Why:
The callback was a single point of failure for identity: any way of skipping
it (a mis-built redirect URL, or a throw after the session cookies were
already set) left a signed-in user with no profile, permanently — `/account`
redirected them to `/receipts`, which showed the signed-out pitch. See
`ISSUES.md § 2026-09-21`.

Rejected:
- An `auth.users` insert trigger creating the row database-side — the
  canonical Supabase pattern, and it would have made this bug impossible.
  Not chosen because DATABASE.md keeps writes server-side via the service
  role and Drizzle owns the schema; worth revisiting if a fourth signed-in
  surface needs a profile.
- Self-healing from the header avatar too — its miss path costs a network
  call plus two inserts, which is a write on render; the avatar renders on
  every route including three ISR pages, so it stays read-only and simply
  shows once one of the two force-dynamic pages has healed the user.
