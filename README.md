# Underrated

A social discovery game for emerging talent.

> Discover people before everyone else does.

See two creators. Choose who's more underrated. Aura changes. Get another battle.

**THE BATTLE IS THE PRODUCT.**

## Docs

| File | What's in it |
| ---- | ------------ |
| [AGENTS.md](AGENTS.md) | Rules for coding agents. Read first. |
| [docs/PRODUCT.md](docs/PRODUCT.md) | What Underrated is and why. Terminology. |
| [docs/MVP.md](docs/MVP.md) | The V1 scope contract. |
| [docs/DESIGN.md](docs/DESIGN.md) | Brand, visual language, UX rules. |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack and technical decisions. |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema and invariants. |
| [docs/RANKING.md](docs/RANKING.md) | Aura (Elo) and Main Character. |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Future ideas. Explicitly not V1. |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decision log. |

## Stack

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase
(Postgres + Auth) · Drizzle · Zod · Stripe · Vercel

## Getting Started

```bash
cp .env.example .env.local   # fill in your values
npm install
npm run db:push
npm run dev
```

## Before Shipping

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

All four must pass.
