# Phase 1: Spot + Sign-in + Receipts — SDD Design

**Status:** Design  
**Phase:** Design  
**Created:** 2026-09-17  
**Change ID:** phase-1-receipts

## Architectural Overview

### Data Flow

```
Voter plays battles → after 5 picks, nudge appears
                  → taps Spot button (eye icon on card)
                  → signed-out: Receipts prompt appears + Google sign-in
                  → signed-in: optimistic spot update, server insert
                  → server links voter_session → user_id in picker_sessions
                  → navigator to /receipts shows all spots + battles
                  → taps share → OG card image via /receipts/card
                  → native share or new tab
```

### System Boundaries

**Within Phase 1:**
- Spot action and storage
- Google OAuth callback and session linking
- Receipts read path (queries, page, OG image)
- UI nudges and prompts

**Out of scope (Phase 2+):**
- Un-spot, retract
- Receipts analytics
- Weekly digest
- X sign-in
- Public receipts URL

## Technology Decisions

### Auth Entry Point

**Why Google only in Phase 1?**
- Already wired in codebase (Supabase Auth set up)
- No UI changes needed, just expose existing flow
- X later (simpler to add another OAuth provider)
- Receipts is strong enough use case to justify friction of sign-in

**Callback Flow:**
1. Google returns auth code
2. `src/app/auth/callback/route.ts` exchanges code
3. Gets user from Supabase (`getUser()`)
4. Gets or creates voter session from cookie (`readVoterSession()` / `getOrCreateVoterSession()`)
5. Links session to user ID: `INSERT INTO picker_sessions (voter_session, user_id) VALUES (...) ON CONFLICT DO NOTHING`
6. Redirects to `next` param (default `/receipts`)

### Data Model Details

#### `spots` Table

```sql
CREATE TABLE spots (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES creators(id),
  rank_at_spot integer,         -- NULL = in placement; else 1-∞
  aura_at_spot integer NOT NULL, -- immutable snapshot
  created_at timestamptz NOT NULL,
  UNIQUE(user_id, creator_id),
  INDEX idx_spots_user_id (user_id),
  INDEX idx_spots_creator_id (creator_id)
);
```

**Insert logic:**
1. Get current rank and Aura for creator
2. Compute `rankAtSpot = creator.isRanked() ? rankForAura(aura) : null`
3. Insert with `ON CONFLICT DO NOTHING` (duplicate spot is silent)
4. Also link picker_sessions if cookie exists

**Read logic:**
- Receipts page queries: `SELECT ... FROM spots WHERE user_id=$1 JOIN creators ... LEFT JOIN (current rank query)`
- OG card: single best spot via `pickBestSpot()` (max climb, ties → newest)

#### `picker_sessions` Table

```sql
CREATE TABLE picker_sessions (
  voter_session text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  linked_at timestamptz NOT NULL DEFAULT now(),
  INDEX idx_picker_sessions_user_id (user_id)
);
```

**Invariant:** First link wins (`ON CONFLICT DO NOTHING`). A voter can only ever link to one user account.

### Session Tracking & Nudge

**Session pick count:**
- Already computed in `getRandomPair()` and `pickWinner()` 
- Expose via `BattleArena` props: `initialSessionPicks` (from server RSC)
- Track client-side in state during gameplay
- Pass to nudge logic and dismissal

**Nudge logic** (`src/lib/receipts/nudge.ts`):

```ts
export const RECEIPTS_NUDGE_AT = 5;
export const RECEIPTS_NUDGE_AGAIN_AT = 25;

export function shouldShowReceiptsNudge(
  sessionPicks: number,
  isSignedIn: boolean,
  dismissedAtPicks: number | null
): boolean {
  if (isSignedIn) return false; // Already has receipts
  if (dismissedAtPicks && sessionPicks < dismissedAtPicks + 20) return false; // Show again at +20
  return sessionPicks >= RECEIPTS_NUDGE_AT; // Show at 5, again at 25
}
```

**Dismissal:**
- `useEffect` on `sessionPicks`, read cookie only in effect (no SSR)
- Button sets: `document.cookie = "underhyped_receipts_nudge=<sessionPicks>; Max-Age=31536000; Path=/; SameSite=Lax"`
- Cookie persists 1 year; nudge reappears at +20 picks

### Spot Button Placement & Interaction

#### Battle Arena (Creator Card)

**Location:** Top-left of portrait, over the image

```
┌─────────────────────┐
│ 👁                  │  ← Spot button (36px circle)
│                     │
│   [Portrait]        │
│                     │
│                     │
├─────────────────────┤
│ Name, Aura, Category│
├─────────────────────┤
│  [Primary: Pick]    │  ← Existing pick control (unchanged)
└─────────────────────┘
```

**Styling:**
- 36px circle, `absolute top-2.5 left-2.5`
- Idle: ground fill (light gray), hairline border, dark ink eye icon
- Spotted: lime fill (`#D8FF3E`), dark ink eye icon
- Hover: slightly darker ground / lime
- Pressed: ripple (Radix UI standard)
- `aria-pressed`, `aria-label="Spot {firstName}"`
- Hit area ≥ 44px (touch-safe)

**Interaction:**
- `stopPropagation()` (card itself has no click handler, so not nested-button issue)
- Signed-out: tap → Receipts prompt (spot variant) → Google button
- Signed-in: tap → optimistic state update → `spotCreator()` server action → revert on error

#### Creator Profile Page

**Location:** Next to `ShareButton` in header/pill area

```
[Avatar] {Name}
[👁 Spot]  [Share]
```

**Styling:**
- Pill shape with icon + text, Secondary button style
- Or: `<button>` with icon, text, link styling

**Interaction:**
- Profile page is ISR (`revalidate=15`), no auth in RSC
- Island component: on mount, read from `auth.getSession()` (client-side, local read)
- If signed-in: fetch `getMySpot(creatorId)` to check if already spotted
- Same prompt/action flow as arena

### UI Components & Layout

#### `receipts-prompt.tsx`

**Props:**
```ts
type ReceiptsPromptProps = {
  variant: 'nudge' | 'spot';  // nudge: after picks, spot: on button tap
  firstName?: string;          // spot variant: "Spot {firstName}?"
  isOpen: boolean;
  onDismiss: () => void;
  onSignIn: () => void;
};
```

**Nudge variant (bottom sheet mobile / card desktop):**
```
┌───────────────────────────────┐
│ 5 BATTLES IN.                 │
│ Want us to keep your receipts?│
│ We'll remember who you backed │
│ before everyone else catches  │
│ up.                           │
│                               │
│ [🔵 KEEP MY RECEIPTS →]      │ ← Primary Google button
│ [Not now]                     │ ← Ghost dismissal
└───────────────────────────────┘
```

**Spot variant (same structure):**
```
┌───────────────────────────────┐
│ Spot {firstName}?             │
│ Sign in and we'll keep the    │
│ receipt.                      │
│                               │
│ [🔵 SIGN IN WITH GOOGLE →]   │
│ [Not now]                     │
└───────────────────────────────┘
```

**Behavior:**
- `role="dialog"`, Escape closes, backdrop click closes
- `onSignIn()` calls `startGoogleSignIn()` with `next` = current path
- After sign-in, callback redirects (default `/receipts`)
- Reduced motion: no slide animation (Radix + CSS)

#### `spot-button.tsx` (Arena)

**Props:**
```ts
type SpotButtonProps = {
  creatorId: string;
  firstName: string;
  spotted: boolean;
  isSignedIn: boolean;
  onSpot: (creatorId: string) => void;       // signed-in flow
  onSignInPrompt: () => void;                 // unsigned-out → prompt
};
```

**State:**
- Optimistic `isSpotted` (flips on click, reverts on error)
- Pending state (button disabled during server action)

**Error handling:**
- `reason: "auth"` → should not happen (caught before action), but revert state + show prompt
- `reason: "unavailable"` → revert state + show toast "Creator not available"
- `reason: "already_spotted"` → set `alreadySpotted`, show toast "You've already spotted this creator"

#### `spot-button.tsx` (Profile)

**Props:**
```ts
type ProfileSpotButtonProps = {
  creatorId: string;
  creatorName: string;
  currentSpot?: Spot;  // from `getMySpot()`
};
```

**Behavior:**
- Island component (hydrates on mount)
- Fetch `getMySpot()` to populate `currentSpot` if signed-in
- Same interaction as arena (optimistic, server action, revert on error)

### Receipts Page Layout

**Route:** `src/app/receipts/page.tsx`  
**Props:** Force-dynamic (no cache), `robots: noindex`

**Signed-out state:**
```
┌──────────────────────────────┐
│ RECEIPTS                      │ ← Eyebrow
│                               │
│ Proof you were early.         │ ← h1 with <MarkerSwipe>
│                               │
│ [🔵 SIGN IN WITH GOOGLE →]   │
└──────────────────────────────┘
```

**Signed-in state:**
```
┌──────────────────────────────┐
│ 🧾 RECEIPTS · [date]          │ ← Eyebrow with icon
│                               │
│ YOUR EYE SO FAR               │ ← h1 with <MarkerSwipe>
│                               │
│ ┌─────────────┐ ┌──────────┐  │
│ │ 23 battles  │ │ 8 backed │  │ ← Counter tiles
│ │   played    │ │          │  │
│ └─────────────┘ └──────────┘  │
│                               │
│ ─────────────────────────────  │ ← Hairline divider
│                               │
│ BEST SPOT 👁                  │ ← Section header
│ ┌──────────────────────────┐  │
│ │ [🖼]  Maya Higa           │  │
│ │ YOU BACKED MAYA AT #47    │  │
│ │                           │  │
│ │ ➜ called it. (Scribble)   │  │
│ │                           │  │
│ │ MAYA'S NOW #8             │  │
│ │ (lime text with rank)     │  │
│ └──────────────────────────┘  │
│                               │
│ ─────────────────────────────  │ ← Hairline divider
│                               │
│ [Avatar] #47 → #8  (May 2026) │
│ [Avatar] 👑 #1  (Sep 2026)    │
│ [Avatar] (no rank) at 2400 Aura
│ ...                           │
│                               │
│ [🟢 FOUND HERE FIRST (Lime)]  │ ← Primary share button
│                               │
│ [Sign out]                    │ ← Ghost button
└──────────────────────────────┘
```

**Empty state (signed-in, no spots):**
```
┌──────────────────────────────┐
│ 🧾 RECEIPTS                   │
│ YOUR EYE SO FAR               │
│                               │
│ 0 battles played              │
│ 0 people backed               │
│                               │
│ No receipts cashed yet.       │
│ Everyone you spot is still    │
│ climbing.                     │
│                               │
│ [Go play]                     │ → Link to /
└──────────────────────────────┘
```

**Typography & Accent:**
- Use only `<MarkerSwipe>` and `<Scribble>` sparingly (≤2 total per page)
- Lime (`#D8FF3E`) for rank text and buttons
- No gendered pronouns (use names)

### `/receipts/card` OG Image

**Endpoint:** `src/app/receipts/card/route.tsx`  
**Runtime:** Node.js (Satori)  
**Cache:** Private, no-store (user data)

**Layout** (1200×630 px):
```
┌────────────────────────────────────┐
│                                    │
│  [40px circle avatar]              │
│                                    │
│  YOU SPOTTED {NAME} AT #{RANK}     │
│                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                    │
│  {NAME}'S NOW #{CURRENT_RANK}      │  ← Lime text
│                                    │
│  🟢 FOUND HERE FIRST               │
│                                    │
│  Underhyped · Sep 2026             │
└────────────────────────────────────┘
```

**Palette:**
- Background: `#F7F7F2` (off-white)
- Text: `#111` (near-black)
- Accent: `#FF5A1F` (Underhyped orange, for #{RANK})
- Lime pill: `#D8FF3E`
- Secondary: `#6B6B66` (gray for date)

**Data:**
- Avatar: reuse `ogAvatarSrc()` from `src/lib/og.ts` (extract from profile image code)
- Rank at spot, current rank, name, aura at spot
- Fallback: "backed at {aura} Aura" if no rank at spot

### Share Button Flow

**`share-button.tsx` on `/receipts`:**

```ts
async function handleShare() {
  try {
    // Fetch the OG card
    const response = await fetch(`/receipts/card`);
    const blob = await response.blob();
    const file = new File([blob], 'receipts-card.png', { type: 'image/png' });

    // Try native share
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
    } else {
      // Fallback: open in new tab
      window.open('/receipts/card', '_blank');
    }
  } catch (err) {
    console.error('Share failed:', err);
    // Fallback: open in new tab
    window.open('/receipts/card', '_blank');
  }
}
```

## File Structure

```
src/
├── lib/
│   ├── auth.ts                   # NEW: getUserId()
│   ├── receipts/
│   │   ├── nudge.ts             # NEW: shouldShowReceiptsNudge()
│   │   ├── best-spot.ts         # NEW: pickBestSpot(), climbOf()
│   │   ├── nudge.test.ts        # NEW: tests
│   │   └── best-spot.test.ts    # NEW: tests
│   ├── supabase/
│   │   └── oauth.ts             # NEW: startGoogleSignIn()
│   ├── session.ts               # EXISTING: readVoterSession(), getOrCreateVoterSession()
│   ├── db/
│   │   └── schema.ts            # MODIFIED: add spots, picker_sessions
│   └── og.ts                     # NEW or MODIFIED: extract ogAvatarSrc()
├── app/
│   ├── actions/
│   │   ├── spot.ts              # NEW: spotCreator(), getMySpot()
│   │   └── auth.ts              # EXISTING: signOut (already exists)
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts         # MODIFIED: add linkPickerSession()
│   ├── receipts/
│   │   ├── page.tsx             # NEW: main receipts page
│   │   ├── card/
│   │   │   └── route.tsx        # NEW: OG image endpoint
│   │   └── layout.tsx           # NEW: receipts layout (if needed)
│   └── c/
│       └── [username]/
│           └── page.tsx         # MODIFIED: add spot button to profile
├── components/
│   ├── battle/
│   │   ├── spot-button.tsx      # NEW: arena spot button
│   │   ├── creator-card.tsx     # MODIFIED: add spot button placement
│   │   └── battle-arena.tsx     # MODIFIED: handle spot, nudge, spottedIds
│   ├── profile/
│   │   └── spot-button.tsx      # NEW: profile spot button (island)
│   ├── receipts/
│   │   ├── receipts-prompt.tsx  # NEW: nudge + spot variants
│   │   ├── share-button.tsx     # NEW: native share / fallback
│   │   └── best-spot-card.tsx   # NEW: best spot display
│   └── site-header.tsx          # MODIFIED: add /receipts nav link
├── db/
│   └── queries.ts               # MODIFIED: add receipts queries
└── drizzle/
    ├── 0008_spots_receipts.sql  # NEW: migration
    └── meta/                    # MODIFIED: update meta

docs/
├── DATABASE.md                   # MODIFIED: add spots, picker_sessions, RLS, join logic
├── DECISIONS.md                  # MODIFIED: add V1→V2 and Receipts entries
├── MVP.md                        # MODIFIED: retitle to V2, add sections
├── DESIGN.md                     # MODIFIED: spot button, prompt spec, nav
├── ARCHITECTURE.md               # MODIFIED: auth as entry point
└── PRODUCT.md                    # MODIFIED: add Receipts to loop
```

## Query Patterns

### Insert Spot

```ts
const result = await db.insert(spots).values({
  userId,
  creatorId,
  rankAtSpot,
  auraAtSpot,
}).onConflictDoNothing().returning();

// Also link session
if (voterSession) {
  await db.insert(pickerSessions).values({
    voterSession,
    userId,
  }).onConflictDoNothing();
}
```

### Get Receipts

```ts
// Battles via picker_sessions join
const battleCount = db.select({ count: sql<number>`count(*)` })
  .from(battles)
  .where(inArray(sql`${battles.voterSession}`, 
    db.select({ session: sql`${pickerSessions.voterSession}` })
      .from(pickerSessions)
      .where(eq(pickerSessions.userId, userId))
  ));

// Spots with current ranks
const spots = db.select({
  id: spots.id,
  creatorId: spots.creatorId,
  rankAtSpot: spots.rankAtSpot,
  auraAtSpot: spots.auraAtSpot,
  currentRank: sql`rank_for_aura(...)`, // computed in SQL
  createdAt: spots.createdAt,
})
.from(spots)
.leftJoin(creators, eq(spots.creatorId, creators.id))
.where(eq(spots.userId, userId))
.orderBy(desc(spots.createdAt));
```

### Get Best Spot

```ts
// Max climb, ties → newest
const best = spots
  .map(s => ({
    ...s,
    climb: s.rankAtSpot ? s.rankAtSpot - s.currentRank : -Infinity,
  }))
  .sort((a, b) => b.climb - a.climb || b.createdAt - a.createdAt)[0];
```

## Reused Patterns

- `src/lib/session.ts` for voter session cookie
- `src/lib/supabase/server.ts`, `client.ts` for auth clients
- `src/proxy.ts` for session refresh
- `queries.ts` for batch queries
- `isRankedSql`, `rankForAura()` logic
- `src/components/scribble.tsx`, `marker-swipe.tsx`
- Profile OG card layout from existing `opengraph-image.tsx`

## Performance Considerations

### Database

- Indexes on `spots(user_id)` and `spots(creator_id)` for fast lookups
- `picker_sessions(user_id)` index for battle join
- RLS policies skipped (server-only) → simpler, faster queries

### Client

- Receipts page is `force-dynamic` (no ISR cache) due to live rank data
- Profile page stays ISR (`revalidate=15`, cookie-free) — spot button is island
- OG card is private cache (`no-store`) to prevent leaks
- Spot button is optimistic (instant feedback, revert on error)

### Queries

- For signed-in users on `/`, one additional small query: `getSpottedIds()` for arena
- Receipts page: two queries (battles count, spots with ranks)
- No N+1 (batch joins in SQL)

## Testing Strategy

### Unit Tests

**`src/lib/receipts/nudge.test.ts`:**
```ts
describe('shouldShowReceiptsNudge', () => {
  test('shows at 5 picks', () => {
    expect(shouldShowReceiptsNudge(5, false, null)).toBe(true);
  });
  test('hides at 4 picks', () => {
    expect(shouldShowReceiptsNudge(4, false, null)).toBe(false);
  });
  test('hides if signed in', () => {
    expect(shouldShowReceiptsNudge(5, true, null)).toBe(false);
  });
  test('shows again at 25 picks if dismissed at 5', () => {
    expect(shouldShowReceiptsNudge(25, false, 5)).toBe(true);
    expect(shouldShowReceiptsNudge(24, false, 5)).toBe(false);
  });
});
```

**`src/lib/receipts/best-spot.test.ts`:**
```ts
describe('pickBestSpot', () => {
  test('returns max climb', () => {
    const spots = [
      { rankAtSpot: 100, currentRank: 50, climb: 50 },
      { rankAtSpot: 50, currentRank: 10, climb: 40 },
    ];
    expect(pickBestSpot(spots).climb).toBe(50);
  });
  test('ties go to newest', () => {
    const spots = [
      { rankAtSpot: 100, currentRank: 50, createdAt: new Date('2026-01-01') },
      { rankAtSpot: 100, currentRank: 50, createdAt: new Date('2026-09-17') },
    ];
    expect(pickBestSpot(spots).createdAt.getTime()).toBe(new Date('2026-09-17').getTime());
  });
  test('excludes nulls and inactive', () => {
    const spots = [
      { rankAtSpot: null, currentRank: null },
      { rankAtSpot: 50, currentRank: 10, isActive: true },
    ];
    expect(pickBestSpot(spots)).toEqual({ rankAtSpot: 50 });
  });
});
```

### Integration Tests

**`queries.test.ts`:**
```ts
describe('spot queries', () => {
  test('spotCreator inserts and returns rank', async () => {
    const result = await spotCreator(userId, creatorId, rankAtSpot, auraAtSpot);
    expect(result.ok).toBe(true);
  });
  test('duplicate spot returns alreadySpotted=true', async () => {
    await spotCreator(userId, creatorId, 50, 2000);
    const result = await spotCreator(userId, creatorId, 40, 2500);
    expect(result.alreadySpotted).toBe(true);
  });
});
```

### Manual E2E Verification

Covered in phase-verify acceptance criteria.

