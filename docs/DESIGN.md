# DESIGN.md

The visual language and UX rules. Decided here, not invented per session.

## Brand

Name: **Underhyped**
Domain: underhyped.wtf

Primary tagline:
> Discover people before everyone else does.

Secondary:
> The internet decides who's criminally underhyped.

## Style

Is:

- internet-native
- playful
- minimal
- competitive
- slightly weird

Is not:

- corporate
- LinkedIn
- generic SaaS
- glassmorphism
- AI purple-gradient website

If a screen could appear in a B2B SaaS pitch deck, it is wrong.

## Tokens

```
Background        #F7F7F2
Surface           #FFFFFF
Text              #111111
Text muted        #6B6B66
Primary           #111111
Aura accent       #FF5A1F   (orange/red)
Winner            #22C55E   (bright green)
Loser             #9CA3AF
Border            #111111
Border width      2px
Radius            12px
```

Dark mode is not V1.

## Type

Heading: large, bold grotesk. Tight tracking. Loud.
Body: same family, regular weight, generous line height.
Numbers (Aura, rank): tabular figures, always — digits must not jitter when they change.

Scale:

```
Display   48–72px   bold      Main Character, battle headline
H1        32px      bold
H2        24px      bold
Body      16px      regular
Small     14px      regular   meta, labels
Micro     12px      medium    uppercase labels, "SPONSORED"
```

## Components

**Cards** — mostly flat. 2px black border, 12px radius, minimal shadow. White on
the off-white background. No gradients, no blur.

**Buttons** — solid fill, 2px black border, 12px radius. Chunky. Full-width on
mobile. Primary is black on white; the pick action is the biggest thing on screen.

**Avatars** — square with rounded corners (not circles), 2px black border.
Consistent aspect ratio, no cropping surprises.

**Spacing** — 4px base scale (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64). Generous
whitespace around the battle. Dense is fine on the leaderboard.

**Animation** — fast and physical. 150–250ms. The Aura change animates (count up
in the Aura accent color), the winner gets a brief green flourish, the next battle
snaps in. Nothing bounces for longer than it takes to click again. No page-level
loading spinners in the loop.

## UX Rules

1. **The battle is above the fold.** Homepage opens on a live battle. No hero
   section explaining the product before you can play it.
2. **No signup wall.** Voting never asks for an account.
3. **Two taps, no dead time.** Pick → feedback → next battle. Prefetch the next
   battle so there is never a wait.
4. **Mobile first.** Design the phone layout first; desktop is the adaptation.
   Two creators stack vertically on mobile, side by side on desktop.
5. **The pick is unmistakable.** Whole card is the tap target, not a small button.
6. **Feedback is immediate.** Optimistic UI on the pick; the server is the truth
   for Aura.
7. **Sponsor is labeled.** The Spotlight slot always reads as sponsored, is
   visually distinct from creators, and never appears inside a battle.
8. **Numbers are the decoration.** Aura, rank, and streaks carry the visual
   energy — not illustrations or stock imagery.
9. **Empty states have personality.** Never "No data available."

## References

Screenshots beat 1,000 words of aesthetic description. Drop them here:

```
docs/references/
    inspiration-01.png
    inspiration-02.png
    battle-layout.png
```

Agents: check `docs/references/` before designing a screen.
