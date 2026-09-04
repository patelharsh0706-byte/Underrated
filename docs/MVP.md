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
- **Live stats bar** — homepage panel showing total battles, visitors so far,
  submission-fee revenue, site visits, and a live "N here now" count, plus a
  "just happened" feed of recent creator joins. See [DECISIONS.md](DECISIONS.md).

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
