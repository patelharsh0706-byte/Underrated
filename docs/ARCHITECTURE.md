# ARCHITECTURE.md

Technical decisions. Locked in so that every session builds the same system.

Do not substitute a different provider because it seemed easier in the moment.
If a decision here needs to change, change it here first and log it in
[DECISIONS.md](DECISIONS.md).

## Stack

| Layer         | Choice                  |
| ------------- | ----------------------- |
| Framework     | Next.js (App Router)    |
| Language      | TypeScript (strict)     |
| UI            | React, Tailwind, shadcn/ui where appropriate |
| Validation    | Zod                     |
| Database      | Neon Postgres           |
| ORM           | Drizzle                 |
| Auth          | Better Auth (Postgres adapter) |
| Payments      | Stripe                  |
| Image storage | Vercel Blob             |
| Analytics     | PostHog                 |
| Email         | Resend                  |
| Hosting       | Vercel                  |

Not every service ships on day one. PostHog, Resend, and Stripe can land after the
core loop. But nothing else is allowed in their place.

## Rendering

- Server Components by default.
- Client Components only for interaction: the battle, the pick, the Aura counter.
- The battle page prefetches the next pair so the loop never waits.
- Leaderboard and profiles are server-rendered and cached; cache is invalidated on
  Aura change or revalidated on a short interval.

## Data Flow

```
Client                Server                     Database
------                ------                     --------
pick (creator id)  →  Server Action
                      Zod validate
                      load both creators
                      compute Elo          ─┐
                      write battle row      ├─ single transaction
                      update both Auras    ─┘
                   ←  new Aura + next battle
```

Rules:

- Aura is computed and written **server-side only**. The client never sends a rating.
- Every vote is one database transaction. A battle row and both rating updates
  commit together or not at all.
- Every mutation is validated with Zod at the server boundary.
- Battle pairs are chosen server-side and the pairing is verified when the pick
  comes back — a client cannot submit a pick for a pair it was never shown.

## Auth

Better Auth against the same Postgres. Sessions in the database.

- Voting: no account.
- Submitting or editing a creator: account required.
- One account owns at most one creator.

## Payments

Stripe Checkout for the single Spotlight slot ($30 / 30 days). Webhook creates the
sponsorship row with `start_at` / `end_at`. Expiry is computed from the dates —
no cron required to hide an expired sponsor.

## Anti-Abuse (V1, deliberately light)

- Rate limit picks per IP + session.
- Anonymous voters get a signed cookie identifying the session.
- No CAPTCHA, no complicated moderation. If it becomes a problem, it goes to
  [ROADMAP.md](ROADMAP.md) — not into V1 mid-build.

## Project Structure

```
app/                Next.js App Router routes
  page.tsx          homepage — the battle
  leaderboard/
  discover/
  c/[username]/     creator profile
lib/
  db/               Drizzle schema, client, migrations
  ranking/          Elo + Daily Heat (pure functions, unit tested)
  auth/
components/
docs/
```

Ranking math lives in `lib/ranking/` as pure functions with no database access, so
it can be tested directly. See [RANKING.md](RANKING.md).

## Environments

- Local: Neon branch, `.env.local`
- Production: Vercel, Neon main branch

Secrets only via env vars declared in `.env.example`. Never commit `.env`.

## Quality Gates

Every task ends with: typecheck, lint, tests, production build. All must pass.
