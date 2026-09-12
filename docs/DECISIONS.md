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
`max_pipeline: 0`, `idle_timeout: 20`, `max_lifetime: 300`, and
`connect_timeout: 10`.

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
