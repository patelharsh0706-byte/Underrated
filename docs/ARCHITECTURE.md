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
| Database      | Supabase Postgres       |
| ORM           | Drizzle                 |
| Auth          | Supabase Auth           |
| Payments      | Dodo Payments           |
| Image storage | Vercel Blob             |
| Analytics     | PostHog                 |
| Email         | Resend                  |
| Hosting       | Vercel                  |

Not every service ships on day one. PostHog, Resend, and Dodo Payments can land
after the core loop. But nothing else is allowed in their place.

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

Supabase Auth, against the same Supabase Postgres. Users live in the `auth.users`
schema; our tables reference them by id.

- Voting: no account.
- Submitting a creator: **no account either** — gated by a Dodo Payments entry fee
  instead. See Payments below and [DECISIONS.md](DECISIONS.md). Submitted
  creators are unclaimed (`user_id` null) — DATABASE.md already allowed this.
- Google OAuth is fully built (sign-in page, `/auth/callback`, sign-out
  action) but currently has no entry point in the UI. It's not wired to
  submission anymore; kept because a future "manage/edit your profile"
  feature will need some notion of identity, and rebuilding this from
  scratch would be wasted work. Do not delete it without discussing first.
- Sign-in, if reintroduced, is Google OAuth only — no email/password, no
  magic link. Requires a Google OAuth client configured in Supabase Auth →
  Providers (authorized redirect URI: `<SUPABASE_URL>/auth/v1/callback`).

Supabase is a third-party service. Treat it as Postgres + a hosted auth provider —
not as the application layer:

- Drizzle owns the schema in the `public` schema. Migrations run through Drizzle,
  not the Supabase dashboard.
- Do **not** hand-write into `auth.*`. That schema belongs to Supabase.
- No Supabase client queries from the browser for game data. Reads and writes go
  through Server Components and Server Actions.
- Do not adopt Supabase Realtime, Storage, or Edge Functions in V1. Images go to
  Vercel Blob as recorded above.

## Payments

Two independent Dodo Payments Checkout flows, both webhook-driven. Dodo is
product-based, not ad-hoc-price-based like Stripe: a fee needs a pre-created
**Product** in the Dodo dashboard with "pay what you want" pricing enabled
(minimum $1) before any code can charge against it — that product's ID is
`DODO_PAYMENTS_SUBMISSION_PRODUCT_ID`.

**Sponsor slot** — the single Spotlight slot ($30 / 30 days). Webhook creates the
sponsorship row with `start_at` / `end_at`. Expiry is computed from the dates —
no cron required to hide an expired sponsor.

**Creator submission fee** — replaces auth as the submission gate. Flow:

1. `/submit` collects the creator's fields and a fee amount (any amount from
   $1, preset buttons + custom). Username availability is checked **before**
   payment — never charge for a username that's taken.
2. A Server Action creates a Dodo checkout session against the pre-created
   submission product, overriding its price via the line item's `amount`
   (only takes effect because that product has pay-what-you-want enabled),
   with the full creator payload serialized into session metadata, and
   redirects to the returned `checkout_url`.
3. `payment.succeeded` webhook (`/api/dodo-payments/webhook`) verifies the
   signature via the SDK's `webhooks.unwrap()` (needs the `webhook-id`,
   `webhook-signature`, `webhook-timestamp` headers), re-validates the
   metadata with the same Zod schema (never trust a webhook payload beyond
   its signature), and inserts the creator row — `user_id` null,
   `entry_fee_cents` (from `total_amount`) and `dodo_payment_id` set for
   audit. Insert is idempotent on `dodo_payment_id` in case the webhook
   retries.
4. Dodo appends `?payment_id=...&status=...` to `return_url` itself (no
   template placeholder needed, unlike Stripe's `{CHECKOUT_SESSION_ID}`).
   `/submit/success` polls briefly for the row to land (webhook delivery
   isn't instant) then redirects to the new profile.

The fee is platform revenue. It never touches Aura, pairing, or rank — see
[PRODUCT.md](PRODUCT.md)'s "rankings cannot be bought" principle, which this
was explicitly designed not to violate.

Local webhook testing needs the Dodo Payments CLI, which forwards webhook
events (with real signature headers) to a local endpoint — not something that
can be verified without the developer's own Dodo account.

## Anti-Abuse (V1, deliberately light)

- Rate limit picks per IP + session.
- Anonymous voters get a signed cookie identifying the session.
- No CAPTCHA, no complicated moderation. If it becomes a problem, it goes to
  [ROADMAP.md](ROADMAP.md) — not into V1 mid-build.

## Row Level Security

Supabase exposes Postgres over a public API, so RLS is a hard requirement, not a
nicety.

- RLS is **enabled on every table** in `public`.
- Default policy is deny. No anonymous or authenticated role gets direct write
  access to `creators`, `battles`, or `sponsorships`.
- The server uses the service role key, which bypasses RLS. That key is
  server-only and must never reach the client bundle.
- The anon key may only ever support read policies. `aura` is never writable by
  any client-facing role — this is the database-level backstop for
  "never modify Aura client-side".

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

- Local: Supabase project (or `supabase start` locally), `.env.local`
- Production: Vercel, production Supabase project

Secrets only via env vars declared in `.env.example`. Never commit `.env`.

## Quality Gates

Every task ends with: typecheck, lint, tests, production build. All must pass.
