# AGENTS.md

Rules for Codex, Claude, and any coding agent working in this repo.
Read this before writing any code.

## Product

Underhyped is a social discovery game for emerging talent.

Core loop:

```
See two creators
→ choose who's more underhyped
→ Aura changes
→ get another battle
→ discover creators
→ creators share rankings
```

Tagline:
"Discover people before everyone else does."

## Product Principle

THE BATTLE IS THE PRODUCT.

Do not turn Underhyped into LinkedIn.

## V1 Stack

- Next.js
- TypeScript
- App Router
- React
- Tailwind
- shadcn/ui where appropriate
- Supabase (PostgreSQL + Auth)
- Drizzle ORM
- Zod
- Vercel

Service-level decisions (payments, images, analytics, email) live in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Do not introduce a different
provider than the one recorded there.

## Engineering Rules

- Server Components by default
- Client Components only when necessary
- Strict TypeScript
- Validate mutations with Zod
- Database transactions for voting
- Never modify Aura client-side
- RLS enabled and deny-by-default on every table; writes use the server-only
  service role key
- Drizzle owns the schema and migrations, not the Supabase dashboard
- No Supabase client queries from the browser for game data
- Keep dependencies minimal
- Prefer simple implementations
- Avoid premature abstractions

## Vocabulary

Use UI terminology in UI, routes, and user-facing copy.
Never mix the two vocabularies in one layer.

| Internal concept  | UI terminology            |
| ----------------- | ------------------------- |
| Elo rating        | Aura                      |
| Elo match         | Battle                    |
| User being ranked | Creator                   |
| Daily #1          | Main Character            |
| Leaderboard #2/#3 | Side Character / Plot Twist |
| Advertising       | Spotlight / Underhyped Spot |
| Vote              | Hype                      |
| Rank              | Rank                      |
| Pool              | Arena                     |
| Distinct voters   | People deciding           |

Full definitions: [docs/PRODUCT.md](docs/PRODUCT.md).

Hype (changed 2026-09-24, was "Pick"): choosing a creator in a battle is
hyping them, and a creator's Hype count is their wins. Aura is always shown
as 🔥 + number, Hype as ⚡ + number.

Never write "votes cast" as a number. One battle row is one pick, so it would
render the same figure as "battles fought" — use "people deciding" (distinct
voter sessions) instead.

## Scope

[docs/MVP.md](docs/MVP.md) is the scope contract.

If a feature is not in MUST HAVE, do not build it.
Good ideas that arrive mid-build go to [docs/ROADMAP.md](docs/ROADMAP.md).

## Do Not Add

Unless explicitly requested:

- comments
- DMs
- following
- jobs
- recruiter tools
- AI recommendations
- notifications
- teams
- mobile apps
- paid creator promotion
- complicated moderation

## Monetization

One clearly labeled homepage sponsor.

V1:
$30 / 30 days

Creators cannot buy Aura or ranking.

Paid sponsorship must never influence creator ranking.

## Documentation Rules

- Schema changes go in [docs/DATABASE.md](docs/DATABASE.md) first, then the code.
- Ranking math changes go in [docs/RANKING.md](docs/RANKING.md) first, then the code.
- Visual decisions come from [docs/DESIGN.md](docs/DESIGN.md). Do not invent brand.
  DESIGN.md is at **version 3**; where it marks a rule as "Changed in V2" or
  "Changed in V3", the newest rule is current and the older line is kept only
  so the change reads as deliberate. Do not "restore" it.
- Architectural choices get logged in [docs/DECISIONS.md](docs/DECISIONS.md).
- Any bug that reached a user gets an entry in [docs/ISSUES.md](docs/ISSUES.md):
  symptom, real cause, fix, and a Prevention line. Read that file before
  debugging anything — several of these have already shipped twice — and check
  new work against the recurring shapes listed at the top of it.
- No secrets in code. Every secret goes through `.env.example`.

## Before Completing Work

Run:

- typecheck
- lint
- tests
- production build

Do not declare a task complete if these fail.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
