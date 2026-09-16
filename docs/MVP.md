# MVP.md

The scope contract for Underhyped. Currently tracking **V2** (Picker Identity).

## V1 is Shipped

The MVP Definition of Done for V1 was met as of 2026-09-17. See [DECISIONS.md](DECISIONS.md) § 2026-09-17 for the V1→V2 boundary.

## V2: The Scope Contract

If it is not in MUST HAVE, it does not get built. No exceptions, no
"while we're here, let's also add...".

Anything that gets cut or deferred goes to [ROADMAP.md](ROADMAP.md).

## V1 — MUST HAVE (Shipped)

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

## V2 — MUST HAVE

**Theme:** Picker Identity via Receipts

- **Spot** — Eye button on battle cards and creator profiles; deliberate action, separate from pick, never affects Aura or ranking.
- **Google sign-in** — Entry point to Receipts; opt-in identity, never required for picking.
- **Receipts page** (`/receipts`) — Private page showing: battles played (all-time in Phase 1), people backed, best spot card, spot list.
- **Share card** — OG image via `/receipts/card` endpoint; shareable proof of early backing.
- **Session nudge** — After 5 picks, dismissible prompt: "Want us to keep your receipts?" Reappears at 25 picks if dismissed.

## V2 — NICE TO HAVE

Build only if V2 MUST HAVE is done, shipped, and stable.

- Receipts weekly digest ("Your eye this week")
- X sign-in
- Public receipts URL (shareable individual receipts)
- Receipts analytics dashboard
- Un-spot / retract receipt
- Detailed creator statistics (win rate, battle history) ← V1 NICE TO HAVE
- Advanced OG cards ← V1 NICE TO HAVE
- Profile editing ← V1 NICE TO HAVE
- Sponsor analytics (impressions, clicks) ← V1 NICE TO HAVE
- Animations on Aura change and battle transition ← V1 NICE TO HAVE

## NOT V2

Do not build these. Not partially. Not "just the schema for it".

Inherited from V1 NOT scope (still out):
- Comments
- Followers
- DMs
- Jobs
- Recruiters
- Nominations — putting someone *else* into the Arena. Settled in [DECISIONS.md](DECISIONS.md) § 2026-09-10. Every creator enters by paying for themselves.
- Rank movement arrows / "climbed to #4" — needs the `rank_snapshots` table, which is specced but deliberately unbuilt
- Scout Score
- Talent Graph
- AI recommendations
- Auctions
- Ad bidding
- Notifications
- Creator monetization
- Premium accounts
- Mobile app

New NOT V2 (deferred to V3+):
- Auto-spotting every pick (Spot is deliberate only)
- `user_id` column on `battles` (identity stays separate from ranking)
- Public picker profiles / facepile (voters stay private)
- Spot undo / un-spot

## Definition of Done for V1 (Met 2026-09-17)

- A stranger can land on the homepage and play the loop with no account.
- Aura updates correctly and cannot be manipulated from the client.
- The leaderboard and Main Character are correct and update daily.
- A creator can sign in, submit themselves, and share their profile.
- One homepage sponsor slot ($30 / 30 days) can be sold, displays for its period, and expires on its own.
- typecheck, lint, tests, and production build all pass.

## Definition of Done for V2

- A picker can play battles without an account (unchanged from V1).
- After 5 picks, a dismissible Receipts nudge appears.
- A picker can tap an eye button (Spot) to spot a creator or their profile.
- Spotting requires Google sign-in; sign-in is only offered via Receipts, never required for picking.
- After sign-in, `/receipts` shows battles played, people backed, best spot card, and spot list.
- `/receipts/card` renders an OG image shareable via native share (mobile) or new tab (desktop).
- Spotting never affects Aura, pairing, battles, or leaderboard.
- typecheck, lint, tests, and production build all pass.
