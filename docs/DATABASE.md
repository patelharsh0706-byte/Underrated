# DATABASE.md

The canonical schema and its invariants.

Schema changes are made **here first**, then in code. Do not let a coding session
casually redesign the schema to work around a problem.

## Entities

```
users
sessions
creators
battles
sponsorships
visitor_pings
nominate
rank_snapshots   designed, not built — see below
```

## Relationships

```
User
 │
 └──── 0..1 Creator


Creator A ─┐
           ├── Battle
Creator B ─┘
              │
              └── Winner


Sponsor
   │
   └── Sponsorship
          │
          ├── start_at
          └── end_at
```

## Tables

### users

Owned by Supabase Auth — this is `auth.users`, managed by the third-party service.
Do not hand-roll auth columns and do not write to this schema.

```
id            uuid pk
email         text unique
created_at    timestamptz
```

Our tables reference `auth.users.id`. If we need our own profile fields beyond
what a creator has, add a `public.profiles` table keyed by that id — do not
extend `auth.users`.

### sessions

Owned by Supabase Auth. Not our table.

### creators

```
id                          uuid pk
user_id                     uuid fk → auth.users.id  null — always null for
                                       fee-submitted creators; the column
                                       stays for a future claim/edit flow.
username                    text unique
name            text
avatar_url      text            derived server-side in the payment webhook from
                                 the creator's primary social link via
                                 `getCreatorAvatarUrl` — never accepted from the
                                 client. It's an unavatar URL carrying a Dicebear
                                 PNG as its own `fallback=` param, so the stored
                                 URL always renders even when no real photo
                                 exists. See ARCHITECTURE.md § Creator avatars.
bio             text            one line
category        text
work_url        text            the strongest single piece of evidence —
                                 GitHub repo, portfolio, video, article, product,
                                 Spotify page. Shown as "View work" on the battle card.
socials         jsonb           { platform: url }, as many as the creator adds
primary_social  text            key into `socials` — which one shows on the
                                 battle card. Creator's choice, not ours.
follower_count  integer         null    self-reported by the creator, shown
                                         pre-vote instead of Aura (see below).
                                         Never fetched from a third-party API in
                                         V1 — that's an external signal, deferred
                                         to ROADMAP.md V3. Purely cosmetic: it
                                         never feeds the Elo calculation.
entry_fee_cents             integer  null    what they paid to submit, in
                                             cents. Null for seed/dev data
                                             predating the fee. Platform
                                             revenue — never read by ranking.
dodo_payment_id             text     null    unique, for webhook idempotency.
aura            integer         default 1500
battles_count   integer         default 0    also drives placement: a
                                               creator is "ranked" once
                                               battles_count >= 10 — derived
                                               at query time, not a separate
                                               column. See RANKING.md § Placement.
wins_count      integer         default 0
is_active       boolean         default true
created_at      timestamptz
```

**Why Aura is hidden until after voting:** showing 1523 vs 1500 before a pick tells
the voter what everyone else already decided, which defeats the point of asking
their own opinion. `follower_count` (or a placeholder if unset) fills that space
pre-vote; the before → after Aura change is revealed only once the pick lands.
This is a UI rule enforced in the battle card component, not a database concern —
noted here because it's the reason `follower_count` exists.

### battles

Immutable once written. This is the historical record.

```
id                uuid pk
creator_a_id      uuid fk → creators.id
creator_b_id      uuid fk → creators.id
winner_id         uuid fk → creators.id
voter_session     text            anonymous session identifier
aura_a_before     integer
aura_b_before     integer
aura_a_after      integer
aura_b_after      integer
created_at        timestamptz
```

Every row is a **scoring** battle. A session's repeat pick on a pair it has
already judged is not written at all — see RANKING.md § Scoring. So a row here
always means Aura moved, and every count derived from this table (Daily Heat,
battles today, distinct voter sessions) excludes farmed repeats without
filtering.

`voter_session` is read, not just recorded: the scoring check and placement's
`voter_count` both derive from it. Adding `(voter_session, creator_a_id,
creator_b_id)` as an index is the first move if the table grows past a few
thousand rows — deliberately not added at V1 size.

### sponsorships

```
id            uuid pk
sponsor_name  text
image_url     text     null — a sponsor may choose no logo; null renders as
                        a monogram, never a broken image. Derived from
                        target_url via unavatar.io, not a client-supplied URL.
description   text     null, optional, shown as a subtitle on the banner
target_url    text
start_at      timestamptz
end_at        timestamptz
dodo_payment_id text
created_at    timestamptz
```

### visitor_pings

One row per anonymous visitor, keyed by the same `voter_session` cookie
`battles.voter_session` already uses (see [session.ts](../src/lib/session.ts)
and [ARCHITECTURE.md](ARCHITECTURE.md#anti-abuse-v1-deliberately-light)) — no
new client-side identity is introduced.

```
id            uuid pk
voter_session text unique     same identity as battles.voter_session
first_seen_at timestamptz     set once, on first ping
last_seen_at  timestamptz     bumped on every ping
visit_count   integer default 1   see below
created_at    timestamptz
```

Powers the homepage's live stats bar: "visitors so far" is `count(*)`, "site
visits" is `sum(visit_count)`, and "N here now" is `count(*)` where
`last_seen_at` is within the last 90 seconds. The client pings every 45s
while the tab is visible — see [DECISIONS.md](DECISIONS.md).

A "site visit" is a fresh browsing session: `visit_count` increments only
when a ping arrives more than 30 minutes after that visitor's previous
`last_seen_at`. This is decided entirely server-side from timestamps already
on the row — no session flag is tracked on the client.

### nominate

One row per nomination — a stranger pointing at an X profile they think
belongs in the Arena. Pure lead capture: nothing here writes to `creators`,
touches Aura, or enters anyone into a battle. Reviewed manually; the operator
contacts the nominee on X and only submits them (through the normal paid
`/submit` flow, like anyone else) if they agree. See
[DECISIONS.md](DECISIONS.md) § 2026-09-22.

```
id             uuid pk
x_profile_url  text not null    normalized full URL, e.g. https://x.com/handle
handle         text not null    parsed handle — checked against creators.username
                                 so nominating someone already in the Arena is
                                 answered, not silently stored
note           text             optional, "why are they underhyped", <=140 chars
voter_session  text unique      same anonymous identity as battles/visitor_pings —
                                 the unique constraint is the one-nomination-per-
                                 session cap, enforced at the database level
created_at     timestamptz
```

Nothing promotes a row from here into `creators` automatically — there is no
"confirm" mechanism, no notification, no auto-entry. A nomination becomes a
creator only through the existing paid submit flow, same as anyone else.

### rank_snapshots

**Designed, not built.** Specced here because rank movement keeps being asked
for in design review and needs to be answered the same way every time: it is
not derivable from what we store today. Nothing reads or writes this table
until the feature is scheduled — see [MVP.md](MVP.md) NOT V1.

Rank is derived from `aura desc` at query time and never stored
([Derived, Not Stored](#derived-not-stored)). That gives today's rank and
nothing else, so "climbed to #4", "took the #1 spot" and the leaderboard's
trend arrow — all of which compare a rank to its earlier self — have no source.
One row per ranked creator per day is the smallest thing that fixes that.

```
id            uuid pk
creator_id    uuid fk -> creators(id)
rank          integer        position among ranked creators on that day
aura          integer        Aura at capture time, for "reached N Aura"
captured_on   date           UTC day, same boundary as Daily Heat
created_at    timestamptz
```

`unique (creator_id, captured_on)` — one snapshot per creator per day, so a
retried job cannot double-write.

Captured once daily by a scheduled job at the UTC day boundary, over ranked
creators only — a creator still in placement has no rank to snapshot, and
appears in this table for the first time on the day they clear placement.

Movement is then `yesterday.rank - today.rank`, positive meaning a climb. A
creator with no prior snapshot renders as "—", never as a climb from nowhere.

Retention: keep 90 days. Older rows answer no question the product asks, and
the table grows by one row per ranked creator per day forever otherwise.

### payments

One row per **successful** Dodo Payments payment, written by the webhook the
moment `payment.succeeded` arrives — before any attempt to create a creator
from it. This is the ledger of money received; `creators` is not.

```
id               uuid pk
dodo_payment_id  text unique      idempotency key — Dodo retries on non-2xx
amount_cents     integer
currency         text
customer_email   text             from Dodo's customer object, not the form
customer_name    text             from Dodo's customer object, not the form
x_profile_url    text             from the form data in payment metadata
work_url         text             from the form data in payment metadata
metadata         jsonb            raw payload metadata, kept even if unparseable
creator_id       uuid fk nullable → creators.id, set once a row exists
received_at      timestamptz
```

`customer_email` / `customer_name` are always present — Dodo collects them at
checkout. `x_profile_url` / `work_url` are only present when the payment
carried the submitted form as metadata; with the current static Payment Link
they are null, and they fill in once the checkout passes metadata again.

Why it exists: the submit flow sends people to a static Payment Link that
carries no form data, so the webhook could not create a creator and — until
this table — recorded nothing at all. Two real payments arrived on
2026-09-18 and left no trace anywhere in the database. `customer_email` and
`customer_name` come from Dodo's own checkout, so a payment is identifiable
and the payer contactable even when the form data is lost.

`creator_id IS NULL` is the orphan list: paid, no creator yet. When one is
added by hand, link it. The count of rows is the count of payments.

Only `payment.succeeded` is recorded. Failed, cancelled and pending intents
are not — a row here always means money was received.

## Invariants

These matter more than the columns. Enforce them in the database where possible,
in the server layer where not.

- `creator_a != creator_b`
- `winner` must be `creator_a` or `creator_b`
- `username` is unique
- a creator submission is never inserted until its Dodo Payments payment is
  confirmed by webhook — no unpaid/pending rows
- username availability is checked before payment, never after — don't
  charge someone for a username that turns out to be taken
- entry fee amount never influences Aura, pairing, or rank
- a `payments` row never influences Aura, pairing, rank, or which creators
  are served — it is a ledger, read by nothing in the game loop
- every `payment.succeeded` webhook produces a `payments` row, whether or
  not a creator could be created from it — money received is never silent
- Aura cannot be changed by the client
- every battle retains historical rating information (`aura_*_before` / `aura_*_after`)
- battle rows are never updated or deleted
- sponsorship periods cannot overlap
- expired sponsorships don't display
- a sponsor may have no logo — `image_url` null renders as a monogram,
  never a broken image
- only active creators participate in battles
- a vote writes the battle row and both Aura updates in a single transaction

## Row Level Security

Every table in `public` has RLS enabled with a deny-by-default policy. Writes
happen server-side with the service role key. See
[ARCHITECTURE.md](ARCHITECTURE.md#row-level-security).

Per table:

- `creators` — public read of active creators. No client write.
- `battles` — no client read of raw rows, no client write.
- `sponsorships` — public read of the currently active row only. No client write.
- `visitor_pings` — no client read, no client write. Only the server reads it,
  to compute the aggregate numbers shown on the stats bar; no policy is
  granted to the anon or authenticated roles at all.
- `nominate` — no client read, no client write. Writes go through the
  `submitNomination` Server Action under the service role; nobody but the
  operator reads the table (directly, via Drizzle Studio or a query), so no
  anon/authenticated policy is granted at all.
- `rank_snapshots` — when built: no client read, no client write. Written only
  by the scheduled capture job under the service role; the trend arrow is
  served from a server query like every other derived number.

## Indexes

```
creators(aura desc)        leaderboard
creators(username)         profile lookup
creators(is_active)        pool selection
battles(created_at)        Daily Heat
battles(winner_id, created_at)
battles(voter_session)         "people deciding" distinct count
sponsorships(start_at, end_at)
visitor_pings(voter_session)   upsert target, one row per visitor
visitor_pings(last_seen_at)    "N here now" / online count
nominate(voter_session)        unique — one nomination per session

rank_snapshots(creator_id, captured_on) unique   when built — one per day
rank_snapshots(captured_on)                      when built — day lookup
```

## Derived, Not Stored

- **Rank** — computed from `aura desc`, among ranked creators only. Never a column.
- **Placement / "ranked" status** — computed from `battles_count >= 10` at
  query time. Never a column. See [RANKING.md](RANKING.md) § Placement.
- **Daily Heat** — computed from today's battles. Never a column. See [RANKING.md](RANKING.md).
- **Main Character** — computed daily from Daily Heat.
- **People deciding** — `count(distinct voter_session)` over `battles`. The
  "Live on Underhyped" counter. Distinct from the battle count on purpose: one
  battle row *is* one pick, so a "votes cast" figure would be the same number
  as "battles fought". See [DECISIONS.md](DECISIONS.md) § 2026-09-10.

**Rank movement is the exception.** It cannot be derived, because we store only
the current Aura — the past rank is gone the moment it changes. That is what
`rank_snapshots` exists for, and why it is a table rather than a query.

If any of these become too slow, cache them. Do not denormalize them into `creators`
without recording the decision in [DECISIONS.md](DECISIONS.md).
