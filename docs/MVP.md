# MVP.md

The scope contract for V1.

If it is not in MUST HAVE, it does not get built. No exceptions, no
"while we're here, let's also add...".

Anything that gets cut or deferred goes to [ROADMAP.md](ROADMAP.md).

## MUST HAVE

- **Battle** — two creators, pick one, next battle immediately. Works without an account.
- **Aura** — Elo rating updated in a transaction, server-side only. See [RANKING.md](RANKING.md).
- **Leaderboard** — creators ranked by Aura.
- **Main Character** — the daily #1 by Daily Heat, shown prominently.
- **Creator profiles** — avatar, name, username, one-line bio, category, external links, Aura, rank.
- **Discover** — browse creators outside the leaderboard.
- **Submit yourself** — gated by a one-time $3 entry fee (Dodo Payments
  Checkout), not an account. No login required. The fee is platform revenue and
  never affects ranking — see [DECISIONS.md](DECISIONS.md).
- **One $30 sponsor slot** — clearly labeled homepage Spotlight, 30 days, zero ranking influence.
- **Mobile responsive** — the battle must feel right on a phone first.
- **Sharing** — shareable profile links with OG cards showing Aura and rank.
- **Live on Underhyped** — homepage section below Hottest 10: a live online
  count, four counters (battles fought, creators in the Arena, people deciding,
  and one reserved slot), and a "Just happened" activity ticker. Supersedes the
  V1 stats bar and the `ArenaStatsBar` component. See
  [DECISIONS.md](DECISIONS.md) § 2026-09-10.

## NICE TO HAVE

Build only if MUST HAVE is done, shipped, and stable.

- Animations on Aura change and battle transition
- Detailed creator statistics (win rate, battle history)
- Advanced OG cards
- Profile editing
- Sponsor analytics (impressions, clicks)

## NOT V1

Do not build these. Not partially. Not "just the schema for it".

- Comments
- Followers
- DMs
- Jobs
- Recruiters
- Nominations — putting someone *else* into the Arena. Keeps resurfacing in
  design review; settled as out of scope in [DECISIONS.md](DECISIONS.md)
  § 2026-09-10. Every creator enters by paying for themselves.
- Rank movement arrows / "climbed to #4" — needs the `rank_snapshots` table,
  which is specced in [DATABASE.md](DATABASE.md) but deliberately unbuilt
- Scout Score
- Talent Graph
- AI recommendations
- Auctions
- Ad bidding
- Notifications
- Creator monetization
- Premium accounts
- Mobile app

## Definition of Done for V1

- A stranger can land on the homepage and play the loop with no account.
- Aura updates correctly and cannot be manipulated from the client.
- The leaderboard and Main Character are correct and update daily.
- A creator can sign in, submit themselves, and share their profile.
- One homepage sponsor slot ($30 / 30 days) can be sold, displays for its period, and expires on its own.
- typecheck, lint, tests, and production build all pass.
