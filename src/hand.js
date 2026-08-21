import { normals, toPath, pathLength, smoothstep, TAU } from "./geom.js";

// The hand pass. Feature modules produce clean geometry; everything that makes a
// face look drawn rather than plotted happens here, once, for every shape.
//
// Four effects stack up:
//   1. low-frequency wander along the path normal, so the line drifts instead of
//      buzzing
//   2. a per-pass registration offset, the pen not landing back where it started
//   3. overshoot on closed shapes, so circles are never quite closed
//   4. two passes with independent noise, which is what reads as ink

// Value noise: random control values, smoothstep-interpolated. Periodic mode
// wraps the controls so a closed shape has no seam.
function series(rng, n, ctrlCount, periodic) {
  const ctrl = new Float64Array(ctrlCount);
  for (let i = 0; i < ctrlCount; i++) ctrl[i] = rng() * 2 - 1;
  const out = new Float64Array(n);
  const span = periodic ? ctrlCount : ctrlCount - 1;
  for (let i = 0; i < n; i++) {
    const t = (n === 1 ? 0 : i / (periodic ? n : n - 1)) * span;
    const i0 = Math.floor(t);
    const f = t - i0;
    const a = ctrl[periodic ? i0 % ctrlCount : Math.min(i0, ctrlCount - 1)];
    const b = ctrl[periodic ? (i0 + 1) % ctrlCount : Math.min(i0 + 1, ctrlCount - 1)];
    out[i] = a + (b - a) * smoothstep(f);
  }
  return out;
}

// Two octaves: a slow drift plus a finer tremor.
function wander(rng, n, periodic) {
  const slow = series(rng, n, 4, periodic);
  const fine = series(rng, n, 9, periodic);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = slow[i] * 0.7 + fine[i] * 0.3;
  return out;
}

// Rebuild a closed ring as an open path that starts at an arbitrary point and
// runs slightly past it. Hand-drawn loops overlap or fall short; they never meet
// exactly.
function openRing(points, rng) {
  const n = points.length;
  const start = Math.floor(rng() * n);
  const extra = Math.round(n * (0.01 + rng() * 0.06));
  const out = [];
  for (let i = 0; i <= n + extra; i++) out.push(points[(start + i) % n]);
  return out;
}

const DEFAULTS = {
  roughness: 1,
  strokeWidth: 1.6,
  passes: 2,
  overshoot: true,
  // How far the pen wanders, in canvas units, at roughness 1.
  wander: 0.9,
  // How far a second pass sits from the first.
  offset: 0.55,
};

/**
 * Turn one shape into the strokes that draw it.
 *
 * A shape is `{ points, closed, weight, fill, passes, rough, opacity }`.
 * Returns `[{ d, width, fill, opacity, length }]`.
 */
export function handStrokes(shape, rng, style = {}) {
  const s = { ...DEFAULTS, ...style };
  const {
    points,
    closed = false,
    weight = 1,
    fill = null,
    opacity = 1,
    rough = 1,
    passes = fill ? 1 : s.passes,
    overshoot = s.overshoot,
  } = shape;

  if (!points || points.length < 2) return [];

  const width = s.strokeWidth * weight;
  const amount = s.roughness * rough * s.wander;
  const out = [];

  for (let pass = 0; pass < passes; pass++) {
    // A filled shape must stay closed or the fill leaks, so overshoot only
    // applies to outlines.
    const useRing = closed && !fill && overshoot && amount > 0;
    const src = useRing ? openRing(points, rng) : points;
    const isClosed = closed && !useRing;
    const n = src.length;

    // The second pass is a lighter retrace, not a full redraw.
    const passScale = pass === 0 ? 1 : 0.75;
    const amp = amount * passScale;
    const norm = normals(src, isClosed);
    const noise = amp > 0 ? wander(rng, n, isClosed) : null;

    // Registration error for this pass, biased so pass two visibly doubles the
    // line rather than sitting on top of it.
    const off = pass === 0 ? 0 : s.offset * s.roughness;
    const oa = rng() * TAU;
    const ox = Math.cos(oa) * off;
    const oy = Math.sin(oa) * off;

    const moved = new Array(n);
    for (let i = 0; i < n; i++) {
      let e = 1;
      if (!isClosed && n > 1) {
        // Wobble peaks mid-stroke; a floor keeps the endpoints from being pinned
        // down, since misplaced ends are half the charm.
        e = 0.4 + 0.6 * Math.sin((i / (n - 1)) * Math.PI);
      }
      const d = noise ? noise[i] * amp * e : 0;
      moved[i] = [src[i][0] + norm[i][0] * d + ox, src[i][1] + norm[i][1] * d + oy];
    }

    const d = toPath(moved, isClosed);
    if (!d) continue;
    out.push({
      d,
      width: pass === 0 ? width : width * 0.85,
      fill: pass === 0 ? fill : null,
      opacity: pass === 0 ? opacity : opacity * 0.7,
      length: pathLength(moved, isClosed),
    });
  }

  return out;
}

export { DEFAULTS as HAND_DEFAULTS };
