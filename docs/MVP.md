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
  immediately. Anyone can browse and see battles; **the first pick asks for
  Sign in with X** (one account, one pick per battle) and the attempted pick
  is recorded right after sign-in.
- **Aura** — Elo rating updated in a transaction, server-side only. See [RANKING.md](RANKING.md).
- **Leaderboard** — creators ranked by Aura.
- **Main Character** — the daily #1 by Daily Heat, shown prominently.
- **Creator profiles** — the v2 layout (DECISIONS.md § 2026-10-04 "Onboarding
  from X and profile v2"): photo, name, @handle, tagline, location, links (𝕏 Say
  hi on X), status card (Aura, rank, win rate, battles, Hype), one ⚡ Hype button,
  About box (About, Working style, Open to, Into) and Cooking box (Currently /
  Previously cooked). No follower count.
- **Onboarding from X (v2, 2026-10-05)** — five steps: Welcome → Looking good?
  → You → Interests → History → "⚡ You're in." → your free public profile. Votes
  count only once the profile is finished. Existing creators auto-claim.
- **Enter the Arena from your profile** — a card on your own profile ("Think
  you're underhyped?") → $3 → you join battles; the card becomes your stats.
- **Edit your own profile** — the fields above; nobody can edit someone else's.
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
- **Underhyped Demos** — a second judging game for products: one
  15-second screen recording at a time, "Does this deserve hype?",
  **Underhyped ⚡ / Not yet 🥱**, then the result (% split, judges, product
  clicks, rank). Ranked in "Top demos this week" (RANKING.md § Demos). Makers
  upload a pre-recorded MP4/WebM (1280×720 landscape, 15 s max, 8 MB max), pay $3, and the
  operator reviews it before it enters the queue. A "for makers" card offers
  a Claude prompt for making the video. Built in two phases: **Phase 1** ships
  the pages on sample data (nothing saved); **Phase 2** adds storage (Vercel
  Blob), judgements, payment and review: the $3 is a static Dodo payment link
  (like `/submit`), matched to the demo by the maker's email; the operator
  approves in Supabase; ranking counts the last 7 days. See
  [DECISIONS.md](DECISIONS.md) § 2026-09-30 and § 2026-10-01.

## NICE TO HAVE

Build only if MUST HAVE is done, shipped, and stable.

- Animations on Aura change and battle transition
- Detailed creator statistics (win rate, battle history)
- Advanced OG cards
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

- A stranger can land on the site and see battles with no account, one tap
  from Home ("Start Hyping"); their first pick takes one X sign-in and is
  recorded without picking again.
- Aura updates correctly and cannot be manipulated from the client.
- The leaderboard and Main Character are correct and update daily.
- A creator can sign in, submit themselves, and share their profile.
- One sponsor slot ($30 / 30 days) can be sold, displays for its period, and expires on its own.
- typecheck, lint, tests, and production build all pass.
