// Pure geometry. Features build point arrays with these; nothing here knows about
// SVG except num() and the path builders at the bottom.

export const TAU = Math.PI * 2;

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Map a gene in [0,1] onto a useful range.
export const range = (v, lo, hi) => lo + (hi - lo) * clamp(v, 0, 1);

// Push a gene towards the middle of its range. Extremes are interesting once but
// tiring across a whole population, so most proportions use this.
export const bias = (v, strength = 0.5) => lerp(v, 0.5, strength);

export const smoothstep = (t) => t * t * (3 - 2 * t);

// Two decimals is under a tenth of a percent of the 100-unit canvas and roughly
// halves the size of the emitted path data.
export function num(v) {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? "0" : String(r);
}

// Superellipse: exponent 2 is an ellipse, higher squares off the corners, lower
// pinches them into a diamond. One parameter takes the head from round to blocky.
export function superellipse(cx, cy, rx, ry, exponent = 2, steps = 48) {
  const points = [];
  const p = 2 / exponent;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    const c = Math.cos(a);
    const s = Math.sin(a);
    points.push([
      cx + rx * Math.sign(c) * Math.abs(c) ** p,
      cy + ry * Math.sign(s) * Math.abs(s) ** p,
    ]);
  }
  return points;
}

export function arc(cx, cy, rx, ry, from, to, steps = 16) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const a = lerp(from, to, i / steps);
    points.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return points;
}

export function circle(cx, cy, r, steps = 20) {
  return superellipse(cx, cy, r, r, 2, steps);
}

// Quadratic bezier sampled to points, the workhorse for mouths and brows.
export function quad(p0, c, p1, steps = 14) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    points.push([
      u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
      u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
    ]);
  }
  return points;
}

// An arc between two endpoints, bulging by `bulge` units perpendicular to the
// chord. Positive bulges downward-right of the direction of travel.
export function bow(p0, p1, bulge, steps = 14) {
  const mx = (p0[0] + p1[0]) / 2;
  const my = (p0[1] + p1[1]) / 2;
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const len = Math.hypot(dx, dy) || 1;
  // Control point sits at twice the bulge because a quadratic only reaches half
  // way to its control point at t=0.5.
  return quad(p0, [mx - (dy / len) * bulge * 2, my + (dx / len) * bulge * 2], p1, steps);
}

export function line(p0, p1, steps = 6) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    points.push([lerp(p0[0], p1[0], i / steps), lerp(p0[1], p1[1], i / steps)]);
  }
  return points;
}

export function translate(points, dx, dy) {
  return points.map(([x, y]) => [x + dx, y + dy]);
}

export function rotate(points, angle, ox = 0, oy = 0) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return points.map(([x, y]) => {
    const dx = x - ox;
    const dy = y - oy;
    return [ox + dx * c - dy * s, oy + dx * s + dy * c];
  });
}

// Unit normals per point, from the tangent between neighbours. Jitter is applied
// along these so a wobble reads as the pen wandering off the line rather than as
// random noise in x and y.
export function normals(points, closed) {
  const n = points.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const prev = points[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const next = points[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    out[i] = [-dy / len, dx / len];
  }
  return out;
}

export function pathLength(points, closed) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  if (closed && points.length > 1) {
    const a = points[points.length - 1];
    const b = points[0];
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return total;
}

// Catmull-Rom through every point, emitted as cubic beziers. The points are
// interpolated rather than approximated, so a feature lands exactly where the
// feature module put it.
export function toPath(points, closed = false) {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${num(points[0][0])} ${num(points[0][1])}`;
  if (n === 2) {
    return `M${num(points[0][0])} ${num(points[0][1])}L${num(points[1][0])} ${num(points[1][1])}`;
  }

  const at = (i) => {
    if (closed) return points[((i % n) + n) % n];
    return points[clamp(i, 0, n - 1)];
  };

  let d = `M${num(points[0][0])} ${num(points[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${num(c1x)} ${num(c1y)} ${num(c2x)} ${num(c2y)} ${num(p2[0])} ${num(p2[1])}`;
  }
  if (closed) d += "Z";
  return d;
}
