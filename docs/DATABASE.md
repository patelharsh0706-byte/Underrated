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

## Indexes

```
creators(aura desc)        leaderboard
creators(username)         profile lookup
creators(is_active)        pool selection
battles(created_at)        Daily Heat
battles(winner_id, created_at)
sponsorships(start_at, end_at)
visitor_pings(voter_session)   upsert target, one row per visitor
visitor_pings(last_seen_at)    "N here now" / online count
```

## Derived, Not Stored

- **Rank** — computed from `aura desc`, among ranked creators only. Never a column.
- **Placement / "ranked" status** — computed from `battles_count >= 10` at
  query time. Never a column. See [RANKING.md](RANKING.md) § Placement.
- **Daily Heat** — computed from today's battles. Never a column. See [RANKING.md](RANKING.md).
- **Main Character** — computed daily from Daily Heat.

If any of these become too slow, cache them. Do not denormalize them into `creators`
without recording the decision in [DECISIONS.md](DECISIONS.md).
