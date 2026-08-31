# Build: Underrated — Discover People Before Everyone Else Does

Build a production-ready but intentionally simple MVP called **Underrated**.

The product combines the ideas of `underrated.lol` and `maincharacter.lol`.

The core experience is:

> **Two emerging creators appear. Pick who's more underrated.**

Users repeatedly vote in head-to-head battles. Votes influence creator rankings. Creators can submit themselves, appear on leaderboards, and share their profile/rank.

The goal of V1 is NOT to build another LinkedIn.

It should feel like a fun internet experiment that happens to create a useful discovery graph over time.

---

# 1. Tech Stack

Use:

- Next.js 16+
- TypeScript
- App Router
- React
- Tailwind CSS
- shadcn/ui where useful
- PostgreSQL
- PostgreSQL-backed authentication
- Drizzle ORM
- Zod for validation
- Vercel for deployment

Keep the architecture compatible with Vercel serverless deployments.

Use Server Components by default.

Only use Client Components where interactivity requires them.

Use Server Actions or Route Handlers for mutations.

Do NOT introduce:
- Redux
- GraphQL
- microservices
- Redis
- queues
- Elasticsearch
- Docker unless needed for local PostgreSQL
- unnecessary abstractions

Keep dependencies minimal.

---

# 2. Product Identity

Product name:

**Underrated**

Tagline:

**Discover people before everyone else does.**

Secondary line:

**The internet decides who's criminally underrated.**

Tone:

- playful
- internet-native
- slightly competitive
- clean
- not corporate
- not LinkedIn-like

Do NOT make this look like a SaaS dashboard.

The product should feel closer to an internet experiment/game.

---

# 3. Homepage

The homepage should immediately show:

UNDERRATED

Discover people before everyone else does.

Then the main interaction:

## WHO'S MORE UNDERRATED?

Show two creator cards side-by-side.

Example:

------------------------------------------------

MAYA                          ALEX

AI Writer                     Indie Developer

842 followers                 391 followers

Writes about AI               Built 6 indie apps
and technology                and open-source tools

[ MAYA 🔥 ]                   [ ALEX 🔥 ]

------------------------------------------------

Underneath:

"12,482 battles this week"

When someone votes:

1. Save the vote.
2. Update the creator ratings.
3. Animate/highlight the winner briefly.
4. Immediately load another pair.
5. Avoid showing the exact same matchup repeatedly.

The interaction should feel extremely fast.

Voting should be possible without logging in.

Anonymous votes should be associated with a privacy-conscious generated browser/session identifier so basic duplicate-vote protection can be implemented.

Do NOT use invasive fingerprinting.

---

# 4. Ranking Algorithm

Use a simple Elo rating system.

Every creator starts at:

1500 Elo

For every battle:

- winner gains Elo
- loser loses Elo

Use K-factor = 24 initially.

Implement the Elo calculation in one isolated utility with tests.

Store both the current rating and vote history.

Never rely only on the current rating because we may want to recalculate rankings later.

Expose the rating to users as:

**Aura**

Example:

🔥 1,728 Aura

Don't call it "Elo" in the UI.

---

# 5. Main Character

Add a daily competitive element.

Homepage should contain:

## 👑 Today's Main Character

Show the highest-performing eligible creator today.

Example:

👑 TODAY'S MAIN CHARACTER

Sarah Chen

AI Engineer

🔥 1,892 Aura

↑ 143 today

[ View Profile ]

Do NOT permanently award this based solely on all-time Elo.

Calculate daily momentum using battles during the current UTC day.

Keep the implementation simple for V1.

Also show:

"Resets daily"

This gives users a reason to return.

---

# 6. Leaderboard

Create:

/leaderboard

Tabs/filters:

- Today
- This Week
- All Time

Category filter:

- All
- Developers
- Designers
- Writers
- Founders
- Creators
- AI
- Other

Leaderboard rows:

#1 👑 Sarah Chen
AI Engineer
🔥 1,892 Aura
↑ 143 today

#2 Alex Kumar
Indie Developer
🔥 1,840 Aura
↑ 121 today

etc.

Make the leaderboard publicly accessible.

---

# 7. Creator Profiles

Route:

/u/[username]

Each creator page contains:

- avatar
- name
- username
- headline
- short bio
- category
- location (optional)
- follower count (optional)
- website
- X/Twitter
- GitHub
- LinkedIn
- current Aura
- current rank
- daily movement
- number of battles
- wins
- losses
- win rate

Prominently display:

"🔥 847 people think Alex is underrated."

Add:

[ Share Profile ]

Generate useful Open Graph metadata so shared creator URLs look good on X, LinkedIn, Discord, WhatsApp, etc.

Profile pages must be indexable by search engines unless the creator chooses otherwise later.

---

# 8. Submit Yourself

Create:

/submit

CTA:

**Think you're underrated? Prove it.**

Users must sign in before submitting a profile.

Form fields:

- Name
- Username
- Headline
- Bio
- Category
- Avatar URL/upload if simple to implement
- Website
- X/Twitter
- GitHub
- LinkedIn
- Approximate follower count

Validate everything using Zod.

Username must be unique.

After submission:

- create creator profile
- initialize Aura to 1500
- mark profile active
- redirect to creator profile

One authenticated account can own one creator profile in V1.

---

# 9. Authentication

Implement simple PostgreSQL-backed authentication.

Support:

- email
- password
- sign up
- login
- logout

Passwords must be securely hashed using a reputable password hashing library.

Use secure HTTP-only cookies for sessions.

Sessions must be stored/validated securely.

Implement:

/login
/signup

Do not build:
- social login
- organizations
- teams
- complex RBAC
- MFA

Keep authentication boring and secure.

---

# 10. Database

Use PostgreSQL with Drizzle.

Create a sensible schema containing at minimum:

## users

- id
- email
- password_hash
- created_at
- updated_at

## sessions

- id
- user_id
- expires_at
- created_at

## creators

- id
- owner_user_id
- username
- name
- headline
- bio
- avatar_url
- category
- location
- website_url
- twitter_url
- github_url
- linkedin_url
- follower_count
- aura
- is_active
- created_at
- updated_at

## battles

- id
- creator_a_id
- creator_b_id
- winner_id
- voter_user_id nullable
- anonymous_session_id nullable
- winner_aura_before
- winner_aura_after
- loser_aura_before
- loser_aura_after
- created_at

Add appropriate:

- foreign keys
- indexes
- unique constraints

Prevent a creator from battling themselves.

Design the schema so historical battles remain available for future ranking recalculation.

---

# 11. Matchmaking

Create a simple matchmaking algorithm.

Requirements:

- only active creators
- never creator vs themselves
- prioritize creators with reasonably similar Aura
- add enough randomness that the site doesn't become repetitive
- avoid immediately repeating recent matchups for the same visitor
- new creators should still get opportunities to appear

Do NOT build machine learning.

A straightforward SQL/application algorithm is enough.

---

# 12. Vote Integrity

This is a fun product, not an election system.

Implement reasonable V1 abuse protection without over-engineering.

At minimum:

- rate limit voting
- reject malformed requests
- verify both creators exist
- verify the winner belongs to the battle
- prevent obvious rapid duplicate voting
- don't trust Aura values sent by the browser
- perform rating updates server-side
- use a database transaction when recording a battle and updating ratings

Never let the client directly modify Aura.

---

# 13. Discover Page

Create:

/discover

Heading:

**Find your next "how are they not famous yet?" person.**

Allow filtering by:

Category

and sorting by:

- Rising
- Highest Aura
- Newest
- Most Battles

Display creator cards in a responsive grid.

Keep search/filtering server-side where practical.

---

# 14. Navigation

Desktop:

UNDERRATED

Battle
Discover
Leaderboard

[ Submit Yourself ]
[ Login/Profile ]

Mobile:

simple responsive navigation.

The primary CTA should always be:

**Battle**

---

# 15. Visual Direction

Use a minimalist `.lol` internet aesthetic.

Think:

- huge typography
- lots of whitespace
- strong borders
- slightly playful cards
- bold buttons
- minimal gradients
- subtle animations
- emoji used sparingly
- excellent mobile layout

Avoid:

- generic SaaS gradients everywhere
- glassmorphism
- excessive shadows
- giant corporate navbar
- stock photography
- dashboard-style sidebars

Creator cards should feel collectible/shareable.

The battle screen is the hero of the product.

---

# 16. Responsive Design

Mobile-first.

On desktop:

[ Creator A ] VS [ Creator B ]

On mobile:

stack the cards while keeping the choice obvious.

Voting must be extremely easy with one thumb.

Make sure buttons have appropriate touch targets.

---

# 17. Seed Data

Create a seed script containing at least 20 fictional creators across categories.

Example categories:

- AI
- Development
- Design
- Writing
- Founder
- Creator

Use obviously fictional people rather than pretending real people submitted themselves.

Give them realistic:

- bios
- follower counts
- usernames
- Aura values

This should make the deployed MVP immediately feel alive.

---

# 18. Analytics

Prepare clean event hooks for:

- battle_viewed
- vote_cast
- profile_viewed
- profile_shared
- signup_completed
- creator_submitted

Do not build an analytics platform ourselves.

Keep analytics integration optional through environment configuration.

---

# 19. SEO

Add proper:

- metadata
- titles
- descriptions
- canonical URLs
- sitemap
- robots.txt
- Open Graph metadata

Creator pages should have titles such as:

"Alex Chen — #14 AI Creator | Underrated"

Homepage:

"Underrated — Discover People Before Everyone Else Does"

---

# 20. Environment Variables

Provide `.env.example`.

Include variables required for:

DATABASE_URL
AUTH/session secret
NEXT_PUBLIC_APP_URL

and any other genuinely required variables.

Never commit secrets.

---

# 21. Vercel Deployment

The application must be straightforward to deploy on Vercel.

Document:

1. Create PostgreSQL database.
2. Configure DATABASE_URL.
3. Run migrations.
4. Seed database.
5. Configure environment variables.
6. Deploy to Vercel.

Do not assume localhost-specific infrastructure.

---

# 22. README

Write a good README containing:

- what Underrated is
- architecture
- stack
- local setup
- database setup
- migrations
- seeding
- environment variables
- development
- testing
- Vercel deployment

Include exact commands.

---

# 23. Testing

Add focused tests for important logic.

At minimum test:

- Elo calculations
- matchmaking constraints
- vote validation
- authentication helpers where practical

Don't chase arbitrary test coverage.

Test the parts where bugs matter.

---

# 24. Code Quality

Requirements:

- strict TypeScript
- no `any` unless genuinely unavoidable
- reusable components
- clear naming
- small server-side functions
- proper loading states
- proper error states
- proper empty states
- accessible HTML
- keyboard accessibility
- no obvious hydration problems
- no secrets exposed client-side

Avoid abstraction for abstraction's sake.

---

# 25. Critical Product Constraint

Do NOT expand the scope.

Do NOT implement:

- comments
- DMs
- following
- job board
- recruiter dashboard
- payments
- promoted profiles
- AI recommendations
- notifications
- teams
- mobile app
- complicated moderation
- talent marketplace
- API product

Leave obvious extension points where appropriate, but do not build them.

V1 exists to answer three questions:

1. Will people repeatedly battle creators?
2. Will creators care about their ranking?
3. Will creators share their profile/ranking publicly?

Everything else comes later.

---

# 26. Core User Journey

Optimize this exact journey:

Visitor lands on site

→ sees two creators

→ votes

→ sees another battle

→ votes several times

→ becomes curious about leaderboard

→ sees interesting creator

→ opens creator profile

→ realizes they can participate

→ signs up

→ submits themselves

→ receives their profile

→ shares their ranking

→ their audience visits

→ audience votes

→ loop repeats

This viral loop is more important than feature count.

---

# 27. Build Order

Implement in this order:

1. Initialize project and dependencies
2. PostgreSQL + Drizzle
3. Database schema/migrations
4. Seed data
5. Elo utility + tests
6. Battle matchmaking
7. Homepage battle UI
8. Voting transaction/API
9. Leaderboard
10. Creator profiles
11. Authentication
12. Submit profile
13. Discover
14. Main Character daily ranking
15. Responsive polish
16. SEO/Open Graph
17. README/deployment documentation
18. Final test/build/lint pass

After every major phase, verify the application still builds.

Do not leave placeholder implementations for core functionality.

---

# 28. Definition of Done

The MVP is done when I can:

- deploy it on Vercel
- open it on mobile
- immediately see two creators
- vote for one
- receive another matchup
- see Aura change
- view today's leaderboard
- see today's Main Character
- browse creators
- open `/u/username`
- create an account
- submit myself
- appear in future battles
- share my public profile

The project must pass:

- TypeScript checks
- linting
- tests
- production build

Before declaring completion, run all four and fix failures.

Finally, provide me with:

1. architecture summary
2. database schema summary
3. routes created
4. environment variables needed
5. exact local setup commands
6. exact migration/seed commands
7. exact Vercel deployment steps
8. known V1 limitations
9. recommended next three experiments

Most importantly:

**Build the simplest polished version that works.**

Do not turn this into LinkedIn.

The battle is the product.