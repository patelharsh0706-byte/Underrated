# MVP.md

The scope contract for V1.

If it is not in MUST HAVE, it does not get built. No exceptions, no
"while we're here, let's also add...".

Anything that gets cut or deferred goes to [ROADMAP.md](ROADMAP.md).

## MUST HAVE

- **Home** — `/` explains the product in one screen and sends people into the
  Arena ("Start Hyping"): hero with the week's #1 creator, Top 10 This Week,
  Live on Underhyped, a live feed, a featured-battle teaser, and the Nominate
  banner. Real data only. See [DECISIONS.md](DECISIONS.md) § 2026-09-24.
- **Battle** — the Arena at `/arena`: two creators, hype one, next battle
  immediately. Works without an account.
- **Aura** — Elo rating updated in a transaction, server-side only. See [RANKING.md](RANKING.md).
- **Leaderboard** — creators ranked by Aura.
- **Main Character** — the daily #1 by Daily Heat, shown prominently.
- **Creator profiles** — avatar, name, username, one-line bio, category, external links, Aura, rank.
- **Discover** — browse creators outside the leaderboard.
- **Submit yourself** — gated by a one-time $3 entry fee (Dodo Payments
  Checkout), not an account. No login required. The fee is platform revenue and
  never affects ranking — see [DECISIONS.md](DECISIONS.md).
- **One $30 sponsor slot** — clearly labeled Spotlight on the Arena page, 30 days, zero ranking influence.
- **Mobile responsive** — the battle must feel right on a phone first.
- **Sharing** — shareable profile links with OG cards showing Aura and rank.
- **Live on Underhyped** — Home and Arena section: a live online
  count, four counters (battles fought, creators in the Arena, people deciding,
  and one reserved slot), and a "Just happened" activity ticker. Supersedes the
  V1 stats bar and the `ArenaStatsBar` component. See
  [DECISIONS.md](DECISIONS.md) § 2026-09-10.
- **Nominate** — a one-field form to point at an X profile someone thinks
  belongs in the Arena, with an optional 140-character note. Pure lead
  capture into the `nominate` table: no payment, no auto-entry, no
  notification. One nomination per anonymous session. Reviewed manually by
  the operator, who contacts the nominee on X and only submits them through
  the normal paid `/submit` flow if they agree. See
  [DECISIONS.md](DECISIONS.md) § 2026-09-22, which reverses the 2026-09-10
  "Nominations are not V1" decision.
- **Email signups** — the weekly-drop banner on Home and the footer's "Get
  the latest" box store an email in `email_signups`. Capture only: sending
  the weekly drop (via Resend) is a later change. See [DECISIONS.md](DECISIONS.md)
  § 2026-09-24.

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

- A stranger can land on the site and play the loop with no account, one tap
  from Home ("Start Hyping").
- Aura updates correctly and cannot be manipulated from the client.
- The leaderboard and Main Character are correct and update daily.
- A creator can sign in, submit themselves, and share their profile.
- One sponsor slot ($30 / 30 days) can be sold, displays for its period, and expires on its own.
- typecheck, lint, tests, and production build all pass.
