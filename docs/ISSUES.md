# ISSUES.md

Every issue that has broken Underhyped, newest first. One entry per issue:
what broke, what the user saw, the real cause, the fix, and **how it is stopped
from happening again**.

This file exists because several of these have repeated. Two rules:

1. **Fixing an issue is not finishing it.** An entry without a Prevention line
   is an invitation to ship the same bug twice.
2. **Read the class, not just the entry.** The recurring shapes so far are
   _a config value that fails silently_, _a number rendered from stale state_,
   _a constant that drifted from its decision record_, and _"it looked right in
   the source"_. Check the new work against those four before calling it done.

Status: **FIXED** (shipped and verified) · **OPEN** (known, not yet fixed).

---

## 2026-09-12 — A picked creator came back with its old Aura · FIXED

**Symptom.** Picking a creator showed their Aura go up, but when the same face
appeared in a later battle it was back to the number it had before the pick.

**Cause.** The next pair is prefetched so the loop has no dead time — but it
was fetched *before* the pick that changes Aura. Page load prefetched pair B
immediately; the pick in pair A moved two creators' Aura; 700 ms later pair B
was displayed still carrying its pre-pick snapshot. `advance()` then prefetched
the following pair straight away, again before the next pick, so every pair on
screen was a snapshot taken one pick too early. With nine active creators a
face reappears constantly, so it showed almost every battle.

**Fix.** Three layers, because the first alone does not cover a creator picked
several battles ago or the server-rendered first pair:
1. A counted pick discards the queued pair and refetches inside the result
   window, so the prefetch follows the pick instead of preceding it.
2. The Aura `pickWinner` returns from inside the vote transaction is remembered
   per creator and outranks the row a prefetched pair arrived with. Still
   server truth — it picks the later of two server figures, never a
   client-side calculation (AGENTS.md "Never modify Aura client-side").
3. An epoch counter, so a prefetch already in flight when the pick lands cannot
   overwrite the fresh pair with its older rows.

Also keyed the battle cards by creator id. `useCountUp` animates from whatever
the card last showed, and the unkeyed cards reused one instance across battles
— Priya's 1463 counted *down* from the previous creator's 1666. Without the
key, a corrected Aura looks like Aura moving.

**Prevention.** `freshestAura` in `src/components/battle/aura.ts` is a pure
function with tests covering the precedence order, including this exact case.
**Class of bug:** cached or prefetched data that predates a write. Anything
prefetched before a mutation is stale by definition — either refetch after the
mutation or carry its authoritative result forward. The same reasoning fixed
the frozen counter above.

---

## 2026-09-12 — Every pick failed silently; no Aura ever moved · FIXED

**Symptom.** Clicking a creator advanced to the next battle and changed
nothing — no Aura, no `+N` badge, no error. Reported as "whenever I click,
there is no addition of aura for that card".

**Cause.** `max_pipeline: 0` in the postgres.js client (shipped the previous
day in `b880767`). postgres.js gates its `onexecute` callback behind
`sent.length < max_pipeline`, and `&&` short-circuits — so at `0` the callback
never runs. `onexecute` is what marks a connection *reserved* for `sql.begin`,
so every transaction hit the driver's `UNSAFE_TRANSACTION` guard the moment its
`BEGIN` completed. `pickWinner` is entirely inside `db.transaction()` (voting
is transactional by mandate, AGENTS.md), so every pick threw before writing.

**Why nobody noticed for a day.** Reads are not transactional, so the
leaderboard, profiles and stats all looked perfectly healthy. The site appeared
to work while the core loop scored nothing. `handlePick`'s `catch` treats any
failure as a stale pair and advances, so the UI reported success.
No `battles` row was written between `2026-09-11 15:01 UTC` and the fix.

**Fix.** `max_pipeline: 1` — same intent (one in-flight statement per socket
through the transaction-mode pooler), reservation handshake intact.
`src/lib/db/client-options.ts`, DECISIONS.md § 2026-09-12.

**Prevention.**
- `src/lib/db/client-options.test.ts` asserts `max_pipeline >= 1` and the other
  options that fail silently at runtime. The options moved into their own
  module purely so they could be asserted without a database.
- The 2026-09-11 decision entry carries a correction note, so the `0` cannot be
  "restored" as if it were the considered value.
- **Class of bug:** a driver option whose wrong value is not a type error, not
  a crash, and not visible in any read path. When tuning a client library,
  verify the behaviour the option governs, not just that the app still loads.

---

## 2026-09-12 — "Battles today" never moved · FIXED

**Symptom.** The pick counter stayed the same no matter how many battles you
played.

**Cause.** Two layers. Underneath, the issue above: no `battles` rows were
being written, so `count(*) ... where created_at >= UTC midnight` genuinely
could not move. On top of that, an independent bug that would have survived
that fix — both arena counters (`"N picks today"` in the pulse row,
`"Battles today"` in the stats bar) were server props read once per render, so
they stayed frozen for the life of the page. Only the Live panel's tile
refreshed, on its own 45 s ping, so the same page could show two different
figures for the same thing.

**Fix.** `pickWinner` now returns `battlesToday` counted inside the vote
transaction; a small client context (`src/components/battle/picks-today.tsx`)
shares it, so both renderings move together and neither invents a number.
DECISIONS.md § 2026-09-12.

**Prevention.** A live number belongs to one source that updates, not to two
props that don't. Before shipping a counter, ask what makes it change on the
page that changes it — if the answer is "a reload", it is not done.
**Class of bug:** same family as the Geist font (2026-08-31) and the stale-CSS
trap (2026-09-04) — the source looked correct, and only the rendered page
showed otherwise.

---

## 2026-09-12 — Main Character invisible on the mobile podium · FIXED

**Symptom.** On a phone the #1 creator was impossible to pick out of the
top-three podium.

**Cause.** The podium was an inverted hierarchy below `sm`: the column ratio
made #1 only 12% wider, every type and avatar step sat behind `sm:`, and
because the cards are bottom-aligned and #2/#3 carried a two-line rank badge
that #1 lacked, the side cards were *taller* — #1's top edge sat below theirs,
with their blue/magenta chips pulling the eye off the lime card.

**Fix.** Mobile-specific column ratio and size steps, the existing
"most underhyped right now." note surfaced on mobile #1, and #2/#3 shedding
their badge and category chip below `sm` in favour of the rank-title colour on
the number — the rule the homepage Top 10 already used. `min-w-0` on the cards
fixed unequal `1fr` columns. `fc70e1f`.

**Prevention.** Mobile-first is rule 4 in DESIGN.md § Principles; this shipped
desktop-first, with every size step written as `sm:` and nothing for the phone.
When a layout has a designated focal element, assert its measured size and
position at 320/360/390px, not just that the page looks fine at 1280px.

---

## 2026-09-11 — Homepage hung intermittently, nothing in flight at Postgres · FIXED

**Symptom.** `/` sometimes returned a full page in under a second and
sometimes served no bytes for minutes, while `pg_stat_activity` showed nothing
running from the app.

**Cause.** A Vercel function is frozen between requests. postgres.js keeps its
module-level pool across the freeze, but Supavisor and the network do not keep
the idle sockets alive underneath it, so the next request wrote into a dead
socket and waited out TCP rather than the database. A socket dying mid-pipeline
also let the re-sent queue misalign, which is where an earlier crossed
parameter (`'f'` from another statement) came from.

**Fix.** Drop idle sockets, recycle every socket, fail dead handshakes in
seconds. `b880767`, DECISIONS.md § 2026-09-11.

**Prevention.** Client defaults assume a long-lived server; this runs on frozen
functions. Any new connection-pool or cache that lives at module scope has to
be checked against that lifecycle. Note this fix is what introduced the
`max_pipeline: 0` bug above — a fix under time pressure needs its own
verification, not just the disappearance of the original symptom.

---

## 2026-09-11 — Production `/` returned 500 on every request · FIXED

**Symptom.** The homepage 500'd in production while working locally.

**Cause.** The Vercel function ran in `iad1` while the Supabase project is in
`ap-northeast-1`. The homepage's parallel stat queries stalled across that
distance until Postgres cancelled them on `statement_timeout`.

**Fix.** Pin the function region to `hnd1`, next to the database. `520690f`,
DECISIONS.md § 2026-09-11.

**Prevention.** Region is part of the architecture, not a deploy detail; it is
recorded in DECISIONS.md so a new project or a moved database gets checked
against it. Local success says nothing about the distance between a deployed
function and its database.

---

## 2026-09-07 — Category labels flip-flopped three times · OPEN

**Symptom.** Three commits in one day: singular labels (`c79478c`), reverted to
plural (`994f4f1`), then singular again (`495344c`) — the last one shipping
with a note that the decision record still disagreed.

**Still broken today.** `CATEGORIES` in `enter-arena-flow.tsx` is
`["Indie Developer", "Builder", "CEO/Founder"]` (singular). The nine active
creators store `"Indie Developers"` (6), plus legacy `dev`, `illustration` and
`music` (1 each). `/leaderboard` filters with exact equality
(`entry.category === category`), so **every category chip returns an empty
board**, and DECISIONS.md § categories still records the plural taxonomy.

**Fix needed** (three parts, none of them done):
1. Decide the taxonomy once — singular or plural — and update
   DECISIONS.md § categories to match.
2. Normalise the existing rows, including the three legacy values that predate
   the taxonomy entirely.
3. Make the filter tolerant of, or migrated past, the mismatch.

**Prevention.** The taxonomy is stated in two places that can drift, with live
data as a silent third. One constant should own it, the decision record should
point at that constant rather than restating the values, and a filter that can
only ever return zero rows should be caught by a test over real category
values.

---

## 2026-09-05 — `/c/[username]` 500'd for every visitor · FIXED

**Symptom.** Every creator profile threw a 500 in production, found live after
the `underrated.lol` → `underhyped.wtf` domain move.

**Cause.** `NEXT_PUBLIC_APP_URL` was misconfigured on Vercel (not a valid URL)
and `clientEnv()`'s schema requires it, so the route threw on every request.

**Fix.** Derive the share URL from the request's own `Host` header, which
always matches whatever domain served the request. `df4665c`.

**Prevention.** A deploy-time env var that duplicates something the request
already knows will eventually disagree with it. Prefer the request. Where an
env var is genuinely required, a bad value must not be able to take a whole
route down.

---

## 2026-09-04 — Mobile nav spacing "broke" after a fix that was correct · FIXED

**Symptom.** A `gap-x-4/gap-y-1` change rendered as zero spacing in the
browser, looking like a real layout bug.

**Cause.** Not a bug in the code. Next dev serves CSS at a stable unhashed
URL, so a browser holding a cached bundle keeps using it while the HTML
updates — a brand-new utility class renders as nothing until the CSS cache
clears. `gap-4` was already in the bundle, so it survived.

**Fix.** Reverted to `gap-4` and documented the trap inline. `229235f`.

**Prevention.** Documented at the call site so it is not re-diagnosed as a real
bug. When a brand-new utility class appears to do nothing in dev, hard-reload
before debugging the markup.

---

## 2026-09-04 — Share button crashed when clipboard permission was denied · FIXED

**Symptom.** The share button threw instead of reporting failure.

**Cause.** `navigator.clipboard.writeText()` rejects with `NotAllowedError`
for reasons unrelated to user intent (permission not yet granted, insecure or
embedded context, focus timing), and it was the only call in the function not
wrapped in `try/catch`.

**Fix.** Fall back to `execCommand("copy")`, plus a "Couldn't copy" state.
`8a4a3a2`.

**Prevention.** Browser APIs behind a permission prompt can reject for
environmental reasons, not just refusal. Every one of them needs a failure
state in the UI, not an unhandled rejection.

---

## 2026-09-04 — A bare domain was rejected in the work-link field · FIXED

**Symptom.** Typing `www.example.com` without `https://` failed validation.

**Cause.** `workUrl` used plain `z.url()`, which requires a scheme;
`new URL()` throws on protocol-less input.

**Fix.** `z.preprocess()` reusing the `normalizeToUrlString()` helper the
profile-link field already used. `ff39ce1`.

**Prevention.** Normalise user input before validating it, and reuse the
existing normaliser rather than writing a second one — the helper was already
in the codebase when this shipped.

---

## 2026-09-03 — Header nav clipped and overlapped on mobile · FIXED

**Symptom.** Four nav links plus the wordmark in one unwrapped flex row
overlapped at phone widths.

**Fix.** Stack below `sm:`, and let the nav row wrap at very narrow widths;
verified at 320px. `d5888f8`. Later superseded by the mobile dropdown
(`ff49cf5`).

**Prevention.** Verify at 320px, not just at the design's reference width.
This was spotted in a design review and deferred as out of scope — a known
layout break should be fixed or written down here, not left in a session log.

---

## 2026-08-31 — Every font silently fell back to the browser default · FIXED

**Symptom.** The whole site rendered in a serif fallback with a squished,
unstyled Top 10 header. Caught from a user screenshot.

**Cause.** `globals.css` defined `--font-sans: var(--font-sans)` —
self-referential, so it never resolved. The Geist loader in `layout.tsx`
exposes `--font-geist-sans`.

**Fix.** Point the variable at the real one. `eda3ace`.

**Prevention.** This is the entry that added Playwright to the project, for
exactly this reason: the fix was verified by rendering the page and reading
computed `font-family` and element spacing, not by re-reading the source. A
CSS variable that resolves to itself is invisible in review and total at
runtime. **Class of bug:** "it looked right in the source" — the most repeated
shape in this file.
