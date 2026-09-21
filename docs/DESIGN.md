# DESIGN.md

The visual language and UX rules. Decided here, not invented per session.

**Version 2.** The tokens, type, and components below describe the V2 direction
agreed in the design mockup — see [DECISIONS.md](DECISIONS.md) § 2026-09-10.
Where V2 changed a V1 rule, the old rule is marked rather than deleted, so a
future session can see the change was deliberate and not drift.

## Brand

Name: **Underhyped**
Domain: underhyped.wtf

Primary tagline:
> Discover people before everyone else does.

Secondary:
> The internet decides who's criminally underhyped.

Header lockup:
> underhyped**.wtf** — "Talented people deserve more hype."

Footer lockup:
> underhyped**.wtf** — "Good people deserve more hype."

The `.wtf` is always the Aura accent. The two taglines differ on purpose:
the header speaks to creators arriving, the footer signs the page off.

## Style

Is:

- internet-native
- playful
- minimal
- competitive
- slightly weird
- **hand-annotated** — the page looks like someone marked it up in pen

Is not:

- corporate
- LinkedIn
- generic SaaS
- glassmorphism
- AI purple-gradient website

If a screen could appear in a B2B SaaS pitch deck, it is wrong.

## Tokens

```
Ground (page)     #F7F7F2
Surface (card)    #FFFFFF
Ink               #111111
Ink soft          #6B6B66   body meta, labels
Ink faint         #A5A59D   timestamps, disabled, third tier

Lime              #D8FF3E   V2 accent — celebration, winner, primary CTA
Lime deep         #C4EE1F   lime hover only
Aura              #FF5A1F   Aura values, "new challenger", the .wtf
Winner            #22C55E   won a battle, online indicator
Down              #DC3B40   negative rank movement

Hairline          rgba(17,17,17,0.10)   default divider / card edge
Hairline strong   rgba(17,17,17,0.16)   table header rule, input border

Shadow card       0 1px 2px rgba(17,17,17,.04), 0 12px 28px -10px rgba(17,17,17,.16)
Shadow lift       0 2px 4px rgba(17,17,17,.05), 0 22px 42px -14px rgba(17,17,17,.22)

Radius            18px      cards, panels
Radius sm         12px      buttons, inputs, small cards
Radius pill       999px     chips, badges, avatars-as-circles

Shell max-width   1060px
```

Dark mode is not V1.

**Two accents, and they never mean the same thing.** Lime is celebration and
action — the primary CTA, the #1 podium card, the marker swipe, the check
badge. Aura orange is a *value* — the Aura number itself, and the "new
challenger" state. Never use lime to render a number, and never use Aura
orange as a button fill.

> **Changed in V2.** V1 specified `Border #111111 / Border width 2px` and
> `Radius 12px` with "minimal shadow". V2 replaces the universal 2px black
> border with hairlines plus a soft card shadow, and moves the card radius to
> 18px. Buttons and inputs keep 12px. The black border survives only where an
> element must read as pressed-in or selected (an active filter chip).

## Type

Three families. Each has one job; never mix their jobs.

```
Display   Archivo    500–900   headlines, numbers, buttons, labels
Body      Geist      400–700   sentences, bios, descriptions
Hand      Caveat     600–700   marginalia only — never UI text
```

Numbers (Aura, rank, counts): tabular figures, always — digits must not jitter
when they change. Display face, 800 weight.

Scale:

```
Display   clamp(32px, 5.4vw, 60px)   900   page headline, one per page
H2        24–26px    800    section heading
H3        17–20px    800    card name, step label
Body      15–16.5px  400–500
Small     13–14px    500–600   meta, links, captions
Micro     11–12px    600–700   uppercase tracked labels, eyebrows
```

Headlines are `letter-spacing: -0.03em` to `-0.045em` and `line-height` under
1.0. They are meant to look set, not typed.

> **Changed in V2.** V1 said "Heading and body: same family." V2 splits display
> from body, and adds the hand family for marginalia.

## Components

**Cards** — white surface on the off-white ground, 18px radius, hairline or no
border, soft shadow. Lift 3px on hover where the card is interactive. No
gradients, no blur.

**Buttons**

- Primary action — lime fill, ink text, 14px radius, chunky. Full-width on mobile.
  The homepage "Enter the Arena" instance carries a soft lime drop glow and
  sits cardless on the open ground between the pulse row and the stats bar —
  no heading, no subhead, no box. It is the only weight in that band, and a
  card around it would put a second box directly under the two battle cards.
- Secondary — surface fill, hairline border, ink text.
- Ink — solid `#111111` with white text, for in-card actions like the pick button.
- Ghost — underlined text, no chrome, for escape hatches ("Start over").

> **Changed in V2.** V1 said "Primary is black on white." V2's primary is lime;
> black-on-white became the in-card Ink button.

**Avatars** — circular in list and podium contexts (leaderboard rows, facepiles,
podium cards); square with 12px radius in identity contexts (profile page, the
post-payment card). The rule is: a circle when the face is one of many in a
row, a square when the face *is* the subject.

**Battle portraits are the one exception to the square rule** — a rectangular
5:4 photo-forward banner crop, full-bleed at the top of the card,
`object-position: top` so a tight crop never cuts off a head. The battle
card's whole point is putting two people's work in front of you side by side;
a bigger, wider photo carries that better than a small square headshot does.

> **Changed in V2.** V1 said square with rounded corners, never circles. V2
> made every identity context square — then made battle portraits rectangular
> again on review, once seen next to the mockup. See DECISIONS.md § 2026-09-10
> "Battle portraits go rectangular".

**Chips** — pill, surface fill, hairline border. Selected state inverts to ink
fill with white text. Used for leaderboard filters and category labels.

**Ranked tables** — the homepage Top 10 is a table, not a stack of cards:
hairline row rules, no card chrome, uppercase letter-spaced column headers
(`# / Creator / Category / Aura / Trend`), row tint on hover. The rank number
takes the rank-title colour for the top three (Aura orange, blue, purple) so
the podium reads without the badge. Aura is `🔥 1555`; Trend is an arrow plus
Aura moved today, green up / red down, em dash when there is no number for
that creator today. Below `sm` the table drops Category and Trend rather than
scrolling sideways — Aura is the number people came for and must never sit
off-screen. Trend never shows rank movement; see DECISIONS.md § 2026-09-10
"The Trend column shows Aura moved today, not rank movement".

**Work links** — the project's real favicon/logo in a rounded square, then
the bare host, then a chevron. When no logo resolves it becomes a solid
colour mark with the host's initial — the colour is derived from the host, so
it is stable per creator without being stored. Both states are the same size,
so a missing logo never shifts the row.

**Facepiles** — circular avatars, 32px, overlapping by ~10px, 2px ground-
coloured ring to separate them, each one a link to that creator's profile.
Used beside the pick counter under the battle. They show creators, never
voters — voting is anonymous and has no face to show. The pulse-row pile is
always populated: today's battled creators when there are any, the top of
the board otherwise, so the row never renders face-less between the UTC day
rolling over and the day's first pick. See DECISIONS.md § 2026-09-12 "The
pulse-row facepile is always populated".

**Live panel** — one card, three stacked bands separated by hairlines: an
uppercase letter-spaced title with a green dot and the online count on the
right; a four-up grid of stat tiles (ground fill, hairline border, 12px
radius, big black number with its emoji inline on the baseline, quiet label
under it); and the `JUST HAPPENED` feed. Feed rows are a fixed-width emoji
column, a sentence where only the names are bold and the connecting words are
ink-soft, and a right-aligned relative timestamp — hairline between rows, no
highlight on the newest one, no inner scroll. Rows are capped at six; the
panel shows what just happened, not a log. Every event in it is something that
actually happened to a creator — no rank movement, no counters for features
that do not exist. See DECISIONS.md § 2026-09-10 "The Live panel's fourth tile
is picks today, not nominations".

**Badges** — `New challenger` is Aura orange on a 12%-alpha Aura tint.
`Main Character` / `Side Character` / `Plot Twist` are solid-fill rank titles on
the top three leaderboard rows.

**Marginalia (the scribble)** — short uppercase handwritten notes in the outer
page margins, rotated a few degrees, with a hand-drawn arrow or underline in
SVG. Two per page maximum, one per side. They comment on the page; they never
carry information the page needs. Below 1040px they stop being margin notes and
become centred inline notes under the block they annotate; the left-hand arrows
drop, since inline they point at nothing.

**Marker swipe** — a lime highlighter stroke behind one word of a headline,
irregular edges via `clip-path`, rotated ~1°. One word per page. It marks the
word the page is actually about.

**Icon rings** — 54–60px circle, ground fill, hairline border, 22–25px icon at
2.2 stroke. Used for step and feature rows.

**Mobile nav** — below `sm` the header's four links (Arena / Leaderboard /
About / Rules) collapse behind a 40px hamburger button at the right of the
masthead row: wordmark lockup · Enter-the-arena pill · hamburger. The pill
never leaves the header; the menu holds only the nav links. Tapping the
hamburger drops a panel *in flow* under the masthead — ground fill, hairline
rule above and below, links stacked on the 4px scale — and pushes the page
down rather than covering it. There is no backdrop, no scroll lock, no
full-screen sheet: the battle stays visible behind an open menu. Links are
Display 800, 28px, `-0.03em` tracking, sentence case (never uppercase — the
size carries it; uppercase tracking is for Micro labels). The current route
renders in Aura orange, the rest in ink: a state, not a button, so it keeps
the two-accents rule. The hamburger becomes an × while open; the panel closes
on navigation, Escape, or the ×. Entrance is a 180ms fade + 6px slide,
gated by `prefers-reduced-motion`. The desktop nav is untouched and still
has no active-route highlight — that would put the whole header client-side
for a state the mobile island already carries.

**Spacing** — 4px base scale (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64). Generous
whitespace around the battle. Dense is fine on the leaderboard.

**Animation** — fast and physical. 150–250ms for state, up to 420ms for
entrances. The Aura change animates (count up in the Aura accent color), the
winner gets a brief green flourish, the next battle snaps in. Live counters
count up once on first scroll into view, never on every pass. Nothing bounces
for longer than it takes to click again. No page-level loading spinners in the
loop. Everything animated respects `prefers-reduced-motion`.

## UX Rules

1. **The battle is the first thing that matters.** The homepage headline is one
   line and a subhead above the battle — enough to say what the page is, never a
   marketing hero. Anything longer belongs on About.

   > **Changed in V2.** V1 read "The battle is above the fold. No hero section."
   > V2 permits a one-line headline plus subhead above the battle and nothing
   > more. If the battle stops being visible without scrolling on a normal
   > phone, the headline is too big — cut it, not the battle.

2. **No signup wall.** Voting never asks for an account.
3. **Two taps, no dead time.** Pick → feedback → next battle. Prefetch the next
   battle so there is never a wait.
4. **Mobile first, and the pair stays a pair.** Design the phone layout first.
   The two creators stay side by side at every width — comparing them *is* the
   interaction, and stacking puts one off-screen. The cards shed detail instead:
   handle, then work-link chrome, then bio.

   > **Changed in V2.** V1 read "Two creators stack vertically on mobile, side
   > by side on desktop." Reversed after testing the stacked layout broke the
   > comparison.

5. **The pick is unmistakable.** Whole card is the tap target, not a small button.
6. **Feedback is immediate.** Optimistic UI on the pick; the server is the truth
   for Aura.
7. **Sponsor is labeled.** The Spotlight slot always reads as sponsored, is
   visually distinct from creators, and never appears inside a battle.
8. **Numbers are the decoration.** Aura, rank, and streaks carry the visual
   energy — not illustrations or stock imagery.
9. **Empty states have personality.** Never "No data available."
10. **Nothing on screen implies a feature that does not exist.** No nominate
    button until nominations ship, no rank-movement arrow until rank snapshots
    exist. A mockup may show them; production may not.

## Page Inventory (V2)

The mockup covers these surfaces. Each is ported as its own change, on the
shared foundation (fonts, tokens, primitives, header/footer) rather than
page-by-page reinvention.

| Surface | Route | V2 state |
| ------- | ----- | -------- |
| Arena | `/` | headline, battle pair, pulse row, CTA, stats bar, three-up, sponsor, Hottest 10, Live on Underhyped |
| Leaderboard | `/leaderboard` | scope + category filters, top-3 podium, ranked table, load more |
| Profile | `/c/[username]` | identity card, Aura / placement / wins stat row, links |
| Enter the Arena | `/submit` | two-link form, preview, category pick, edit |
| Welcome | `/submit/success` | check badge, post-payment card, placement progress, "what happens next", Explore the Arena, share panel |
| About | `/about` | manifesto, "three things money doesn't buy" |
| Rules | `/rules` | numbered rules list, finale panel |

## References

Screenshots beat 1,000 words of aesthetic description. Drop them here:

```
docs/references/
    inspiration-01.png
    inspiration-02.png
    battle-layout.png
```

Agents: check `docs/references/` before designing a screen.

## Receipts Feature (V2)

### Spot button

Location: Top-left of battle card portrait — `👁 SPOT` from `sm` up, eye first, then the word in the Micro scale (uppercase, tracked); icon-only below `sm` — and next to share button on profiles (pill or icon).

> **Changed 2026-09-21.** The battle-card variant was a 36px circle with the
> eye alone. It read as decoration rather than an action, and it sat under
> the 44px hit area below. The pill is 44px, top-left, matching the Aura
> badge's top-right — but the two battle cards stay side by side on phones
> (§ Principles 4), which leaves each portrait too narrow for a labelled pill
> and the badge to share the top edge (measured 7px overlap at 390px, 42px at
> 320px). Below `sm` the pill drops its label and stays icon-only, still
> 44px; the label returns from `sm` up. The label does not change when
> spotted; the lime fill and `aria-pressed` carry that.

Styling:
- **Idle:** Ground fill (`#F7F7F2`), hairline border, dark ink eye icon, label from `sm` up
- **Spotted:** Lime fill (`#D8FF3E`), dark ink eye icon, label from `sm` up
- **Hover:** Slightly darker (lime hover / ground hover)
- **Aria labels:** `aria-label="Spot {firstName}"`, `aria-pressed={true|false}`
- **Hit area:** ≥ 44px (touch-safe)

Behavior:
- `type="button"`, `stopPropagation()` (no nested-button issue)
- Signed-out: tap → Receipts prompt
- Signed-in: tap → optimistic update (eye fills lime) → server action → revert on error

### Receipts prompt

Role: Dialog (Escape/backdrop close, reduced-motion safe).

Variants:

**Nudge** (after 5 picks, centered card at every width):

> **Changed 2026-09-21.** This read "bottom sheet mobile / centered card
> desktop", and the implementation was pinned to the left at every width
> because a `<dialog open>` inside a flex-centred overlay is
> `position: absolute` and ignores the centring. Both variants are now a
> native dialog opened with `showModal()` — top layer, centred, Escape and
> backdrop close, focus contained — and both centre on phones too, as asked.
> A bottom sheet on mobile can be reintroduced deliberately if centred proves
> worse on phones.
```
5 BATTLES IN.
Want us to keep your receipts?
We'll remember who you backed before everyone else catches up.

[🔵 KEEP MY RECEIPTS →]  (Primary lime, Google button)
[Not now]                (Ghost)
```

**Spot** (on button tap when signed-out):
```
Spot {firstName}?
Sign in and we'll keep the receipt.

[🔵 SIGN IN WITH GOOGLE →]
[Not now]
```

Buttons call `startGoogleSignIn(next)` with current path as fallback.

### Navigation

Add to `site-header.tsx` `NAV_LINKS`:
```
{ href: "/receipts", label: "Receipts" }
```

### Rule 2 (Sign-in)

**Updated:** "Sign-in exists only to keep receipts, and is only ever offered, never required."
- Picking stays account-free (unchanged from V1)
- Sign-in is only offered via Receipts nudge (after 5 picks)
- Tapping Spot button when unsigned-out shows prompt, not a forced sign-in

