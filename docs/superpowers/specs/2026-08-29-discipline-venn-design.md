# Discipline Venn — design

**Date:** 2026-08-29
**Scope:** Replace the three overlapping discipline circles in the Projects section
(`#work`) with a geometrically exact, additively-lit Venn diagram whose outer halves
are symbol collages.

## Problem

The current circles are positioned with hardcoded `left`/`top`/`bottom` values. At
desktop width their centres sit 270px apart with a 125px radius, so the maths and AI
circles do not overlap at all, while maths/games overlap heavily. The triad is not
equilateral and the overlaps are meaningless.

The visual style (flat 75%-alpha fills, centred label) is also unrelated to the rest
of the page.

## Geometry

Let `R` be the circle radius and `d` the side of the equilateral triangle on which the
three centres sit.

**Constraint 1 — the overlap must lie entirely in the inner half.**
Each circle is split by the diameter perpendicular to the direction centre→centroid.
In the frame of that chord (x' along the chord, y' along the inward normal), a
neighbouring centre sits at `(d/2, d·√3/2)`. The neighbouring circle's nearest
approach to the chord is therefore `d·√3/2 − R`, so the lens is fully inside the solid
half iff

    d ≥ 2R/√3 ≈ 1.1547·R

**Constraint 2 — a horizontal label must clear both lenses.**
A horizontal label next to a chord inclined 60° is, in the chord frame, a box inclined
60°: its far corner reaches much deeper than the label's own height. For a label of
half-width `w` and half-height `h`, offset inward by `δ`, the two binding corners are

    A = (0.5w − (√3/2)h,  δ + (√3/2)w + 0.5h)
    B = (0.5w + (√3/2)h,  δ + (√3/2)w − 0.5h)

with `δ ≥ (√3/2)w + 0.5h` (so the whole box clears the chord). Both must satisfy
`|corner − neighbourCentre| ≥ R`.

**Constraint 3 — the labels must not sit on the triple core.**
Core circumradius is `√(R² − d²/4) − d/(2√3)`. Label centres sit at `d/√3 − δ` from
the centroid; their half-diagonal must not reach the core.

**Chosen values:** `R = 200`, `d = 300` (= 1.5·R). viewBox `0 0 700 659.81`, rendered
at `min(700px, 100%)`, so at full size 1 user unit = 1 px.

    centroid  (350, 286.60)
    maths     (200, 200)
    ai        (500, 200)
    games     (350, 459.81)

Derived: pairwise overlap depth `2R − d = 100` (0.5R); lens height `2√(R²−d²/4) =
264.6` (1.32R); triple core inradius 26.8, circumradius 45.7; lens clearance from each
chord 59.8.

**Consequence of horizontal labels.** The earlier 1.35·R proposal (approved) had to
open to 1.5·R and the diagram had to grow from 620px to 700px, because at 1.35·R a
horizontal label either crosses a lens or, pushed far enough inward to clear the
chord, lands on the triple core. Both are fatal: see "Colour" below.

**Structural note.** The three dividing chords form a second equilateral triangle
whose vertices are the outer pairwise intersection points. Each chord's midpoint is
its circle's centre.

## Colour — additive mixing on a light ground

Overlaps get *brighter*, like light, not darker like pigment. `mix-blend-mode: screen`
cannot be used: against the `#f4f2ed` page the circles would wash out to nothing. So
the mix regions are painted as explicit paths in colours that are exactly
`screen(a, b)` of the bases. Same result, no blend-mode dependency, exact control.

Bases are the existing hues taken one step deeper, so the mixes land clearly between
the bases and the paper:

| region | colour |
|---|---|
| maths | `#B04E33` |
| ai | `#35578C` |
| games | `#3C6446` |
| maths ⊕ ai | `#C08AA3` |
| maths ⊕ games | `#C39369` |
| ai ⊕ games | `#6599AC` |
| triple | `#CFB8BC` |

Paint order: three half-discs → three lenses → triple region.

## Dissolving the dividing edge

The chord — the join between a circle's two halves — is a gradient rather than a cut.
**Only that edge.** The arcs, the three notches where two circles meet, and every
internal Venn boundary stay exactly as crisp as before.

That rules out feathering the shape as a whole (blurring the fills group's
`SourceAlpha` and compositing it back). It produces a continuous edge everywhere and
is tempting because it handles the notches too, but it softens the entire diagram
into haze, and the amount is one number with no way to soften one edge and not
another. The dissolve is a single-axis linear gradient instead.

Two things constrain it:

1. **It has to run outward.** The label's nearest corner sits 6.5 from the chord, so
   fading inward destroys the ground under the label — and by the argument above, no
   text colour survives a background that varies that much. So each solid half is
   carried `CHORD_BLEED = 72` *past* its chord (still a circular segment, just a
   major arc now: `half = acos(−bleed/R) > 90°`) and dissolved out there, over the
   collage half. The gradient pads opaque everywhere inward of the chord.

   Nothing else limits the distance: the nearest lens stays 59.8 inside the chord, so
   the band never reaches a mix region, and two circles' outer halves never intersect,
   so one circle's bleed can never wash over another's.

2. **The symbols cross-dissolve with it.** Left alone, symbols inside the band are
   drawn in their own colour over that same colour and smear. A second mask per
   circle (`venn-emerge-*`, a ramp over `EMERGE_SPAN = 88` from the chord) fades them
   in as the fill fades out, the two crossing at half strength. It doubles as a
   guarantee that no symbol can cross the chord.

Verified by rasterising the SVG to a canvas and sampling it: the centre and all four
corners of each of the three label boxes land on one colour — the exact base colour —
so the contrast figures above hold as stated.

**Why the label must stay on base colour.** Under full additive mixing the luminance
range across base and pair regions is 0.094–0.335. Neither white (2.7:1) nor black
(2.88:1) reaches 4.5:1 across that range, so no single text colour survives a label
that crosses regions. Constraint 2 exists to keep the label wholly on base colour,
where paper-coloured text gets 4.7:1 (maths), 6.5:1 (ai), 6.0:1 (games).

## Collage

Outer half of each circle: 70 stroked symbols — 62 on six rings, plus an 8-symbol
spine along the chord.

    ring   r     size   count   angular half-span
    1      50    34     3       60.7°
    2      72    42     5       67.4°
    3      114   46     8       75.4°
    4      152   44     11      79.8°
    5      186   38     16      83.2°
    6      208   30     20      85.0°

Half-span is `acos(clearance / (r − jitter))` with `clearance = 0.46·size + 4`, so no
symbol crosses the chord whatever the jitter. Ring angles include both endpoints
(`t = i/(n−1)`, jitter clamped to the span), so every ring lands a symbol hard against
the chord on both sides.

**How the outer edge is drawn.** Not by the symbols' own extents — those differ
per symbol (a star and a sword fill their 0–100 box very differently), so anchoring
the outer boundary to them gives a ragged, shapeless rim. Instead:

- symbols are allowed to overshoot `R` freely (ring 6 sits entirely outside it, and
  the furthest material reaches ~225 of `R = 200`), and
- a per-circle radial mask (`COLLAGE_FADE`, opaque to 0.93·R, transparent at R)
  dissolves them.

The boundary is therefore *geometric* and exactly circular, while still being made
only of symbols — implied, never drawn as a line. Ring opacity is near-uniform
(0.95) for the same reason: fading ring by ring produced a haze with no shape, since
the fade must be radial to produce a circle.

**The spine.** Rings sample the half-disc in polar coordinates, so between one ring's
end symbol and the next the collage pulls away from the chord — the rings reach it
only at roughly 24, 66, 110, 150 and 185 along its length, leaving a scalloped gutter
of paper down the dividing line that reads as two loose pieces rather than one divided
circle. Eight symbols placed directly along the chord (at 46, 89, 131, 169 either
side, size 36, offset by `clearance` plus a one-sided jitter so none can drift across)
fill those gaps. They sit inside the bleed band deliberately, and carry the second
half of the cross-dissolve.

Verified numerically over all three circles with a generous 85%-of-box extent
estimate: minimum clearance from the chord is 4.6 units, and nothing reads as a
regular row.

Placement uses a mulberry32 PRNG with a fixed seed per circle — deterministic across
builds, no client JS. Jitter: ±4.5° angle (clamped to the span), ±4 radius, ±9%
scale, ±14° rotation; the spine additionally jitters ±8 along the chord and 0..+12
outward. The symbol pool is reshuffled every time it is exhausted, so
the repeats needed to fill 70 slots from a 15-18 symbol set never fall into a visible
periodic pattern.

All symbols carry `vector-effect: non-scaling-stroke` with a single `stroke-width`
(1.35px, 1px below 700px), so line weight is identical across every symbol and every
viewport — the engraving look.

Vocabulary (15 maths, 18 ai, 15 games — hand-drawn paths, each in a 0–100 box):
- **maths** — π ∑ ∫ √ ∞ ∂ θ ± ∅ ≈, axes with parabola, sine wave, matrix brackets,
  circle with inscribed triangle, right triangle with square mark
- **ai** — neural graph, neuron with dendrites, sigmoid on axes, decision tree, tensor
  grid, convolution kernel, scatter with hyperplane, chip, loss curve, stacked layers,
  detection box, binary digits, gradient descent, clusters, attention, recurrent loop,
  confusion matrix, embedding vectors
- **games** — gamepad, d20, pixel heart, invader, isometric cube, coin with star,
  joystick, sword, health bar, key, cursor, tilemap, star, dialogue bubble, potion

## Labels

Horizontal, paper-coloured, at each circle's centre pushed inward by `δ = 54` so the
box rests on the dividing line from the solid side. All three sit at 119.2 from the
centroid and 206 apart.

`δ` is shared by all three labels (derived from the widest) so the triad reads as
radially symmetric even though "MATEMÁTICAS" is one line and the others are two.

Text comes from the existing i18n `projects.disciplines` values, split on `<br />` in
the frontmatter — no i18n changes.

**Measured, not estimated.** `getBBox()` in the browser gives 90.6 x 14 (ES,
"MATEMÁTICAS") and 92.9 x 29 (EN, "GAME DEVELOPMENT") user units. Against those,
`δ = 54` leaves 7.1 of lens clearance, 6.5 of chord clearance and 26.8 of core
clearance in the worse of the two languages; all three stay positive even if a font
fallback widens the label by 10%.

## Responsive

Below 700px the in-diagram labels would render under 6px. There, the labels are
dropped from the SVG and the three names become a legend beneath the diagram — each a
link with a disc in its circle's base colour. The diagram stays purely graphic.

## Interaction

Links are preserved (`#mathematics-projects`, `#ai-projects`, `#game-projects`) as SVG
`<a>` elements wrapping a transparent hit circle plus the label.

Hover drops the current `translateY + scale`: moving a circle destroys the equilateral
relation the whole piece is built on. Instead the active circle gains brightness and
saturation and its collage strokes thicken (1.35px → 1.7px); everything else drops to
0.32 opacity. Consistent with the light metaphor.

Labels dim with their own fill, not independently: paper-coloured text left at full
opacity over a dimmed fill has almost no contrast.

## Files

| file | role |
|---|---|
| `src/lib/venn.ts` | geometry + deterministic symbol placement |
| `src/lib/venn-symbols.ts` | symbol path library |
| `src/components/DisciplineVenn.astro` | markup + styles |
| `src/components/Projects.astro` | swap markup, delete old discipline CSS |

`Projects.astro` is already 1056 lines; the diagram does not belong inside it.
