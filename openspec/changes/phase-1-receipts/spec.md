# Phase 1: Spot + Sign-in + Receipts — SDD Spec

**Status:** Specification  
**Created:** 2026-09-17  
**Change ID:** phase-1-receipts  
**Product Version:** V2.0 (Picker Identity)

## Problem Statement

V1 is shipped (MVP Definition of Done met). V1 asks: "Why would a voter ever create an account?"

**Answer: Receipts** — proof you backed a creator before they blew up.

Example: "You spotted Maya at #47 → she's now #8" — verifiable, sharable proof of early belief.

## Solution Overview

- **Spot** — new deliberate action, separate from a pick (eye button on battle cards + profile)
- **Spot requires sign-in** — Google OAuth only, entry point is Receipts
- **Spot never affects ranking** — Aura, pairing, battles are unchanged
- **Receipts page** — private, shows battles played + people backed + best spot card + spot list
- **Share card** — OG image via `/receipts/card` endpoint
- **Session nudge** — after 5 picks, dismissible "Keep my receipts?" prompt

## Scope — MUST HAVE (Phase 1)

1. **Spot action** — eye button on battle cards and creator profiles
2. **Google sign-in** — OAuth callback links voter session to user identity
3. **Receipts data model** — `spots` and `picker_sessions` tables with RLS
4. **Receipts page** (`/receipts`)
   - Signed-out: explainer + sign-in button
   - Signed-in: battle count, people backed, best spot card, spot list
5. **Share card** — `/receipts/card` OG image endpoint
6. **Session nudge** — "Keep my receipts?" prompt after 5 picks
7. **Spot button** — on battle arena and profile page
8. **Mobile responsive** — nudge, prompt, receipts page, spot button
9. **Documentation updates**
   - DATABASE.md: schema, RLS, invariants
   - DECISIONS.md: V1→V2 boundary, Receipts design rationale
   - MVP.md: retitle to V2 scope contract, add V2 MUST HAVE / NICE TO HAVE / NOT V2
   - DESIGN.md: spot button spec, receipts prompt, nav update
   - ARCHITECTURE.md: auth entry point, identity opt-in
   - PRODUCT.md: Receipts in the loop

## Scope — NICE TO HAVE (Post-Phase 1)

- Weekly window on Receipts (all-time in Phase 1)
- X sign-in
- Public receipts URL
- Receipts analytics
- Spot undo/unsporting

## NOT V2 (Phase 1)

- Auto-spotting every pick
- `user_id` stored on `battles` table (identity stays separate)
- Public picker profiles / facepile (voters stay private)
- Nominations (out of scope as per V1 DECISIONS.md)

## Data Model

### `spots` table

```sql
CREATE TABLE spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES creators(id),
  rank_at_spot int, -- NULL while creator in placement, computed from aura_at_spot
  aura_at_spot int NOT NULL, -- immutable snapshot at spot time
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, creator_id),
  -- Indexes
  KEY idx_spots_user_id (user_id),
  KEY idx_spots_creator_id (creator_id)
);
-- RLS enabled, no policies (server-only via service role)
```

### `picker_sessions` table

```sql
CREATE TABLE picker_sessions (
  voter_session text PRIMARY KEY, -- same value as battles.voter_session
  user_id uuid NOT NULL REFERENCES auth.users(id),
  linked_at timestamptz NOT NULL DEFAULT now(),
  -- Indexes
  KEY idx_picker_sessions_user_id (user_id)
);
-- RLS enabled, no policies (server-only via service role)
-- First link wins: on conflict do nothing
```

### Invariants

- One spot per user per creator (`UNIQUE` constraint)
- Spots are never updated or deleted in Phase 1
- `rank_at_spot` is NULL if creator was in placement at spot time
- `aura_at_spot` is immutable snapshot (never null, indexed for fast rank lookup)
- Battles table is immutable; voter identity attribution via `voter_session` → `picker_sessions` join
- RLS enabled on both tables; all reads/writes via service role (server-side only)

## Acceptance Criteria

### Database & Auth

- [ ] Migration `drizzle/0008_spots_receipts.sql` creates both tables with indexes
- [ ] RLS enabled on `spots` and `picker_sessions`
- [ ] `src/lib/auth.ts` exports `getUserId()` returning `claims.sub ?? null`
- [ ] `src/lib/supabase/oauth.ts` exports `startGoogleSignIn(next)` 
- [ ] Auth callback links voter session to user ID via `linkPickerSession()`
- [ ] Typecheck and tests pass

### Spot Action

- [ ] `spotCreator({creatorId})` server action succeeds with verified data
- [ ] Spot returns `{ok: true, rankAtSpot, alreadySpotted}` or `{ok: false, reason}`
- [ ] No user ID → `reason: "auth"`
- [ ] Creator missing/inactive → `reason: "unavailable"`
- [ ] `rankAtSpot` is null if creator in placement, else computed rank
- [ ] Duplicate spot → `alreadySpotted: true`
- [ ] Spot never affects battles/Aura (verified by query before/after)

### UI Components

- [ ] Spot button on battle arena (top-left, 36px circle, lime on spotted)
- [ ] Spot button on profile page (pill with 👁 icon next to share)
- [ ] Receipts prompt (nudge variant after 5 picks, spot variant on unsigned-out tap)
- [ ] Prompt closes on Escape/backdrop, Google button routes to sign-in
- [ ] Session pick count exposed via `getRandomPair()` / `nextBattle()`
- [ ] Nudge dismissal saves to `underhyped_receipts_nudge` cookie

### Receipts Page

- [ ] `/receipts` route exists and is ISR-free (`force-dynamic`)
- [ ] Signed-out: shows explainer, eyebrow "RECEIPTS", sign-in button
- [ ] Signed-in: layout per design (eyebrow, h1 "YOUR EYE SO FAR", counters, best spot, list, share button, sign-out)
- [ ] Counters: "N battles played" and "N people backed" (correct counts)
- [ ] Best spot card shows name, "YOU BACKED {NAME} AT #47", rank climb "→ #8"
- [ ] Spot list shows avatars, rank climb, aura at spot
- [ ] `/receipts/card` endpoint generates OG image (1200×630, private cache)
- [ ] Share button uses native share on mobile, opens `/receipts/card` in new tab on desktop
- [ ] `robots: noindex` prevents search indexing

### Navigation & Links

- [ ] Site header nav includes `/receipts` link (Server Component)
- [ ] All internal routes to `/receipts` typecheck (Next 16 routes)

### Documentation

- [ ] DATABASE.md section on `spots`, `picker_sessions`, RLS, attribution join
- [ ] DECISIONS.md entries dated 2026-09-17 (V1→V2 boundary, Receipts rationale)
- [ ] MVP.md retitled for V2, MUST HAVE includes Spot + Receipts, NICE TO HAVE updated
- [ ] DESIGN.md: spot button spec, prompt variants, nav update, rule 2 amended
- [ ] ARCHITECTURE.md § Auth: Receipts as entry point, identity opt-in, never read by ranking

### Verification

- [ ] `npm run typecheck && npm run lint && npm run test && npm run build` all pass
- [ ] `PREVIEW_MOCK=1`: homepage renders eye buttons (no-op), `/receipts` shows signed-out explainer
- [ ] Real DB flow: 5 picks → nudge → tap Spot → auth → lands on `/receipts` with "5 battles played"
- [ ] Spot in arena (eye fills lime) and profile; `/receipts` lists both; share works on mobile/desktop
- [ ] Verify Aura/battles unchanged by spotting (query before/after)
- [ ] Profile page ISR still works (revalidate=15, cookie-free)

## Key Decisions & Rationale

**Spot is separate from pick:**
- Solves discovery problem: "I could have spotted them earlier"
- Doesn't double-count: spot never affects Aura, pairing, or leaderboard
- Feels intentional, not automatic

**Spot requires sign-in:**
- Only entry point to authentication
- Receipts justify account creation
- Picking stays anonymous (rule 2: "Sign-in exists only to keep receipts, and is only ever offered, never required")

**Rank at spot time is optional:**
- Early spotters (creator in placement) get `rank_at_spot = null`
- UI falls back to "backed at {aura} Aura"
- Accepted risk for MVP of Receipts

**RLS enabled, no policies:**
- All reads/writes server-side via service role (like `visitor_pings`)
- No client-side leaks
- Simpler than row-level policies

**First session link wins:**
- `on conflict do nothing` prevents one voter from linking multiple accounts
- If a voter creates two accounts, only the first link persists
- Later sessions with the same `voter_session` are ignored

## Vocab & Terminology

- **Spot** — eye action on a creator; deliberate, separate from pick
- **Receipts** — proof of early backing; sharable via OG card
- **Picker** — authenticated voter (has identity via Google)
- **Voter** — any person playing (signed-in or out)
- **Battles played** — total picks in picker's lifetime (not session-specific in Receipts)
- **People backed** — count of unique creators spotted

Never use: "votes cast", "followers", gendered pronouns (use names).

## Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Early spots have `rank_at_spot = null` — no "#47 → #8" line | Medium | UI falls back to "backed at {aura} Aura"; flagged in UI comment |
| `getClaims()` is network call on symmetric-JWT projects | Low | Never called in ISR paths (profile page stays cookie-free) |
| `DIRECT_URL` broken per DECISIONS 2026-09-12 | Medium | Apply migration via Supabase MCP if `db:migrate` fails; confirm path |
| Vocabulary confusion ("votes" vs "battles") | Low | AGENTS.md + PRODUCT.md document vocab; PR review catches usage |
| Hydration mismatch on nudge dismissal cookie | Low | Read cookie only in `useEffect`, never SSR |

## Testing Strategy (Strict TDD)

For each task (commit), the pattern is:

1. **RED** — Write failing test for acceptance criteria
2. **GREEN** — Implement code to pass test
3. **REFACTOR** — Improve without breaking test

### Test Coverage

- **Unit tests** (`src/lib/receipts/*.test.ts`): nudge logic, best-spot selection, rank computation
- **Integration tests** (`queries.test.ts`): spot insert, session link, receipts query
- **E2E verification** (manual in phase-verify): sign-in flow, spot button, receipts page, share card

### Evidence Trail

Each task commit includes:
- Test file(s) with passing tests
- Implementation code
- Updated docs if applicable

Phase-verify confirms: typecheck ✅, lint ✅, all tests passing ✅, build succeeds ✅.

## References

- [DECISIONS.md](../../docs/DECISIONS.md) — V1→V2 boundary, Receipts rationale
- [DATABASE.md](../../docs/DATABASE.md) — existing schema, RLS patterns
- [DESIGN.md](../../docs/DESIGN.md) — visual spec, spot button, prompt variants
- [MVP.md](../../docs/MVP.md) — V1 scope (now being updated for V2)
- `/phase-1-spot-indexed-milner.md` — original plan document

