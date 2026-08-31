# AGENTS.md

Rules for Codex, Claude, and any coding agent working in this repo.
Read this before writing any code.

## Product

Underrated is a social discovery game for emerging talent.

Core loop:

```
See two creators
→ choose who's more underrated
→ Aura changes
→ get another battle
→ discover creators
→ creators share rankings
```

Tagline:
"Discover people before everyone else does."

## Product Principle

THE BATTLE IS THE PRODUCT.

Do not turn Underrated into LinkedIn.

## V1 Stack

- Next.js
- TypeScript
- App Router
- React
- Tailwind
- shadcn/ui where appropriate
- PostgreSQL
- Drizzle ORM
- Zod
- Vercel

Service-level decisions (Postgres provider, auth, payments, images, analytics,
email) live in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Do not introduce a
different provider than the one recorded there.

## Engineering Rules

- Server Components by default
- Client Components only when necessary
- Strict TypeScript
- Validate mutations with Zod
- Database transactions for voting
- Never modify Aura client-side
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
| Advertising       | Spotlight / Underrated Spot |
| Vote              | Pick                      |
| Rank              | Rank                      |

Full definitions: [docs/PRODUCT.md](docs/PRODUCT.md).

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
- Architectural choices get logged in [docs/DECISIONS.md](docs/DECISIONS.md).
- No secrets in code. Every secret goes through `.env.example`.

## Before Completing Work

Run:

- typecheck
- lint
- tests
- production build

Do not declare a task complete if these fail.
