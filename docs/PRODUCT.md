# PRODUCT.md

What Underhyped is, and why. Philosophy — not implementation.

## Problem

Talent is discovered too late.

The people who are genuinely good — the illustrator with 400 followers, the dev
shipping quietly, the musician with 12 monthly listeners — are invisible until an
algorithm decides otherwise. Existing platforms rank by what already won:
followers, engagement, reach. They reward the already-discovered.

There is no place on the internet to say "this person deserves more attention
than they are getting" and have that opinion count for something.

## Vision

Underhyped is where the internet decides who's criminally underhyped.

A game that produces a ranking that is genuinely interesting to look at — and
that creators want to share, because being high on it means something the follower
count doesn't say.

## Target Users

**The Voter** — internet-native, scrolls for fun, likes opinions and rankings.
Comes for the game, stays because the creators are actually interesting. Does not
need an account to play.

**The Creator** — emerging talent. Illustrator, dev, musician, writer, designer.
Wants visibility without begging for it. Submits themselves, shares their rank.

**The Sponsor (later)** — one brand at a time, on the homepage. Wants attention
from people who care about early talent.

V1 is built for the Voter. The Creator is the supply side. The Sponsor pays the bills.

## Core Loop

```
See two creators
→ choose who's more underhyped
→ Aura changes
→ get another battle
→ discover creators
→ creators share rankings
→ new voters arrive
```

The loop must be playable in under two seconds per battle, with no account.

## Value Proposition

**For voters:** a fast, opinionated discovery game. You find people before
everyone else does — and you have proof you were early.

**For creators:** a ranking you can earn and share, based on taste rather than
follower count.

**For sponsors:** one uncluttered slot in front of an audience that pays attention
to new talent.

## User Journeys

### Voter (first visit)

1. Lands on homepage — a battle is already on screen. No signup wall.
2. Picks one of two creators.
3. Sees Aura change, sees the winner's rank move.
4. Gets the next battle immediately.
5. After a few picks, taps a creator they liked → profile → external links.
6. Optionally visits the leaderboard or Main Character.

### Creator (submitting)

1. Arrives via a shared ranking or Main Character post.
2. Fills out their profile: name, username, category, one-line bio, a work
   link (their strongest evidence), and at least one social.
3. Pays a one-time entry fee — any amount from $1 — instead of signing in.
   No account. The fee is platform revenue and buys nothing about rank.
4. Enters the pool at starting Aura.
5. Gets battled. Checks their rank. Shares it.

### Creator (sharing)

1. Opens their profile.
2. Copies the link / shares the OG card showing Aura and rank.
3. Their audience arrives, votes, discovers other creators.

### Sponsor

1. Sees the Spotlight slot labeled on the homepage.
2. Buys 30 days for $30.
3. Their slot appears for exactly that period. It never touches ranking.

## Terminology

Define once. Use everywhere. Never let a route say `/matches` while the database
says `competitions`.

| Internal concept  | UI terminology              |
| ----------------- | --------------------------- |
| Elo rating        | Aura                        |
| Elo match         | Battle                      |
| User being ranked | Creator                     |
| Daily #1          | Main Character              |
| Advertising       | Spotlight / Underhyped Spot |
| Vote              | Pick                        |
| Rank              | Rank                        |

Additional terms:

- **Pool** — the set of active creators eligible for battles.
- **Daily Heat** — today's performance signal that decides Main Character. See [RANKING.md](RANKING.md).
- **Discover** — the browse surface for creators outside the leaderboard.

## Success Metrics

V1 is working if:

- **Picks per session** — median ≥ 10. The loop is the product; if people stop
  after two, the product is broken.
- **Return rate** — ≥ 20% of voters come back within 7 days.
- **Creator submissions** — steady weekly inflow without manual recruiting.
- **Share rate** — creators share their rank without being asked.
- **Profile click-through** — voters actually go look at people. Discovery is
  happening, not just button-mashing.

Explicitly *not* a V1 metric: signups. Voting does not require an account.

## Product Principles

1. **THE BATTLE IS THE PRODUCT.** Everything else is supporting cast.
2. **Do not turn Underhyped into LinkedIn.** No jobs, no recruiters, no networking.
3. **No account to play.** Friction kills the loop.
4. **Underhyped ≠ unknown.** The ranking measures a gap between quality and
   attention, not obscurity.
5. **Rankings cannot be bought.** Money buys the Spotlight slot and nothing else.
6. **Ship the boring version.** Simple implementations beat clever ones.
7. **Internet-native, not corporate.** See [DESIGN.md](DESIGN.md).

## Non-Goals

Underhyped is not:

- a social network — no following, no DMs, no comments
- a job board or recruiting tool
- a portfolio host
- a creator monetization platform
- an AI recommendation engine
- a moderation-heavy community

Ideas that belong to a later version go to [ROADMAP.md](ROADMAP.md), not into V1.
