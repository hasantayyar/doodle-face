import { gene } from "../genome.js";
import { range, bias, clamp, lerp } from "../geom.js";

// Everything is drawn in a 100x100 box. The head occupies roughly y 22..82,
// which leaves the top for hair and the sides for ears.
export const CANVAS = 100;

// Expression inputs, and what a missing one falls back to. Anything left
// undefined resolves from the genome, so a face has a resting mood of its own and
// the caller only overrides what they care about.
const EXPRESSION_KEYS = ["joy", "surprise", "anger", "blink", "gazeX", "gazeY"];

function normaliseExpression(input = {}) {
  const e = {};
  for (const k of EXPRESSION_KEYS) e[k] = input[k];
  // `gaze: {x, y}` and `gaze: [x, y]` are friendlier to type than gazeX/gazeY.
  if (input.gaze) {
    const g = input.gaze;
    e.gazeX ??= Array.isArray(g) ? g[0] : g.x;
    e.gazeY ??= Array.isArray(g) ? g[1] : g.y;
  }
  return e;
}

/**
 * Resolve a genome plus optional expression into the concrete measurements every
 * feature module reads. Doing it once here is what keeps the eyes, brows and
 * glasses agreeing about where the eyes are.
 */
export function layout(genome, expressionInput) {
  const g = (name) => gene(genome, name);
  const e = normaliseExpression(expressionInput);

  const surprise = clamp(e.surprise ?? 0, 0, 1);
  const anger = clamp(e.anger ?? 0, 0, 1);
  const blink = clamp(e.blink ?? 0, 0, 1);

  // Resting mood. Doodles read better cheerful, so the genome leans positive.
  const restingJoy = range(g("mood"), -0.45, 0.95);
  const joy = clamp(e.joy ?? restingJoy, -1, 1);

  const asym = range(g("asymmetry"), 0, 1);
  const roughness = range(g("roughness"), 0.55, 1.5);

  const cx = CANVAS / 2;
  const cy = 50.5;
  // Biased inward on purpose. Unbiased head genes produce narrow eggs and squat
  // pancakes, which are the two silhouettes that stop reading as a face.
  const rx = range(bias(g("headWidth"), 0.25), 24, 30);
  const ry = range(bias(g("headHeight"), 0.25), 26.5, 32.5);

  // Eyes ride a little above the middle of the head.
  const eyeY = cy - ry * range(g("eyeLevel"), 0.04, 0.24);
  const eyeGap = rx * range(bias(g("eyeSpacing"), 0.25), 0.37, 0.54);
  const eyeR = rx * range(bias(g("eyeSize"), 0.2), 0.1, 0.21) * (1 + surprise * 0.35);

  const noseY = lerp(eyeY, cy + ry * 0.38, range(g("noseLength"), 0.35, 0.75));
  const mouthY = cy + ry * range(bias(g("mouthLevel"), 0.3), 0.36, 0.6);

  return {
    genome,
    gene: g,
    cx,
    cy,
    rx,
    ry,

    // Head silhouette.
    headSquare: range(bias(g("headSquare"), 0.25), 1.7, 3.6),
    jawTaper: range(g("jawWidth"), 0.02, 0.26),
    chinLength: range(g("chinLength"), 0, 0.13),
    cheekFullness: range(g("cheekFullness"), -0.04, 0.12),
    tilt: range(g("headTilt"), -5, 5) * (0.4 + asym * 0.6),

    // Eyes.
    eyeY,
    eyeGap,
    eyeR,
    eyeAspect: range(g("eyeAspect"), 0.62, 1.35),
    eyeSlant: range(g("eyeSlant"), -14, 16),
    eyeShape: g("eyeShape"),
    pupilSize: range(g("pupilSize"), 0.3, 0.62),
    pupilDrift: range(g("pupilDrift"), -1, 1),

    // Brows.
    browGap: range(g("browHeight"), 1.6, 5.2),
    browAngle: range(g("browAngle"), -12, 14),
    browLength: range(g("browLength"), 0.85, 1.5),
    browArch: range(g("browArch"), -0.2, 1),
    browWeight: range(g("browWeight"), 0.75, 1.7),

    // Nose.
    noseY,
    noseWidth: range(g("noseWidth"), 2.3, 4.8),
    noseStyle: g("noseStyle"),

    // Mouth.
    mouthY,
    mouthWidth: rx * range(bias(g("mouthWidth"), 0.25), 0.3, 0.62),
    mouthStyle: g("mouthStyle"),
    lipFullness: g("lipFullness"),

    // Ears.
    earSize: g("earSize"),
    earFlare: range(g("earFlare"), 0.55, 1.25),

    // Hair.
    hairStyle: g("hairStyle"),
    hairAmount: g("hairAmount"),
    hairLength: g("hairLength"),
    hairMess: range(g("hairMess"), 0.2, 1),

    // Extras are gated: most faces should have none, a few should have one.
    glasses: g("glasses"),
    freckles: g("freckles"),
    beard: g("beard"),
    blush: g("blush"),

    // Shared modifiers.
    roughness,
    strokeWeight: range(g("strokeWeight"), 0.8, 1.35),
    asym,
    joy,
    surprise,
    anger,
    blink,
    gazeX: clamp(e.gazeX ?? 0, -1, 1),
    gazeY: clamp(e.gazeY ?? 0, -1, 1),
  };
}

// The head is a superellipse pushed around by three genes. These two warps are
// shared with headHalfWidth so anything placed on the silhouette (ears, hair,
// beard) lands on the outline instead of near it.

// v is the vertical position on the head, -1 at the crown, +1 at the chin.
export function headScaleX(L, v) {
  const jaw = v > 0 ? 1 - L.jawTaper * v * v : 1;
  const cheek = 1 + L.cheekFullness * Math.exp(-(((v - 0.05) / 0.5) ** 2));
  return jaw * cheek;
}

export function headScaleY(L, v) {
  return v > 0 ? 1 + L.chinLength * v * v : 1;
}

// Half-width of the head at a given y.
export function headHalfWidth(L, y) {
  const v = clamp((y - L.cy) / L.ry, -1, 1);
  const base = L.rx * (1 - Math.abs(v) ** L.headSquare) ** (1 / L.headSquare);
  return base * headScaleX(L, v);
}
