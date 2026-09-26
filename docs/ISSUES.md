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

## 2026-09-26 — Phones still opened the site in dark after "day is the default" · FIXED

**Symptom.** After `9067942` made day the default on every page, the operator's
phone still opened underhyped.wtf in dark. Desktop browsers showed day.

**Cause.** Two things, one of them the real one. The site's own theme was day
(`data-theme` empty), but the page no longer declared a `color-scheme` — that
declaration used to live inside the removed "follow the OS" block. Mobile
browsers with their own dark feature (Chrome on Android's auto-dark, Samsung
Internet) then darkened the page themselves. Reproduced against the live site
with Chrome's `WebContentsForceDark` flag: day theme, dark pixels `(34,35,33)`.
Second, any phone that had tapped the toggle before still held a saved `dark`
under `uh-theme`.

**Fix.** The day `:root` declares `color-scheme: only light`, which tells the
browser not to recolour it; the `[data-theme="dark"]` block still switches to
dark. The storage key moved to `uh-theme-v2`, so choices saved before the
change are ignored once. Same force-dark test after the fix: day pixels
`(242,244,240)`; night after the toggle.

**Prevention.** `src/app/theme.test.ts` fails if the day `:root` loses
`color-scheme: only light` or the CSS starts following `prefers-color-scheme`
again. Check theme work on a phone (or with the force-dark flag), not only a
desktop browser. **Class of bug:** "it looked right in the source" — the
theme was correct; the browser in between was not.

---

## 2026-09-24 — A newcomer still streaked after the no-back-to-back fix · OPEN

**Symptom.** Hours after shipping "no creator in two battles in a row", a
voter saw Ronak Daga three times running — 10:17:32, :35, :42 in session
`089bc804` — against three different opponents.

**Cause.** The rule was built on top of "unjudged pairs first" instead of
ahead of it: it filtered to the session's unjudged pairs, then pushed back
last battle's creators. That session had judged every pair among the other
nine creators, so its unjudged set was 9 pairs, all containing Ronak (6 still
queued, 0 without him). There was nothing to reorder toward. The original
Cozy Dev streak had exactly this shape, so the fix could never have fixed the
case it was written for.

It shipped as "verified" because the tests used stand-ins for that case: a
fresh visitor (every pair unjudged, alternatives everywhere) and a fully
exhausted session (the random fallback). Neither is "exhausted except a
newcomer", and both passed 40/40.

**Fix.** One query over every active pair, ordered: contains last battle's
creators → already judged → placement → bias + random. Back-to-back now
outranks "unjudged first", so that voter alternates the newcomer with
non-scoring repeats. See DECISIONS.md § 2026-09-24 "The no-back-to-back rule
outranks unjudged-first".

**Prevention.** Verify a fix against the scenario that produced the bug, not
a nearby one that is easier to set up — here, the reporting session's own
judged set, replayed across several consecutive battles. A test that passes
on both extremes can still miss the middle. This is the _"it looked right in
the source"_ shape: the sort key read as a guarantee without checking what
set it sorted.

---

## 2026-09-24 — Avatars rendered blank once unavatar rate-limited the viewer · OPEN

**Symptom.** A newly added creator (Ronak Daga) showed no photo. Once the
operator's IP had used its quota, *no* creator avatar rendered for them —
broken or empty images instead of either the X photo or the Dicebear
illustration.

**Cause.** Two separate things.

1. His row was typed into the Supabase table editor, which runs no app code,
   so `avatar_url` was null. `getCreatorAvatarUrl` only runs inside
   `insertCreator()` — the webhook and `npm run creator:add`.
2. Every avatar is an `unavatar.io` URL loaded in the visitor's browser, and
   unavatar's anonymous tier allows **25 requests per IP per day**
   (`x-rate-limit-limit: 25`). Once spent it returns `429` with a JSON body.
   The Dicebear drawing is passed as unavatar's own `fallback=` param, but
   unavatar only serves the fallback when it *can't find* a photo — a
   rate-limited request is refused outright, so the fallback never arrives.
   The homepage costs roughly 15 avatar requests and a leaderboard view up to
   50, so an active visitor exhausts the quota in one session.

ARCHITECTURE.md § Creator avatars had stated the stored URL "always renders —
no `onError` island needed". That held for "no photo found" and was never
true for "refused".

**Fix.** Stopgap: Ronak's `avatar_url` set by hand to the Dicebear PNG. Real
fix, planned: fetch each photo once when the creator is added, store it in a
public Vercel Blob store, and serve every view from Blob — see
[DECISIONS.md](DECISIONS.md) § 2026-09-24 "Creator avatars are stored in
Vercel Blob". Existing creators are converted by a backfill script.

**Prevention.** A fallback that lives inside a third-party response only
covers the failures that third party chooses to handle. Anything rendered on
every page view must either be served by us or fail to something we control.
This is the _"it looked right in the source"_ shape: the `fallback=` param read
as a guarantee. Rows added outside `insertCreator()` skip every derived
column — use `npm run creator:add`, not the table editor.

---

## 2026-09-12 — The homepage fails roughly half the time in production · OPEN

**Symptom.** `underhyped.wtf` intermittently does not load. Reported as "out of
5 times, 2 times the website would not be running". Measured worse than that
from here: **9 of 14** homepage requests failed before any change, **8 of 12**
after switching pooler modes, and **4 of 8** even in a warm burst. Most failures
are a hang until the client gives up; some are a 500.

**Only the homepage.** Every other route has been reliable at 0.2–0.5 s
throughout every measurement: `/leaderboard` (ISR), `/about`, `/rules`,
`/sponsor`, and creator profiles — which are dynamic and hit the database too.
`/` is the one route that fires roughly fifteen queries per render across
several `Promise.all` groups.

**What is confirmed.** Backends sit `active` on `ClientRead` — Postgres is
mid-statement waiting for the client while the client waits for Postgres, so
neither side moves. Parameters from one statement arrive in another statement's
Bind: `invalid input syntax for type integer: "f"`, where `$1` should have been
`10` and `'f'` is the wire encoding of a boolean from a different query. Stuck
connections accumulate and poison the pool.

**Fixed so far** (real defects, neither sufficient):
- `max_pipeline` unset. At 1 it desynchronised the protocol; at 0 it had
  already disabled every transaction (separate entry above).
- Session mode (port 5432) instead of transaction mode (6543), which hands
  statements between backends mid-exchange. Locally this took the production
  build from 9-of-14 failing to **35 of 35 passing** at half the latency —
  and still did not fix production. In production it made things worse: the
  homepage went from intermittent failure to a total outage. Postgres logs
  showed `ShareLock` waits up to 76 s, statement-timeout cancellations, and
  `there is already a transaction in progress` — a connection handed back to
  the pool with an open transaction still on it. Transaction-mode pooling had
  been silently absorbing this by resetting connection state after every
  transaction; session mode has no such reset, so a stuck transaction now
  holds its locks for its full lifetime.
- Found the stuck transaction: `pickWinner` in
  [src/app/actions/battle.ts](../src/app/actions/battle.ts) locked the winner
  row and the loser row as two separate `for("update")` queries. Two
  concurrent picks on the same pair in opposite order (A-beats-B vs B-beats-A,
  routine with popular creators) lock in opposite order and queue behind each
  other. Fixed by locking both rows in one query, ordered by id, so any two
  transactions touching the same pair always acquire locks in the same order.

**Ruled out by testing.** `prepare` true and false; `fetch_types: false`;
`max_pipeline` 0, 1 and default; `max: 1` (hangs outright); the voter-session
cookie (cookieless and cookied requests both hang); dev vs production build
(reproduces in both). A standalone script issuing the same queries with the
same options never fails, so the trigger is how the app drives the driver, not
the driver's configuration alone.

**Next suspect.** The homepage's own query volume and concurrency. The two
candidate fixes, neither tried yet: collapse `getHomeStats`' six parallel
counts into one statement and reduce the per-render query count; and cache or
stream `/` so a slow query cannot fail the whole page, the way `/leaderboard`
already survives. `/leaderboard`'s perfect record is the strongest clue
available — the difference is not the database, it is how much of it each
render needs at once.

**Prevention.** Not yet earned; the issue is open. What the investigation
already shows: *this is the third distinct bug introduced by tuning this one
client* (`max_pipeline: 0`, then `max_pipeline: 1`, then a still-open hang), so
every change to the database client must be validated against the running app
under repeated requests, never against a standalone script and never by the
absence of the previous symptom. **Class of bug:** a config value that fails
silently — the same shape as the two entries below it.

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

**Fix.** Shipped as `max_pipeline: 1` — same intent (one in-flight statement
per socket through the transaction-mode pooler) with the reservation handshake
intact. **Superseded the same day:** 1 turned out to desynchronise the protocol,
so the option is now unset entirely. See the open entry at the top of this file.
`src/lib/db/client-options.ts`, DECISIONS.md § 2026-09-12.

**Prevention.**
- `src/lib/db/client-options.test.ts` asserts that `max_pipeline` is unset, plus
  the other options that fail silently at runtime. The options moved into their
  own module purely so they could be asserted without a database.
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

## 2026-09-07 — Category labels flip-flopped three times · FIXED 2026-09-14

**Symptom.** Clicking any category chip on `/leaderboard` showed an empty
board. Reported as "when I click on Indie Developer, I can't see all the people
who are Indie Developers. It shows blank."

**Cause.** The list of categories lived in a component
(`enter-arena-flow.tsx`) while the values lived free-form in the database
(`z.string().trim().min(1)`), with nothing tying them together. They drifted.
Three commits on 2026-09-07 flipped the labels singular → plural → singular
without settling, and the last one shipped knowing the decision record still
disagreed. The filter compares with exact equality, so the mismatch was total
and silent: chips read `"Indie Developer"`, six creators stored
`"Indie Developers"`, and three seeded demo people stored `dev`,
`illustration` and `music` — values from a taxonomy that predated the
three-category decision entirely. Only `CEO/Founder` worked, because that
creator was added after the chips shipped.

**Fix.**
- `CATEGORIES` moved to `src/lib/creator-schema.ts` as the single definition,
  read by the submit chips, the leaderboard filter and the schema.
- `category` validated with `z.enum(CATEGORIES)` instead of a free string, so
  both write paths — the checkout action and the Dodo webhook — reject a value
  no filter could match.
- `scripts/seed.ts` types its category field as `Category`; it can no longer
  produce a value the app does not know.
- Data: six rows migrated to `"Indie Developer"`; the three seeded demo people
  deactivated. Battle history untouched, so no real creator's Aura moved.

**Prevention.** Tests in `creator-schema.test.ts` pin the exact list and assert
that the drifted values (`"Indie Developers"`, `dev`, `illustration`, `music`)
are rejected. The enum is the real guard: the previous fix was a commit message
asking someone to reconcile the record later, and nobody did for a week.
**Class of bug:** a constant that drifted from its decision record. The enum
converts that from a thing people must remember into a thing the compiler and
the schema enforce — it immediately caught the submit flow carrying `category`
as an unconstrained `string`.

**Also worth knowing.** `scripts/seed.ts` says "never run against a database
with real creators" and had been run against production: three fictional people
sat on the live public leaderboard for weeks. Deactivated now, not deleted, so
the battles they took part in still add up.

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
