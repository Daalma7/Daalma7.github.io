/**
 * Geometry for the three-discipline Venn diagram.
 *
 * Three circles of radius R with centres on an equilateral triangle of side D.
 * Each circle is split by the diameter perpendicular to the direction
 * centre -> centroid: the inner half is painted solid, the outer half is a
 * collage of symbols.
 *
 * D >= 2R/sqrt(3) guarantees each overlap lens lies wholly inside the solid
 * half. D = 1.5R is chosen so a horizontal label also fits on base colour;
 * see docs/superpowers/specs/2026-08-29-discipline-venn-design.md.
 */

export const R = 200;
export const D = 300;

const SQRT3 = Math.sqrt(3);

/** Distance from the centroid to each centre. */
const CIRCUMRADIUS = D / SQRT3;

export const VIEW_W = D + 2 * R;
export const VIEW_H = CIRCUMRADIUS * 1.5 + 2 * R;

export const CENTROID = { x: VIEW_W / 2, y: R + CIRCUMRADIUS / 2 };

export type Point = { x: number; y: number };

/** Angle, in SVG degrees, from the centroid out to each centre. */
const OUTWARD = { math: 210, ai: 330, games: 90 } as const;

export type DisciplineKey = keyof typeof OUTWARD;

export const KEYS: DisciplineKey[] = ["math", "ai", "games"];

const rad = (deg: number) => (deg * Math.PI) / 180;

const polar = (origin: Point, r: number, deg: number): Point => ({
  x: origin.x + r * Math.cos(rad(deg)),
  y: origin.y + r * Math.sin(rad(deg)),
});

const n = (v: number) => Number(v.toFixed(3));
const xy = (p: Point) => `${n(p.x)} ${n(p.y)}`;

export const CENTERS: Record<DisciplineKey, Point> = {
  math: polar(CENTROID, CIRCUMRADIUS, OUTWARD.math),
  ai: polar(CENTROID, CIRCUMRADIUS, OUTWARD.ai),
  games: polar(CENTROID, CIRCUMRADIUS, OUTWARD.games),
};

/** Direction, in SVG degrees, from a centre towards the centroid. */
export const inwardAngle = (key: DisciplineKey) => OUTWARD[key] + 180;

/** Direction, in SVG degrees, from a centre away from the centroid. */
export const outwardAngle = (key: DisciplineKey) => OUTWARD[key];

/**
 * How far the solid half is carried past its chord, and over which it fades out.
 *
 * Only this edge is softened. Blurring the whole shape (a filter on the group's
 * alpha) also dissolves the arcs and the three notches where two circles meet,
 * which turns the whole diagram hazy — this gradient runs along one axis, so the
 * arcs, the notches and every internal Venn boundary stay exactly as crisp as
 * they were.
 *
 * The dissolve runs outward, never inward: fading inward would eat the ground
 * under the label, whose nearest corner sits only 6.5 from the chord, and no
 * text colour survives a background that varies that much (see the spec).
 *
 * Free to choose: the nearest overlap lens stays 59.8 inside the chord, so the
 * band never reaches a mix region, and two circles' outer halves never meet, so
 * one circle's bleed can never wash over another's.
 */
export const CHORD_BLEED = 72;

/**
 * Distance from the chord over which collage symbols fade in. Matched to
 * CHORD_BLEED so the two ramps cross at half strength: without that, symbols in
 * the band are drawn in their own colour over that same colour, and smear.
 */
export const EMERGE_SPAN = 88;

/**
 * The solid half, extended by `bleed` past its chord. Points on the circle at a
 * distance `bleed` outside the chord sit at +/- acos(-bleed/R) from the inward
 * direction, so the bounding arc is the major one whenever bleed > 0.
 */
export function solidHalfPath(key: DisciplineKey, bleed = CHORD_BLEED): string {
  const c = CENTERS[key];
  const a = inwardAngle(key);
  const half = (Math.acos(-bleed / R) * 180) / Math.PI;
  const large = half > 90 ? 1 : 0;
  return (
    `M ${xy(polar(c, R, a - half))}` +
    ` A ${R} ${R} 0 ${large} 1 ${xy(polar(c, R, a + half))} Z`
  );
}

/** Endpoints of the gradient that fades the collage in, measured from the chord. */
export function chordFadeAxis(key: DisciplineKey, span = EMERGE_SPAN) {
  const c = CENTERS[key];
  return { from: c, to: polar(c, span, outwardAngle(key)) };
}

/** The chord dividing a circle, as its two endpoints. */
export function chordEnds(key: DisciplineKey): [Point, Point] {
  const c = CENTERS[key];
  const a = inwardAngle(key);
  return [polar(c, R, a - 90), polar(c, R, a + 90)];
}

/**
 * The lens where two circles overlap. Intersections sit at +/- alpha around the
 * axis joining the centres, where cos(alpha) = (D/2)/R. Both bounding arcs run
 * in the increasing-angle direction, so both take sweep-flag 1 and the minor
 * arc (large-arc-flag 0).
 */
export function lensPath(a: DisciplineKey, b: DisciplineKey): string {
  const ca = CENTERS[a];
  const cb = CENTERS[b];
  const axis = (Math.atan2(cb.y - ca.y, cb.x - ca.x) * 180) / Math.PI;
  const alpha = (Math.acos(D / 2 / R) * 180) / Math.PI;
  const p = polar(ca, R, axis - alpha);
  const q = polar(ca, R, axis + alpha);
  return (
    `M ${xy(p)} A ${R} ${R} 0 0 1 ${xy(q)}` +
    ` A ${R} ${R} 0 0 1 ${xy(p)} Z`
  );
}

/** Of two circle intersections, the one nearer the centroid. */
function innerIntersection(a: DisciplineKey, b: DisciplineKey): Point {
  const ca = CENTERS[a];
  const cb = CENTERS[b];
  const axis = (Math.atan2(cb.y - ca.y, cb.x - ca.x) * 180) / Math.PI;
  const alpha = (Math.acos(D / 2 / R) * 180) / Math.PI;
  const candidates = [polar(ca, R, axis - alpha), polar(ca, R, axis + alpha)];
  return candidates.sort(
    (p, q) => Math.hypot(p.x - CENTROID.x, p.y - CENTROID.y) - Math.hypot(q.x - CENTROID.x, q.y - CENTROID.y),
  )[0];
}

/**
 * Where all three circles meet: a curved triangle whose vertices are the three
 * inner pairwise intersections. Between two vertices the boundary is an arc of
 * the circle both vertices have in common.
 */
export function triplePath(): string {
  const steps: Array<[DisciplineKey, DisciplineKey, DisciplineKey]> = [
    // [vertex pair, arc circle] walked in increasing angle around the centroid
    ["math", "ai", "ai"],
    ["ai", "games", "games"],
    ["games", "math", "math"],
  ];
  const verts = steps.map(([a, b]) => innerIntersection(a, b));
  return (
    `M ${xy(verts[0])}` +
    verts
      .slice(1)
      .concat([verts[0]])
      .map((v) => ` A ${R} ${R} 0 0 1 ${xy(v)}`)
      .join("") +
    " Z"
  );
}

/* ---------------------------------------------------------------- collage */

/** Deterministic PRNG so every build emits the same collage. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/**
 * Rings are near-uniform in opacity on purpose. Fading ring by ring made the
 * collage dissolve into a shapeless haze, because each ring positions symbol
 * *centres* while their actual extents differ. The dissolve is done instead by
 * COLLAGE_FADE below, which is radial, so the boundary it produces is a circle.
 */
const RINGS = [
  { r: 50, size: 34, count: 3, opacity: 0.95 },
  { r: 72, size: 42, count: 5, opacity: 0.95 },
  { r: 114, size: 46, count: 8, opacity: 0.95 },
  { r: 152, size: 44, count: 11, opacity: 0.95 },
  { r: 186, size: 38, count: 16, opacity: 0.95 },
  // deliberately outside R: only the inner sliver of these survives the fade,
  // which is what gives the rim a continuous edge instead of a ring of symbols
  { r: 208, size: 30, count: 20, opacity: 0.95 },
];

/**
 * Where the collage starts and finishes dissolving, as a fraction of R. Symbols
 * are allowed to overshoot R; the fade — not their own ragged extents — is what
 * draws the circle's edge.
 */
export const COLLAGE_FADE = { start: 0.93, end: 1 };

/**
 * Rings sample the half-disc in polar coordinates, so between one ring's end
 * symbol and the next the collage pulls away from the chord. These sit at fixed
 * distances along the chord, in the gaps the rings leave. They sit inside the
 * bleed band on purpose: the emerge mask fades them in there, so they carry the
 * second half of the cross-dissolve rather than being smeared over their own
 * colour.
 */
const SPINE = { along: [46, 89, 131, 169], size: 36, opacity: 0.95, lift: 4 };

/** radial jitter, in user units; the angular clamp assumes the worst case */
const RADIUS_JITTER = 4;

export type Placement = {
  href: string;
  /** transform mapping the symbol's 0-100 box onto the diagram */
  transform: string;
  opacity: number;
};

/**
 * Lay symbols out over the outer half. Each ring's angular half-span is derived
 * from the symbol size so nothing crosses the chord, and the outermost ring
 * stops just short of R so the circle's edge stays implicit.
 */
export function placeSymbols(key: DisciplineKey, ids: string[], seed: number): Placement[] {
  const rng = mulberry32(seed);
  const c = CENTERS[key];
  const out = outwardAngle(key);
  const placements: Placement[] = [];

  // reshuffled every time it is exhausted, so repeats never fall into a pattern
  const pool = ids.slice();
  shuffle(pool, rng);

  let picked = 0;
  const next = () => {
    if (picked > 0 && picked % pool.length === 0) shuffle(pool, rng);
    return pool[picked % pool.length];
  };

  for (const ring of RINGS) {
    const clearance = ring.size * 0.46 + 4;
    const halfSpan =
      (Math.acos(Math.min(0.98, clearance / (ring.r - RADIUS_JITTER))) * 180) / Math.PI;

    for (let i = 0; i < ring.count; i += 1) {
      // endpoints included, so every ring reaches the chord on both sides
      const t = ring.count === 1 ? 0.5 : i / (ring.count - 1);
      const offset = (2 * t - 1) * halfSpan + (rng() - 0.5) * 9;
      const angle = out + Math.max(-halfSpan, Math.min(halfSpan, offset));
      const radius = ring.r + (rng() - 0.5) * 2 * RADIUS_JITTER;
      const scale = (ring.size / 100) * (1 + (rng() - 0.5) * 0.18);
      const rotate = (rng() - 0.5) * 28;
      const p = polar(c, radius, angle);

      placements.push({
        href: next(),
        transform:
          `translate(${n(p.x)} ${n(p.y)}) rotate(${n(rotate)})` +
          ` scale(${n(scale)}) translate(-50 -50)`,
        opacity: ring.opacity,
      });
      picked += 1;
    }
  }

  const spineClearance = SPINE.size * 0.46 + 4;
  const ux = Math.cos(rad(out));
  const uy = Math.sin(rad(out));

  for (const along of SPINE.along) {
    for (const side of [-1, 1]) {
      const t = side * (along + (rng() - 0.5) * 16);
      // jitter is one-sided so no symbol ever drifts across the chord
      const off = spineClearance + SPINE.lift + rng() * 22;
      // -uy, ux is the chord direction; ux, uy points away from the centroid
      const x = c.x - t * uy + off * ux;
      const y = c.y + t * ux + off * uy;
      const scale = (SPINE.size / 100) * (1 + (rng() - 0.5) * 0.24);

      placements.push({
        href: next(),
        transform:
          `translate(${n(x)} ${n(y)}) rotate(${n((rng() - 0.5) * 28)})` +
          ` scale(${n(scale)}) translate(-50 -50)`,
        opacity: SPINE.opacity,
      });
      picked += 1;
    }
  }

  return placements;
}

/* ----------------------------------------------------------------- labels */

/**
 * Inward offset of the label box from the circle centre. Derived from the
 * widest label so the three sit at a common radius from the centroid; must
 * satisfy delta >= (sqrt(3)/2)*halfWidth + 0.5*halfHeight and keep all four
 * corners outside both neighbouring circles.
 */
export const LABEL_OFFSET = 54;

export function labelAnchor(key: DisciplineKey): Point {
  return polar(CENTERS[key], LABEL_OFFSET, inwardAngle(key));
}
