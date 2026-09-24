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
| Analytics     | Vercel Web Analytics    |
| Email         | Resend                  |
| Hosting       | Vercel                  |

Not every service ships on day one. Resend and Dodo Payments can land after the
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
product-based, not ad-hoc-price-based like Stripe: each fee needs a pre-created
**Product** in the Dodo dashboard before any code can charge against it. Both
are now fixed-price, so neither needs "pay what you want" pricing enabled:

- submission fee — **$3**, `DODO_PAYMENTS_SUBMISSION_PRODUCT_ID`
- sponsor slot — **$30 / 30 days**, `DODO_PAYMENTS_SPONSOR_PRODUCT_ID`

The amount is still sent explicitly on the line item so the charge is correct
even if a product is misconfigured as pay-what-you-want.

**Sponsor slot** — the single Spotlight slot ($30 / 30 days). Webhook creates the
sponsorship row with `start_at` / `end_at`. Expiry is computed from the dates —
no cron required to hide an expired sponsor.

**Sponsor logo resolution** — a sponsor pastes one link (their site or a
social profile); we never collect a separate logo URL. `lib/unavatar.ts`
derives the fetch URL from it via [unavatar.io](https://github.com/microlinkhq/unavatar):
a recognized social host (`x.com`, `instagram.com`, `github.com`,
`tiktok.com`, `youtube.com`) resolves to that platform's real profile
picture (`unavatar.io/x/{handle}`); anything else falls back to a
domain-based logo/favicon lookup (`unavatar.io/domain/{hostname}`).

This was picked over Logo.dev (the actively-maintained Clearbit-successor,
better long-term backing, 500K free requests/month) because Logo.dev only
does domain lookups — no social-handle support, which we needed. unavatar is
a smaller, less certain-to-last project by comparison; the real risk isn't
its rate limit, it's the service disappearing outright the way Clearbit's
free logo API did in December 2025. Revisit if that happens.

The image URL is loaded directly in the browser (`<img src=unavatar.io/...>`,
not proxied through our server), so unavatar's 25-requests/day **per-IP**
anonymous limit is each visitor's own quota — never a shared bottleneck for
us. A failed lookup (dead domain, service outage) falls back client-side to a
monogram of the sponsor's initial rather than a broken image icon — see
`components/sponsor-logo.tsx` (the banner) and the live preview in
`components/sponsor/sponsor-form.tsx`.

**Sponsor form UX** — pasting a link resolves to a confirmation card
(`lib/unavatar.ts`'s `resolveSponsorProfile`) showing the detected logo and
source (e.g. "X Profile · x.com/loyal"), auto-shown as "Selected" — there's
only ever one candidate, so this confirms a deterministic result rather than
offering a real choice among several. That same resolution auto-fills Name
and Description, but **only for a recognized social profile** (the handle
gives us something to suggest); a plain website link leaves both blank for
the sponsor to fill in, since a bare domain doesn't reliably imply a display
name. Auto-fill never overwrites a field the sponsor has already typed in —
tracked with a touched-ref per field, not re-derived on every keystroke.
Logo removal is a **real, persisted** choice (not a preview toggle): clicking
"Remove" sets `logoRemoved`, which becomes `image_url = null` in the eventual
checkout metadata — see DATABASE.md.

No image storage is needed for sponsor logos specifically — the `Image
storage | Vercel Blob` row above stays reserved for any future
creator-uploaded asset.

**Creator avatars** — `/submit` uses the same link-first pattern, and
`getCreatorAvatarUrl` (`lib/unavatar.ts`) derives the stored `avatar_url` from
the creator's **primary social link**, server-side in the webhook, never from
client input.

**Project logos** — the same resolution runs on the creator's *work* link, via
`getUnavatarUrl`, so a domain resolves to its real favicon/logo
(`unavatar.io/domain/{hostname}`). It renders through
`components/domain-logo.tsx`, which falls back to the deterministic colour
mark the logo replaced — a domain with no favicon, or a visitor who has spent
their anonymous per-IP quota, sees exactly what the card showed before logos
existed rather than a broken image. Used on the `/submit` preview card and the
battle card's work link. Nothing is stored: the logo URL is derived from
`work_url` at render time, so it self-corrects when a site changes its icon.

The difference from sponsors: creators pass the generated Dicebear
illustration to unavatar as its own `fallback=` param rather than handling
failure client-side. unavatar then serves that fallback itself when it can't
find a real photo, so the one stored URL **always renders** — no `onError`
island needed on the battle card, Top 10, leaderboard, profile, or OG image.
The fallback must be Dicebear's `/png` endpoint, not `/svg`: Satori can't
rasterize SVG, the same trap `ogAvatarSrc()` works around.

Consequence to expect: real photos and generated illustrations sit side by
side on battle cards, because the 20 seeded creators are fictional and have no
real photo to resolve. Deliberate — it resolves itself as real creators
replace seed data.

**Creator submission fee** — replaces auth as the submission gate. Flow:

1. `/submit` collects the creator's fields. The price is **fixed at $3** and
   is never sent by the client — `SUBMISSION_FEE_CENTS` in
   `lib/creator-schema.ts` is applied server-side, so a crafted request can't
   submit for less. Username availability is checked **before** payment —
   never charge for a username that's taken.
2. A Server Action creates a Dodo checkout session against the pre-created
   submission product, setting the line item's `amount` from that constant,
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
   `/submit/success` looks the row up by `payment_id`, polling briefly if the
   webhook hasn't landed yet, then renders the welcome screen — it does not
   redirect to the profile. See [DECISIONS.md](DECISIONS.md) § 2026-09-11.

When steps 2-4 run through an API checkout session, `return_url` and
`cancel_url` are built from `getAppOrigin()` (the request's own Host header),
never from `NEXT_PUBLIC_APP_URL`. That env var went stale across the
underrated.lol -> underhyped.wtf move once already; pointing a paid
checkout's return at a dead domain is the worst place for it to happen again.

> **Currently shipping a static Payment Link instead.** `createSubmissionCheckout`
> validates the submission and redirects to `https://dodo.pe/submit`, which
> needs no API key. That skips step 2's metadata, so step 3's webhook inserts
> nothing and step 4 never finds a row — a paid submission needs a human to
> create it, and the submitted fields are not persisted anywhere. Steps 1-4
> above describe the intended flow and the webhook is already written for it;
> restoring it needs `DODO_PAYMENTS_API_KEY` and `DODO_PAYMENTS_WEBHOOK_KEY`.
> See [DECISIONS.md](DECISIONS.md) § 2026-09-11.

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

**Functions run in Tokyo (`hnd1`), pinned in `vercel.json`.** The Supabase
project is in `ap-northeast-1`, and Vercel's default region is Washington
(`iad1`). Left on the default, every query crossed the Pacific and the
homepage's parallel stat queries stalled until Postgres cancelled them. If
the database ever moves region, move this with it. See DECISIONS.md
§ 2026-09-11 "Vercel functions pinned to the database's region".

Secrets only via env vars declared in `.env.example`. Never commit `.env`.

## Quality Gates

Every task ends with: typecheck, lint, tests, production build. All must pass.
