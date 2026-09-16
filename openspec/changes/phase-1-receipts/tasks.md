# Phase 1: Spot + Sign-in + Receipts — SDD Tasks

**Status:** Tasks  
**Created:** 2026-09-17  
**Change ID:** phase-1-receipts

## Task Breakdown (11 Commits)

### Task 1: Docs First — Architecture & Decisions
**Commit:** 1 of 11  
**Complexity:** Low  
**TDD:** Documentation only (no tests)  
**Approx. time:** 1-2 hours

**Goal:** Establish the V1→V2 boundary and document Receipts architecture before any code.

**Files to create/modify:**
- `docs/DATABASE.md` — Add `spots` and `picker_sessions` schema, relationships, RLS, attribution join logic
- `docs/DECISIONS.md` — Add two dated entries (2026-09-17):
  1. "V1 is done; V2 begins" — MVP Definition of Done met, MVP.md now carries V2 scope
  2. "Receipts: opt-in picker identity, spots are not picks" — Amend OAuth and identity rules
- `docs/MVP.md` — Retitle to V2 scope contract, add MUST HAVE (Spot, sign-in, Receipts), NICE TO HAVE, NOT V2
- `docs/ROADMAP.md` — Remove "Scout profiles" and "Early believer" (now in MVP.md V2 MUST HAVE)
- `docs/DESIGN.md` — Add spot button spec (36px circle, lime on spotted), Receipts prompt variants, nav update, rule 2 amendment
- `docs/ARCHITECTURE.md` — § Auth: Receipts as entry point, identity opt-in, never read by ranking
- `docs/PRODUCT.md` — Add "V2: pickers get receipts" paragraph

**Acceptance Criteria:**
- [ ] DATABASE.md documents `spots` and `picker_sessions` with columns, constraints, indexes, RLS rules, and join logic
- [ ] DECISIONS.md has two new entries dated 2026-09-17
- [ ] MVP.md retitled, sections added (V2 MUST HAVE / NICE TO HAVE / NOT V2)
- [ ] ROADMAP.md updated (Scout profiles, Early believer removed from V2, moved to later candidates)
- [ ] DESIGN.md spot button and prompt specs documented
- [ ] ARCHITECTURE.md amended with auth entry point and identity notes
- [ ] PRODUCT.md loop updated to include Receipts
- [ ] No broken links; internal cross-references valid
- [ ] Vocabulary consistent (Spot, Receipts, Picker, Voter)

**Test Evidence:**
- Manual review of docs for correctness and cross-references
- No linting errors (markdown)

**Notes:**
- This task is documentation-heavy; used as reference for all subsequent tasks
- V1 history sections in MVP.md, DESIGN.md, etc. are left intact as history
- Vocab changes (e.g., "votes" → "battles") are noted but not retrofitted to existing docs

---

### Task 2: Schema & Migration
**Commit:** 2 of 11  
**Complexity:** Medium  
**TDD:** Unit test the migration, integration test schema
**Approx. time:** 1-2 hours

**Goal:** Define the `spots` and `picker_sessions` tables, ensure RLS is enabled.

**Files to create/modify:**
- `src/lib/db/schema.ts` — Add `spots` and `picker_sessions` table definitions (Drizzle ORM)
- `drizzle/0008_spots_receipts.sql` — Generated migration, then hand-append `ENABLE ROW LEVEL SECURITY` on both tables
- `drizzle/meta/*` — Updated by Drizzle after generate
- (Optionally) `src/lib/db/schema.test.ts` — Test that tables are correctly defined

**Acceptance Criteria:**
- [ ] `spots` table has all required columns: `id`, `user_id`, `creator_id`, `rank_at_spot`, `aura_at_spot`, `created_at`
- [ ] `spots` has `UNIQUE(user_id, creator_id)` constraint
- [ ] `spots` has indexes on `user_id` and `creator_id`
- [ ] `spots` has `ON DELETE CASCADE` from `auth.users(id)`
- [ ] `picker_sessions` table has `voter_session` (text, PK), `user_id` (FK to `auth.users`), `linked_at`
- [ ] `picker_sessions` has index on `user_id`
- [ ] RLS enabled on both tables (`ALTER TABLE spots ENABLE ROW LEVEL SECURITY`)
- [ ] Migration applies without error: `npm run db:migrate`
- [ ] Drizzle introspection works: `npm run db:generate`
- [ ] Typecheck passes: `npm run typecheck`

**Test Evidence:**
- `npm run db:migrate` succeeds
- `npm run db:generate` confirms schema matches
- `npm run typecheck` passes
- (Optional) Unit tests for table structure

**Notes:**
- `DIRECT_URL` may be broken (per DECISIONS 2026-09-12); if `db:migrate` fails, apply via Supabase MCP
- Migration file must be committed to repo alongside schema.ts
- No policies on RLS (server-only via service role, like `visitor_pings`)

---

### Task 3: Auth Plumbing
**Commit:** 3 of 11  
**Complexity:** Medium  
**TDD:** Unit test + integration test
**Approx. time:** 2-3 hours

**Goal:** Extract and wire up Google sign-in flow, ensure callback links session to user ID.

**Files to create/modify:**
- `src/lib/auth.ts` (new, `server-only`) — Export `getUserId()` function
- `src/lib/supabase/oauth.ts` (new, client-safe) — Export `startGoogleSignIn(next)` wrapper
- `src/app/auth/callback/route.ts` (MODIFIED) — Add `linkPickerSession()` logic, guard `next` parameter
- `src/lib/session.ts` (MODIFIED if needed) — Export cookie name constant
- `db/queries.ts` (MODIFIED) — Add `linkPickerSession(voterSession, userId)` query
- Tests: `src/lib/auth.test.ts`, `src/lib/supabase/oauth.test.ts`

**Acceptance Criteria:**
- [ ] `getUserId()` in auth.ts returns `claims.sub ?? null` from `createClient().auth.getClaims()`
- [ ] `startGoogleSignIn(next)` wraps existing OAuth call, defaults `next` to `/receipts`
- [ ] Auth callback invokes `getOrCreateVoterSession()` (existing) to mint cookie if absent
- [ ] Auth callback invokes `linkPickerSession(voterSession, userId)` to link session
- [ ] `next` parameter is guarded (must start with `/`, not `//`); defaults to `/receipts`
- [ ] Redirect happens after both operations (OAuth exchange + session link + cookie set)
- [ ] `linkPickerSession()` uses `ON CONFLICT DO NOTHING` (first link wins)
- [ ] No user ID → returns null (handled by caller)
- [ ] Typecheck passes: `npm run typecheck`
- [ ] Tests pass: `npm run test -- auth`

**Test Evidence:**
- Unit tests for `getUserId()` with mocked claims
- Unit tests for `startGoogleSignIn()` with default `next`
- Integration test: OAuth callback flow (mocked Supabase)
- All tests passing: `npm run test`

**Notes:**
- `getClaims()` is a network call; never call in ISR paths (profile page stays cookie-free)
- Fallback to `getUser()` if `getClaims()` doesn't exist in supabase-js 2.112+
- Existing `src/components/auth/sign-in-button.tsx` will consume `startGoogleSignIn()` in later task

---

### Task 4: Spot Action & Queries
**Commit:** 4 of 11  
**Complexity:** High  
**TDD:** Unit tests for logic, integration tests for queries
**Approx. time:** 3-4 hours

**Goal:** Implement spot creation, rank computation, and supporting queries.

**Files to create/modify:**
- `db/queries.ts` (MODIFIED) — Add/extract:
  - `rankForAura(aura)` — extract from existing `getCreatorByUsername` logic (210-214)
  - `getSpottedIds(userId, creatorIds)` — select spotted creator IDs for a user
  - `spotCreator(creatorId, userId, rankAtSpot, auraAtSpot)` — insert spot on conflict do nothing
  - `getMySpot(userId, creatorId)` — fetch single spot for profile island
- `src/app/actions/spot.ts` (new, `"use server"`) — Export:
  - `spotCreator({creatorId})` — server action with Zod validation
- `src/lib/db/schema.ts` (MODIFIED if needed) — Re-export `rankForAura` as helper
- Tests: `db/queries.test.ts`, `src/app/actions/spot.test.ts`

**Acceptance Criteria:**
- [ ] `rankForAura(aura)` correctly computes rank from Aura (consistent with existing ranking logic)
- [ ] `getSpottedIds(userId, creatorIds)` returns Set or array of creator UUIDs already spotted by user
- [ ] `spotCreator()` server action validates `creatorId` (Zod uuid)
- [ ] Mock mode: returns `{ok: false, reason: "unavailable"}`
- [ ] No user ID: returns `{ok: false, reason: "auth"}`
- [ ] Creator missing or inactive: returns `{ok: false, reason: "unavailable"}`
- [ ] Spot inserts successfully: `{ok: true, rankAtSpot, alreadySpotted: false}`
- [ ] Duplicate spot: `{ok: true, rankAtSpot, alreadySpotted: true}` (no error, silent)
- [ ] `rankAtSpot` is `null` if creator in placement (rank not yet assigned)
- [ ] `rankAtSpot` is computed rank if creator is ranked
- [ ] Spot also invokes `linkPickerSession()` if voter session exists (side effect)
- [ ] `getMySpot()` fetches current spot data for UI (e.g., to show "already spotted")
- [ ] Typecheck passes: `npm run typecheck`
- [ ] Tests pass: `npm run test -- spot`

**Test Evidence:**
- Unit tests for `rankForAura()` with sample Aura values
- Integration tests for spot insert, duplicate, missing creator
- Mock mode tests
- All tests passing: `npm run test`

**Notes:**
- Spot never updates or deletes in Phase 1; only inserts
- Aura at spot is immutable; stored as snapshot of creator's current Aura at time of spot
- Rank computation is stable (tests verify consistency with ranking module)

---

### Task 5: Session Pick Count Exposure
**Commit:** 5 of 11  
**Complexity:** Low  
**TDD:** Unit test pick counting logic
**Approx. time:** 1-2 hours

**Goal:** Expose session pick count to nudge and UI logic.

**Files to create/modify:**
- `db/queries.ts` (MODIFIED) — Modify `getRandomPair()` to return shape `{ pair, sessionPicks }`
- `db/queries.ts` (MODIFIED) — Mirror change in `mockRandomPair()`
- `src/app/actions/pick.ts` or similar (MODIFIED) — Modify `pickWinner()` to return `sessionPicks` in `PickResult`
- `src/app/page.tsx` (MODIFIED) — Fetch `getUserId()`, fetch `spottedIds` if signed-in (small query), pass to `BattleArena`
- `src/components/battle/battle-arena.tsx` (MODIFIED) — Accept `initialSessionPicks`, `initialSpottedIds`, `isSignedIn` props
- Tests: verify pick count increments correctly in mock and real queries

**Acceptance Criteria:**
- [ ] `getRandomPair()` returns `{ pair, sessionPicks: number }`
- [ ] `mockRandomPair()` mirrors the same shape
- [ ] `pickWinner()` increments and returns `sessionPicks` in response
- [ ] `/` (homepage) RSC calls `getUserId()` (server-only)
- [ ] `/` calls `getSpottedIds()` only if signed-in (no extra queries for unsigned-out)
- [ ] `BattleArena` receives `initialSessionPicks` and tracks in state during play
- [ ] Session pick count updates after each `pickWinner()` call
- [ ] Typecheck passes: `npm run typecheck`
- [ ] Tests pass: `npm run test`
- [ ] No performance regression (net +1 small query for signed-in users only)

**Test Evidence:**
- Unit tests for pick count incrementing
- Integration tests showing session picks passed through queries
- All tests passing: `npm run test`

**Notes:**
- Session count is in-memory for the browser session; resets on page reload (intended)
- The actual "battles played" count for Receipts comes from `picker_sessions` join in queries (separate)
- This task exposes the count for nudge and UI feedback; not yet used in Receipts query

---

### Task 6: Pure Nudge & Best-Spot Modules with Tests
**Commit:** 6 of 11  
**Complexity:** Medium  
**TDD:** Unit tests required (Vitest colocated)
**Approx. time:** 2-3 hours

**Goal:** Implement nudge logic and best-spot selection as pure, testable modules.

**Files to create/modify:**
- `src/lib/receipts/nudge.ts` (new) — Export:
  - `RECEIPTS_NUDGE_AT = 5`
  - `RECEIPTS_NUDGE_AGAIN_AT = 25`
  - `shouldShowReceiptsNudge(sessionPicks, isSignedIn, dismissedAtPicks)` → boolean
- `src/lib/receipts/nudge.test.ts` (new) — Colocated tests:
  - Show at 5, hide at 4
  - Hide if signed in
  - Show again at 25 if dismissed at 5
  - Boundaries 4/5/24/25/26
- `src/lib/receipts/best-spot.ts` (new) — Export:
  - `type SpotForReceipt = { ... }`
  - `climbOf(rankAtSpot, currentRank)` → number
  - `pickBestSpot(spots: SpotForReceipt[])` → SpotForReceipt (max climb, ties → newest)
- `src/lib/receipts/best-spot.test.ts` (new) — Colocated tests:
  - Max climb selection
  - Ties broken by newest
  - Excludes null ranks and inactive creators
  - Negative-only spots → none selected
  - Empty list → null

**Acceptance Criteria:**
- [ ] `shouldShowReceiptsNudge` boundary tests pass (4, 5, 6, 24, 25, 26)
- [ ] `shouldShowReceiptsNudge` hides if signed in (even at 5+ picks)
- [ ] `shouldShowReceiptsNudge` re-shows at +20 from dismissal
- [ ] `climbOf(100, 50)` returns 50 (positive climb)
- [ ] `climbOf(50, 100)` returns -50 (negative climb)
- [ ] `pickBestSpot` selects max climb
- [ ] `pickBestSpot` ties go to newest (by `createdAt`)
- [ ] `pickBestSpot` excludes `rankAtSpot = null` and `isActive = false`
- [ ] `pickBestSpot` with empty array returns `undefined` or throws (handle gracefully)
- [ ] Typecheck passes: `npm run typecheck`
- [ ] Tests pass: `npm run test -- receipts`
- [ ] Coverage ≥ 90% for both modules

**Test Evidence:**
```
PASS  src/lib/receipts/nudge.test.ts (5 tests)
PASS  src/lib/receipts/best-spot.test.ts (6 tests)
Total: 11 tests, all passing
```

**Notes:**
- These are pure functions (no DB calls), making them easy to test
- Nudge logic includes dismissal cookie read (deferred to useEffect in component)
- Best-spot selection is a single pass; no sorting performance concerns for Phase 1

---

### Task 7: Spot Button + Prompt + Arena Wiring
**Commit:** 7 of 11  
**Complexity:** High  
**TDD:** Component tests (optional), manual E2E
**Approx. time:** 4-5 hours

**Goal:** Build spot button UI, prompt variants, and wire into battle arena.

**Files to create/modify:**
- `src/components/battle/spot-button.tsx` (new) — Export `SpotButton` component:
  - Props: `creatorId`, `firstName`, `spotted`, `isSignedIn`, `onSpot`, `onSignInPrompt`
  - State: optimistic `isSpotted`, pending
  - Styling: 36px circle, lime on spotted, ≥44px hit area
  - Aria labels and accessibility
- `src/components/receipts/receipts-prompt.tsx` (new) — Export `ReceiptsPrompt` component:
  - Props: `variant`, `firstName`, `isOpen`, `onDismiss`, `onSignIn`
  - Variants: `nudge` (after picks) and `spot` (on button tap)
  - Behavior: Escape/backdrop close, call `startGoogleSignIn()` on button
  - Styling: bottom sheet mobile, centered card desktop, reduced motion
- `src/components/battle/creator-card.tsx` (MODIFIED) — Add `spotted`, `onSpot` props; place spot button top-left over portrait
- `src/components/battle/battle-arena.tsx` (MODIFIED) — Add:
  - `spottedIds` state Set
  - `handleSpot()` → optimistic update, then `spotCreator()` action, revert on error
  - `handleSignInPrompt()` → show receipts prompt (spot variant)
  - Nudge: `useEffect` on `sessionPicks`, read dismissal cookie only in effect, show after `advance()`
  - Pass `spotted` and `onSpot` to `CreatorCard`
- `src/lib/session.ts` (MODIFIED if needed) — Ensure dismissal cookie name is exported
- Tests: Manual browser testing (nudge appears, prompt shows, Google button routes, spot updates)

**Acceptance Criteria:**
- [ ] Spot button appears on top-left of battle card portrait
- [ ] Spot button is 36px circle, ground idle / lime spotted
- [ ] Spot button has aria-label and aria-pressed
- [ ] Tap spot button when signed-out → Receipts prompt (spot variant) appears
- [ ] Tap spot button when signed-in → optimistic update (eye fills lime)
- [ ] Google button in prompt → `startGoogleSignIn(next)` called with current path
- [ ] Server error on spot → prompt shows, state reverts (show toast "Creator not available")
- [ ] Duplicate spot → state shows spotted, toast "Already spotted"
- [ ] Session picks ≥ 5 and unsigned-out → nudge appears after result window
- [ ] Nudge "KEEP MY RECEIPTS" button → sign-in flow
- [ ] Nudge "Not now" → dismiss and set cookie
- [ ] Dismissed nudge reappears at picks ≥ 25
- [ ] Battle arena `stopPropagation()` on spot button (no nested-button issues)
- [ ] No performance regression (optimistic update, single render)
- [ ] Mobile responsive (nudge sheet, prompt centered)
- [ ] Reduced motion respected (no slide/pop animations)
- [ ] Typecheck passes: `npm run typecheck`

**Test Evidence:**
- Manual browser testing on `/` (homepage)
- Screenshot: nudge appears at pick #5
- Screenshot: prompt appears on button tap (signed-out)
- Screenshot: eye fills lime on tap (signed-in)
- Screenshot: after sign-in, eye shows as spotted
- Video: full flow (5 picks → nudge → tap Spot → prompt → Google → callback → lands on `/receipts`)

**Notes:**
- Nudge dismissal cookie: `Max-Age=31536000` (1 year persistence)
- Cookie read only in `useEffect` to avoid hydration mismatch
- Optimistic state update provides instant feedback; server error reverts after toast

---

### Task 8: Profile Page Spot Button (Island)
**Commit:** 8 of 11  
**Complexity:** Medium  
**TDD:** Component test + manual
**Approx. time:** 2-3 hours

**Goal:** Add spot button to creator profile page (island component, ISR-safe).

**Files to create/modify:**
- `src/components/profile/spot-button.tsx` (new, client component) — Export `ProfileSpotButton`:
  - Props: `creatorId`, `creatorName`
  - On mount: call `auth.getSession()` locally (no server call), fetch `getMySpot(creatorId)` if signed-in
  - Same interaction as arena (optimistic, server action, revert on error)
  - Styling: pill with 👁 icon and "Spot" text, or just icon + text
  - Accessibility: aria-label, aria-pressed
- `src/app/c/[username]/page.tsx` (MODIFIED) — Add spot button next to `ShareButton` in header/pill area
  - Profile page stays ISR (`revalidate=15`), no auth in RSC
  - Island component hydrates on mount
- Tests: Manual browser testing on profile page

**Acceptance Criteria:**
- [ ] Spot button appears on profile next to share button
- [ ] Button shows "👁 Spot" or just icon
- [ ] On mount: calls `auth.getSession()` (local, no network)
- [ ] If signed-in: fetches `getMySpot()` to check if already spotted
- [ ] If not spotted: button shows idle state
- [ ] If spotted: button shows lime state
- [ ] Tap: same flow as arena (optimistic, server action, revert on error)
- [ ] Tap when signed-out: shows prompt (spot variant)
- [ ] Profile page still ISRs correctly (`revalidate=15`, no hydration mismatch)
- [ ] No console errors or warnings
- [ ] Mobile responsive (pill/button size)
- [ ] Typecheck passes: `npm run typecheck`

**Test Evidence:**
- Manual browser testing on `/c/[username]` (creator profile)
- Screenshot: spot button appears next to share
- Screenshot: button shows idle/spotted state correctly
- Screenshot: after spot, button updates to lime
- Video: full flow (profile → spot button → prompt → Google → back to profile → button shows spotted)

**Notes:**
- Island component: hydrates client-side only, no SSR
- `auth.getSession()` is a local cache read (Supabase auth state), not a network call
- Profile page ISR cache is never invalidated by spotting (revalidate=15 is independent)

---

### Task 9: Receipts Query + Page + Nav
**Commit:** 9 of 11  
**Complexity:** High  
**TDD:** Integration tests for queries, manual E2E for page
**Approx. time:** 4-5 hours

**Goal:** Implement Receipts page, query logic, and add nav link.

**Files to create/modify:**
- `db/queries.ts` (MODIFIED) — Add:
  - `getReceipts(userId)` → `{ battlesCount, spotsWithRanks, bestSpot }`
  - Two statements: battles count via `picker_sessions` join, spots with live rank computed in SQL
  - Use raw SQL for rank computation (can't reuse `voterCountSql` across aliased self-join)
- `src/app/receipts/page.tsx` (new) — Export default component:
  - Route: `/receipts`
  - Force-dynamic (no ISR cache), `robots: noindex`
  - Signed-out: eyebrow "RECEIPTS", h1 with `<MarkerSwipe>`, sign-in button
  - Signed-in: eyebrow with 🧾 icon, h1 "YOUR EYE SO FAR", counters, best spot card, spot list, share button, sign-out
  - Counter tiles: "N battles played", "N people backed"
  - Best spot card: name, "YOU BACKED {NAME} AT #47", `<Scribble>` "called it.", "{NAME}'S NOW #8" in lime
  - Spot list: avatars, rank climb, date, aura at spot
  - Empty state when no spots
  - All typography: no gendered pronouns (use names)
  - Max 2 `<Scribble>`, 1 `<MarkerSwipe>`
- `src/app/receipts/layout.tsx` (new, if needed) — Receipts-specific layout
- `src/components/receipts/best-spot-card.tsx` (new) — Reusable best spot display
- `src/components/site-header.tsx` (MODIFIED) — Add `{ href: "/receipts", label: "Receipts" }` to `NAV_LINKS`
- Tests: Integration test for `getReceipts()`, manual E2E

**Acceptance Criteria:**
- [ ] `/receipts` route exists and is `force-dynamic`
- [ ] `robots: noindex` set
- [ ] Signed-out user sees explainer + sign-in button
- [ ] Signed-in user sees eyebrow "🧾 RECEIPTS", h1 "YOUR EYE SO FAR"
- [ ] Counters show correct counts: battles played (all-time), people backed (unique creators spotted)
- [ ] Best spot card shows top spot by climb (or none if no spots)
- [ ] Best spot shows name, rank at spot, current rank (or "backed at {aura} Aura" if null rank)
- [ ] Spot list sorted by descending climb (newest on tie)
- [ ] Each spot shows: avatar, "#47 → #8" / "New challenger → #8" / "backed at 2400 Aura"
- [ ] Empty state: "No receipts cashed yet. Everyone you spot is still climbing."
- [ ] Share button appears (Primary lime)
- [ ] Sign-out button appears (ghost style)
- [ ] Navigation includes `/receipts` link
- [ ] All internal links typecheck (Next 16 routes)
- [ ] No gendered pronouns (use names)
- [ ] Typography uses only necessary `<MarkerSwipe>` and `<Scribble>`
- [ ] Typecheck passes: `npm run typecheck`
- [ ] Tests pass: `npm run test -- receipts`

**Test Evidence:**
- Integration test for `getReceipts()` with mock data
- Manual E2E: sign-in flow → `/receipts` shows correct data → share button works → sign-out works
- Screenshot: signed-out explainer
- Screenshot: signed-in with spots
- Screenshot: empty state (no spots)
- Video: full flow (sign-in → receipts page → shares → sign-out)

**Notes:**
- `getReceipts()` is called on every page load (no caching due to `force-dynamic`)
- SQL rank computation is necessary (can't use ORM for complex join)
- All-time scope in Phase 1; "this week" filter deferred to Phase 2
- Next 16 routes: `/receipts` must exist before any `Link href="/receipts"` (commit order matters)

---

### Task 10: Share Card (OG Image)
**Commit:** 10 of 11  
**Complexity:** Medium  
**TDD:** Manual E2E (visual)
**Approx. time:** 2-3 hours

**Goal:** Implement `/receipts/card` OG image endpoint and share button.

**Files to create/modify:**
- `src/app/receipts/card/route.tsx` (new) — Export GET handler:
  - Runtime: `nodejs`
  - `force-dynamic` (no cache)
  - 401 when signed out
  - `ImageResponse` 1200×630, `Cache-Control: private, no-store`
  - Fetches best spot data via `getReceipts()` and `pickBestSpot()`
  - Renders via Satori: avatar, rank at spot, current rank, name, "FOUND HERE FIRST" pill
  - Uses palette: `#F7F7F2` (bg), `#111` (text), `#FF5A1F` (rank), `#D8FF3E` (lime pill), `#6B6B66` (secondary)
- `src/lib/og.ts` (new or MODIFIED) — Extract `ogAvatarSrc(...)` helper (reuse from profile image code if exists)
- `src/components/receipts/share-button.tsx` (new) — Export `ShareButton` component:
  - Fetches `/receipts/card` → `File`
  - `navigator.canShare?.({files: [file]})` → native share (mobile)
  - Fallback: `window.open('/receipts/card', '_blank')` (desktop)
  - Button styling: Primary lime
- `src/app/receipts/opengraph-image.tsx` (new, optional) — Static OG for `/receipts` page itself (never leaks user data, just shows generic "RECEIPTS" card)
- Tests: Manual E2E (screenshot comparison, mobile share, desktop fallback)

**Acceptance Criteria:**
- [ ] `/receipts/card` endpoint exists and returns `ImageResponse`
- [ ] Unsigned-out user gets 401
- [ ] Image dimensions: 1200×630
- [ ] Cache-Control header: `private, no-store`
- [ ] Image shows best spot: avatar, rank, name, "FOUND HERE FIRST"
- [ ] Image uses correct palette (off-white bg, lime pill, orange rank)
- [ ] Image falls back to "backed at {aura} Aura" if rank at spot is null
- [ ] Share button calls `navigator.share()` on mobile
- [ ] Share button opens `/receipts/card` in new tab on desktop
- [ ] Share button is Primary lime styling
- [ ] No user data leaked in public OG (optional static `/receipts` card)
- [ ] Typecheck passes: `npm run typecheck`

**Test Evidence:**
- Manual E2E: navigate to `/receipts` (signed-in, with spots)
- Screenshot: share button visible
- Mobile: tap share button → native share sheet appears → share works
- Desktop: tap share button → new tab opens showing OG image
- Image visual: correct colors, layout, text
- Video: full share flow

**Notes:**
- Satori rendering is server-side; OG image is generated on-the-fly
- Private cache header prevents CDN/browser caching (user data)
- Share button is optional post-Phase 1; MVP can be link to `/receipts/card` in new tab
- Static `/receipts` OG card prevents link preview leaks if shared by user

---

### Task 11: Verify + Touch-ups
**Commit:** 11 of 11  
**Complexity:** Medium  
**TDD:** Full verification suite, manual E2E
**Approx. time:** 2-3 hours

**Goal:** Comprehensive verification, bug fixes, and documentation finalization.

**Files to create/modify:**
- Various (as needed for bug fixes discovered during verification)
- `docs/ARCHITECTURE.md` — Update § Auth section if needed

**Acceptance Criteria:**

**Build & Lint:**
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes (all tests, 100% for nudge/best-spot)
- [ ] `npm run build` succeeds (production build)
- [ ] No console errors or warnings

**Mock Mode:**
- [ ] `PREVIEW_MOCK=1 npm run dev`
- [ ] Homepage renders eye buttons (no-op)
- [ ] Spot button disabled in mock
- [ ] `/receipts` shows signed-out explainer

**Real Database Flow (Step-by-step):**
1. Start fresh (new browser session, no cookies)
2. Load homepage, play 4 battles → no nudge
3. Play 5th battle → nudge appears after result window
4. Tap "Not now" → cookie set, nudge hidden
5. Play 20 more battles (total 25) → nudge reappears
6. Tap "KEEP MY RECEIPTS" → Google sign-in flow
7. Sign-in succeeds → lands on `/receipts`
8. `/receipts` shows "5 battles played" (only counted picks, not full session history)
9. Tap spot button on a battle card → optimistic update (eye fills lime)
10. Server processes → `spots` row inserted
11. Reload page → eye still shows as lime (persists)
12. Navigate to creator profile → spot button shows lime
13. Navigate back to `/receipts` → spot listed with rank and "called it." marker
14. Tap share button → image renders correctly, share works (mobile native / desktop new tab)
15. Tap sign-out → auth clears, landing on explainer
16. Tap sign-in → Google → back to `/receipts`

**Aura & Ranking Verification:**
- [ ] Spot a creator → query `battles` count before/after → unchanged
- [ ] Spot a creator → query `aura` before/after → unchanged
- [ ] Spot a creator → ranking/pairing unaffected

**Profile Page (ISR):**
- [ ] Profile page still revalidates correctly (`revalidate=15`)
- [ ] Spot button hydrates without hydration mismatch
- [ ] Page doesn't require auth in RSC (cookie-free)

**Documentation:**
- [ ] No broken links in docs
- [ ] Vocabulary consistent across all files
- [ ] DECISIONS.md entries are dated and clear
- [ ] DATABASE.md join logic documented for future maintainers

**Edge Cases:**
- [ ] Duplicate spot (same user, creator) → no error, `alreadySpotted: true`
- [ ] Spot inactive creator → `{ok: false, reason: "unavailable"}`
- [ ] Spot missing creator → `{ok: false, reason: "unavailable"}`
- [ ] Earliest spots (creator in placement) → `rank_at_spot = null`, UI shows "backed at {aura}"
- [ ] Zero spots → empty state message
- [ ] Many spots → list renders efficiently

**Test Evidence:**
```
PASS  src/lib/receipts/nudge.test.ts (5 tests)
PASS  src/lib/receipts/best-spot.test.ts (6 tests)
PASS  db/queries.test.ts (8 tests for spot)
PASS  src/app/actions/spot.test.ts (4 tests)
────────────────────────────────
Total: 23 tests, all passing
```

**Build Output:**
```
$ npm run build
✓ compiled successfully
✓ all code health checks passed
Build output is ready for deployment
```

**Manual E2E Flow:**
- Video recording of full flow: sign-up → 5 picks → nudge → Google → Receipts page → spot → share → sign-out
- Screenshots: nudge, prompt, receipts page (empty & full), share card, profile
- Browser console: no errors, no warnings
- Network: no unexpected requests, auth callback succeeds

**Final Checks:**
- [ ] No uncommitted changes
- [ ] All commits follow atomic/testable pattern
- [ ] Commit messages are clear and reference this SDD
- [ ] Ready for code review and merge

---

## Task Summary Table

| # | Task | Complexity | Approx Time | Type | Done? |
|---|---|---|---|---|---|
| 1 | Docs First | Low | 1-2h | Docs | ☐ |
| 2 | Schema & Migration | Medium | 1-2h | DB | ☐ |
| 3 | Auth Plumbing | Medium | 2-3h | API | ☐ |
| 4 | Spot Action & Queries | High | 3-4h | Core | ☐ |
| 5 | Session Pick Count | Low | 1-2h | API | ☐ |
| 6 | Nudge & Best-Spot Modules | Medium | 2-3h | Logic | ☐ |
| 7 | Spot Button + Prompt + Arena | High | 4-5h | UI | ☐ |
| 8 | Profile Spot Button | Medium | 2-3h | UI | ☐ |
| 9 | Receipts Query + Page + Nav | High | 4-5h | Page | ☐ |
| 10 | Share Card (OG) | Medium | 2-3h | API | ☐ |
| 11 | Verify + Touch-ups | Medium | 2-3h | QA | ☐ |
| | **Total** | **High** | **27-35h** | **11 commits** | ☐ |

---

## Task Dependencies

```
Task 1 (Docs)
  ↓
Task 2 (Schema)
  ↓
Task 3 (Auth)
  ├─→ Task 4 (Spot Action)
  │   ├─→ Task 5 (Session Count)
  │   │   └─→ Task 7 (Spot Button + Arena)
  │   │       ├─→ Task 8 (Profile Spot)
  │   │       └─→ Task 9 (Receipts Page)
  │   └─→ Task 6 (Nudge + Best-Spot) ──→ Task 7 (Spot Button + Arena)
  └─→ Task 9 (Receipts Page)

Task 9 ──→ Task 10 (Share Card)

Task 10 ──→ Task 11 (Verify)
```

**Critical path:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 9 → 10 → 11 (most time-efficient order)

Alternative parallelization (once Task 4 is done):
- Task 5 and Task 6 can run in parallel (independent)
- Task 7 and Task 8 can run in parallel (both consume Task 4)
- Task 10 and Task 11 are sequential (share card before final verify)

