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
- Secondary — surface fill, hairline border, ink text.
- Ink — solid `#111111` with white text, for in-card actions like the pick button.
- Ghost — underlined text, no chrome, for escape hatches ("Start over").

> **Changed in V2.** V1 said "Primary is black on white." V2's primary is lime;
> black-on-white became the in-card Ink button.

**Avatars** — circular in list and podium contexts (leaderboard rows, facepiles,
podium cards); square with 12px radius in identity contexts (profile page, the
post-payment card, battle portraits). The rule is: a circle when the face is one
of many in a row, a square when the face *is* the subject.

> **Changed in V2.** V1 said square with rounded corners, never circles.

**Chips** — pill, surface fill, hairline border. Selected state inverts to ink
fill with white text. Used for leaderboard filters and category labels.

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
| Arena | `/` | headline, battle pair, pulse row, CTA, three-up, sponsor, Hottest 10, Live on Underhyped |
| Leaderboard | `/leaderboard` | scope + category filters, top-3 podium, ranked table, load more |
| Profile | `/c/[username]` | identity card, Aura / placement / wins stat row, links |
| Enter the Arena | `/submit` | two-link form, preview, category pick, edit |
| Welcome | `/submit/success` | post-payment card, "what happens next", Explore the Arena |
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
