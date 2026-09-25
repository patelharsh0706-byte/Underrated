# ROADMAP.md

Ideas that are explicitly **NOT V1**.

This file exists so good ideas do not infect the MVP. When you think
"dude, what if scouts could earn reputation?" — write it here and keep shipping.

Nothing in this file may be built without moving it into [MVP.md](MVP.md) first.

## V2

- Scout profiles
- Early believer system — credit for backing someone before they blew up
- Talent Scout Score
- Better creator verification
- 24h Spotlight
- 7-day Spotlight
- Sponsor analytics
- **Rank movement** — the leaderboard trend arrow, "climbed to #4", "took the
  #1 spot". Needs the `rank_snapshots` table already specced in
  [DATABASE.md](DATABASE.md) plus a daily capture job. The design exists and
  the schema is written; only the build is deferred. Until then surfaces show
  24h Aura change instead — see [RANKING.md](RANKING.md) § Rank movement.
- **Nominations** — putting another creator into the Arena. Out of V1 by
  decision ([DECISIONS.md](DECISIONS.md) § 2026-09-10). Open questions to
  answer before it can be scheduled: does a nomination skip the $3 entry fee,
  can the nominated person decline or remove themselves, and what stops a
  mass-nomination farm. It also weakens the current invariant that every
  creator in the Arena paid to be there.
- **Battle impressions** — logging every pairing *shown*, separately from the
  pick, so "votes cast" becomes a number that differs from "battles fought".
  Would let the live section carry a genuinely large activity figure; costs a
  write on every battle render, so it needs a decision entry first.
- **Activity feed persistence** — "Just happened" is currently assembled from
  joins, battles and Aura milestones at read time. If it grows past a handful
  of event types, it wants one `activity` table written at event time rather
  than a widening union query.
- Same-creator-same-IP daily voting cap — stops a creator from repeatedly
  picking themselves to inflate Aura. A given request IP can vote a given
  creator to victory at most once per UTC day. Needs a nullable `voter_ip`
  column on `battles` (captured via `x-forwarded-for`/`x-real-ip`, only
  trustworthy once actually deployed behind a real edge network — inert in
  local dev) and one indexed existence check inside `pickWinner` before
  recording a vote; negligible query cost, confirmed before deferring.
  Known gap even once built: it's per-IP not per-person, so shared IPs
  (office wifi, a household) share the cap, and a determined attacker can
  still cycle IPs — raises the cost of self-boosting, doesn't eliminate it.
- **GitHub Scout** — an operator-only scanner that finds underhyped builders
  on GitHub and drops them into the same manual review queue Nominate feeds.
  It never adds anyone to the Arena: the operator still invites, and the
  builder still enters through the paid `/submit` flow, so "every creator paid
  to be there" and consent both hold. The signal is the *gap*, not raw stars —
  stars measure hype, the opposite of underhyped. Examples: a repo gaining
  stars fast while its owner has few followers, merged PRs into respected
  projects from an unknown account, sustained output nobody has noticed.
  Source is public data (GitHub API, GH Archive) — the same data the
  $99+/month recruiter tools resell; what they actually charge for is contact
  enrichment, which this must never do. Open questions: which gap metric
  predicts a good battle card, how often it runs, and whether scanned leads
  should carry a note explaining why they were flagged. Motivated by the thin
  Arena (9 active creators on 2026-09-22). Not a recruiter tool — those stay
  in V3/V4.

## V3

- Talent Graph
- Search engine
- Recruiter discovery
- Advanced category reputation
- External signals (imported metrics that inform, never override, Aura)

## V4

- Spotlight bidding
- Talent intelligence
- Public API
- Recruiting tools

## Parking Lot

Unsorted ideas. No version, no commitment.

- Category-scoped leaderboards
- Weekly Main Character recap
- Rating decay for inactive creators
- Voter reputation weighting
- Embeddable rank badge

## Rules

- Adding to this file is free. Building from it is not.
- Anything here that touches ranking must not compromise: **rankings cannot be bought.**
- If an item conflicts with a product principle in [PRODUCT.md](PRODUCT.md), delete it.
