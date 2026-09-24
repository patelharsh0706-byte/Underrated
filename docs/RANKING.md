# RANKING.md

All ranking logic lives here. Changes are made here first, then in
`lib/ranking/`.

Two separate systems. Do not conflate them:

```
Aura            = long-term ranking
Main Character  = daily performance
```

Highest Aura is not the same as the hottest person today.

## Aura

Internally: Elo. In the UI it is only ever called **Aura**.

```
Starting Aura = 1500
Algorithm     = Elo
K             = 24
```

### Expected score

For creator A against creator B:

```
Ea = 1 / (1 + 10 ^ ((Rb - Ra) / 400))
Eb = 1 / (1 + 10 ^ ((Ra - Rb) / 400))
```

`Ea + Eb = 1`.

### Rating adjustment

Actual score `S` is 1 for the winner, 0 for the loser. There are no draws.

```
R' = R + K * (S - E)
```

### Winner update

```
Rw' = Rw + K * (1 - Ew)
```

### Loser update

```
Rl' = Rl + K * (0 - El)
      = Rl - K * El
```

### Rules

- Ratings are rounded to integers after each update.
- The two updates are symmetric: what the winner gains, the loser loses.
- Aura is computed server-side, inside the vote transaction, never on the client.
- One scoring pick per pair per session — see § Scoring below.
- `aura_before` and `aura_after` for both creators are stored on the battle row.
- Implement as pure functions in `lib/ranking/` with unit tests. No database access
  inside the math.

### Scoring

A session gets **one scoring pick per pair**. The first time a voter session
judges the matchup A vs B, the battle is recorded and Aura moves. Every later
A vs B from that same session is a no-op: no Aura change, no `battles_count`
increment, no row in `battles`.

```
scores = no earlier battle exists with this voter_session
         and this same unordered pair {A, B}
```

- **The unit is the pair, not the creator.** "A beat B" and "A beat C" are two
  different judgments and both score. Only the literal repeat of a question the
  session has already answered is discarded — that is the farming case, and it
  is the only information Elo genuinely already has.
- **Unordered.** A vs B and B vs A are the same matchup. A session cannot score
  twice by picking the other side on a re-serve.
- **Repeats are not recorded at all.** No `battles` row means every derived
  number — Daily Heat, Main Character, battles today, battles so far,
  `battles_count`, distinct voter sessions — excludes them for free, with no
  per-query filtering and no `scored` column. The cost is that a farming
  attempt leaves no audit trail; accepted for V1.
- The vote stays frictionless: the repeat is accepted and the voter advances to
  the next battle. The UI must say the pick did not count rather than animate a
  delta that did not happen — never show a number that is not real.

This caps what one browser can do. With `n` active creators a session can score
at most `n - 1` battles for any one creator, instead of an unlimited number.

### Pairing

- Both creators must be active.
- A creator cannot battle themselves.
- Placement priority: when any active creator has fewer than
  `PLACEMENT_BATTLES_REQUIRED` battles, one pairing slot goes to one of them
  (weighted random among the unranked pool, favoring fewest battles) on
  **every other battle**, alternating per voter. The other slot is drawn from
  the whole active pool with the mild bias below, so a new challenger gets
  calibrated against a mix of established Aura, not just other newcomers.
  Once no unranked creators remain, pairing is the plain mild-bias draw.

  The alternation is deliberate and replaces an earlier unconditional
  guarantee. With a small pool the unranked set is often a single creator, so
  "guaranteed" meant that one person appeared in *every* battle — the same
  face every time, which defeats discovery. Alternating is keyed on the
  voter's own battle count, not a coin flip, so a voter can never see two
  forced placement pairings in a row.

- General pairing: random from the active pool, with a mild bias toward
  creators who have fewer battles so new entries get rated quickly. **The
  bias is capped at `PLACEMENT_BATTLES_REQUIRED`**: every creator at or above
  that count is drawn with equal weight. Past placement a creator is
  calibrated, so further battles must not keep buying them exposure — without
  the cap, the gap between a 15-battle creator and a 35-battle one dominated
  the draw and the same opponent surfaced ~60% of the time.
- **Pairs a session has already judged are not served again** while any
  unjudged pair remains. Scoring is one pick per pair per session (§ Scoring),
  so re-serving a settled matchup offers a battle that cannot count. Pairing
  and scoring must agree about what is still live.

  The available set is derived per request, never stored. There is no
  "exhausted" flag on a session — the moment a new creator joins, every
  session that had run out gains a fresh pair against each existing creator
  and starts scoring again with no migration or reset. With `n` active
  creators there are `n(n-1)/2` pairs, so a small pool exhausts quickly: 6
  creators is 15 pairs, 20 is 190.

  When every pair really is judged, pairing falls back to the ordinary draw
  and serves a repeat, which scoring then declines. The voter keeps playing;
  nothing counts until the pool grows.

- **No creator appears in two battles in a row** while any alternative
  exists. The client sends the ids of the pair it just showed, and every pair
  containing either of them is ranked after every pair that doesn't. It is a
  sort key, not a filter: with too few creators to avoid them, they are
  still served rather than returning nothing.

  It outranks placement priority. A newcomer still gets the placement slot,
  just never two battles running. Ordered the other way, placement would
  override it and bring back the streak it exists to prevent.

  Why: "unjudged pairs first" plus a small pool means a new creator's pairs
  are often the *only* unjudged ones a session has left, so she appeared in
  every battle until each was used — 8 in a row with 9 creators, since the
  run length is always the number of other active creators. See
  [DECISIONS.md](DECISIONS.md) § 2026-09-24.

  The previous pair comes from the client, not the battle log: a repeat pick
  writes nothing, so the last recorded battle is not necessarily the last one
  shown.

- Nothing about pairing can be bought. Sponsors never enter the pool.

## Main Character

The daily #1. Recomputed for each calendar day (UTC).

**Daily Heat** for V1:

```
Daily Heat = wins today - losses today
```

Main Character = the creator with the highest Daily Heat for the day.

Tie-breakers, in order:

1. Higher win rate today
2. More battles today
3. Lower current Aura (favours the more underhyped creator)

Rules:

- A creator needs a minimum of 5 battles that day to be eligible. Prevents a 1-0
  record from taking the crown.
- A creator also needs `DAILY_HEAT_VOTERS_REQUIRED` (4) **distinct voter
  sessions that day**. Battle count alone measures volume, not agreement: one
  person can produce eight battles in three minutes, and that was enough to
  take the crown on day one. The crown should mean several different people
  rated you highly today, not that one person was busy.

  This mirrors the breadth condition in § Placement, applied to the daily
  system. Placement's version is lifetime; this one is same-day, because Main
  Character is recomputed per day and a lifetime measure would let yesterday's
  audience carry today's crown. An unranked creator can still be Main
  Character — the two systems stay separate — they just cannot get there on a
  handful of sessions.

  The floor gates eligibility for the whole daily board, exactly as the
  5-battle floor already does, so an ineligible creator is absent rather than
  listed without a crown.
- Main Character is computed from `battles`, not stored on `creators`.
- The day boundary is UTC. Do not make it local time.

## Rank

Rank is position by `aura desc`, among **ranked** creators only (see
Placement below). Always derived, never stored.

### Rank movement

Movement — "climbed to #4", "↑ 3", "took the #1 spot" — is **not** derivable
from the schema as it stands, and no amount of querying `battles` recovers it.
Rank depends on where every *other* creator sits, so a creator's past rank
cannot be reconstructed from their own past Aura: everyone moves when anyone
moves. The only way to know yesterday's rank is to have written it down
yesterday.

That is the `rank_snapshots` table in [DATABASE.md](DATABASE.md) — designed,
deliberately unbuilt. Until it exists, no surface may show a rank delta.
A trend column that needs a number today should show **24h Aura change**
instead, which *is* derivable from the `aura_*_after` columns on every battle
row, and which is a different claim honestly made.

This is a display concern, not ranking math: nothing here changes how Aura or
rank is computed.

## Placement

A creator needs enough battles **and** enough different people before they get
an official rank. Both conditions must hold:

```
ranked = battles_count >= PLACEMENT_BATTLES_REQUIRED (10)
         and voter_count >= PLACEMENT_VOTERS_REQUIRED (3)
```

- `battles_count` is the existing column on `creators`, incremented for both
  winner and loser inside the Aura transaction — no new counting concept.
- `voter_count` is the number of **distinct `voter_session` values across every
  battle the creator appeared in, won or lost**. Sessions that *judged* them,
  not sessions that *picked* them: counting picks would leave an unpopular
  creator unranked forever and would double-count what Aura already measures.
  Placement is calibration, not popularity.
- Derived on read from `battles`, never stored. No column, no migration —
  consistent with "Rank is derived, never stored".

The second condition is what makes the ranking mean something: a creator whose
Aura comes from one or two sessions is not credibly ranked, however sincere
those sessions are. It covers brigading as well as self-farming, and it is the
rule that keeps working as the pool grows — § Scoring alone caps a single
session at `n - 1` battles per creator, which is a weak cap once `n` is large.

While unranked:

- **Aura still updates live**, exactly as it does after placement. Nothing
  about the Elo transaction changes — placement only affects what's
  *shown*, never how Aura is computed.
- The creator has no numeric rank and is excluded from `/leaderboard` and
  the homepage Top 10. In the UI this reads as **"🔥 NEW CHALLENGER"** —
  never the word "unranked." It's framed as exciting (still being
  evaluated), not as a demotion.
- Daily Heat / Main Character eligibility is **unaffected** — it's the
  separate system above with its own 5-battles-*today* floor. A creator can
  clear that floor while still lifetime-unranked; that's expected, per "two
  separate systems, do not conflate."

Once both conditions hold, placement status flips immediately (no batch job,
no delay) — the same request that satisfies the last one also makes the
creator rank-eligible.

## Deliberately Not in V1

- Rating decay
- Category-scoped Aura
- Voter weighting or reputation
- Streak bonuses
- Rate limits, captchas, or IP heuristics on voting

Neither § Scoring nor the `voter_count` condition is voter weighting: no voter
is scored, trusted differently, or has their pick discounted. Both rules only
count how many distinct sessions participated, and both are deliberately blind
to who a session is.

If any of these become necessary, they go to [ROADMAP.md](ROADMAP.md) and get a
decision entry before implementation.
