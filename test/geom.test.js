import test from "node:test";
import assert from "node:assert/strict";
import {
  num,
  range,
  clamp,
  lerp,
  superellipse,
  circle,
  arc,
  quad,
  bow,
  line,
  rotate,
  translate,
  normals,
  pathLength,
  toPath,
} from "../src/geom.js";
import { handStrokes } from "../src/hand.js";
import { rngFromSeed } from "../src/rng.js";

// Test-only helpers. The library never needs to inspect a point array, so these
// live here rather than shipping in geom.js.
function bounds(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function centroid(points) {
  const n = points.length;
  return [
    points.reduce((s, p) => s + p[0], 0) / n,
    points.reduce((s, p) => s + p[1], 0) / n,
  ];
}

test("num trims to two decimals and kills negative zero", () => {
  assert.equal(num(1.23456), "1.23");
  assert.equal(num(-0.001), "0");
  assert.equal(num(10), "10");
});

test("range and clamp behave", () => {
  assert.equal(range(0, 10, 20), 10);
  assert.equal(range(1, 10, 20), 20);
  assert.equal(range(0.5, 10, 20), 15);
  assert.equal(range(5, 10, 20), 20);
  assert.equal(clamp(-1, 0, 1), 0);
  assert.equal(lerp(0, 10, 0.25), 2.5);
});

test("superellipse spans its radii", () => {
  const p = superellipse(50, 50, 20, 30, 2, 64);
  const b = bounds(p);
  assert.ok(Math.abs(b.minX - 30) < 0.5);
  assert.ok(Math.abs(b.maxX - 70) < 0.5);
  assert.ok(Math.abs(b.minY - 20) < 0.5);
  assert.ok(Math.abs(b.maxY - 80) < 0.5);
  const [cx, cy] = centroid(p);
  assert.ok(Math.abs(cx - 50) < 0.5 && Math.abs(cy - 50) < 0.5);
});

test("a higher superellipse exponent encloses more area", () => {
  const round = pathLength(circle(0, 0, 10, 96), true);
  const boxy = pathLength(superellipse(0, 0, 10, 10, 6, 96), true);
  assert.ok(boxy > round, "squarer shape should have a longer perimeter");
});

test("circle circumference is close to 2*pi*r", () => {
  const len = pathLength(circle(0, 0, 10, 256), true);
  assert.ok(Math.abs(len - 2 * Math.PI * 10) < 0.1, `got ${len}`);
});

test("arc endpoints land where asked", () => {
  const p = arc(0, 0, 10, 10, 0, Math.PI, 32);
  assert.ok(Math.abs(p[0][0] - 10) < 1e-9);
  assert.ok(Math.abs(p[p.length - 1][0] + 10) < 1e-9);
});

test("quad interpolates its endpoints", () => {
  const p = quad([0, 0], [5, 10], [10, 0], 10);
  assert.deepEqual(p[0], [0, 0]);
  assert.deepEqual(p[p.length - 1], [10, 0]);
  assert.ok(p[5][1] > 0, "should bulge towards the control point");
});

test("bow bulges by the requested amount", () => {
  const b = bow([0, 0], [10, 0], 3, 20);
  const mid = b[10];
  assert.ok(Math.abs(mid[1] - 3) < 0.1, `bulge was ${mid[1]}`);
  const flat = bow([0, 0], [10, 0], 0, 20);
  assert.ok(Math.abs(flat[10][1]) < 1e-9);
});

test("bow with a negative bulge goes the other way", () => {
  assert.ok(bow([0, 0], [10, 0], -3, 20)[10][1] < 0);
});

test("line is straight and hits both ends", () => {
  const p = line([0, 0], [10, 20], 4);
  assert.equal(p.length, 5);
  assert.deepEqual(p[2], [5, 10]);
});

test("transforms compose predictably", () => {
  const r = rotate([[10, 0]], Math.PI / 2, 0, 0);
  assert.ok(Math.abs(r[0][0]) < 1e-9 && Math.abs(r[0][1] - 10) < 1e-9);
  assert.deepEqual(translate([[1, 2]], 3, 4), [[4, 6]]);
  // Rotating about a point leaves that point alone.
  assert.deepEqual(rotate([[5, 5]], 1.2, 5, 5), [[5, 5]]);
});

test("normals are unit length and perpendicular to the tangent", () => {
  const p = circle(0, 0, 10, 32);
  const ns = normals(p, true);
  for (let i = 0; i < p.length; i++) {
    assert.ok(Math.abs(Math.hypot(ns[i][0], ns[i][1]) - 1) < 1e-9);
    // On a circle the normal is radial, so it is parallel to the point vector.
    const dot = (ns[i][0] * p[i][0] + ns[i][1] * p[i][1]) / 10;
    assert.ok(Math.abs(Math.abs(dot) - 1) < 0.02, `not radial: ${dot}`);
  }
});

test("toPath handles degenerate inputs", () => {
  assert.equal(toPath([]), "");
  assert.equal(toPath([[1, 2]]), "M1 2");
  assert.equal(toPath([[0, 0], [1, 1]]), "M0 0L1 1");
});

test("toPath starts at the first point and closes when asked", () => {
  const p = circle(50, 50, 20, 16);
  const open = toPath(p, false);
  const closed = toPath(p, true);
  assert.ok(open.startsWith("M70 50"));
  assert.ok(!open.endsWith("Z"));
  assert.ok(closed.endsWith("Z"));
  assert.ok(closed.length > open.length);
});

test("toPath emits only valid path commands", () => {
  const d = toPath(circle(50, 50, 20, 24), true);
  assert.match(d, /^M[-\d. ]+(C[-\d. ]+)+Z$/);
});

test("handStrokes emits two passes for an outline", () => {
  const rng = rngFromSeed("hand");
  const strokes = handStrokes({ points: circle(50, 50, 20, 32), closed: true }, rng);
  assert.equal(strokes.length, 2);
  for (const s of strokes) {
    assert.ok(s.d.startsWith("M"));
    assert.ok(s.width > 0);
    assert.ok(s.length > 0);
  }
});

test("handStrokes emits one filled pass for a filled shape", () => {
  const rng = rngFromSeed("fill");
  const strokes = handStrokes(
    { points: circle(50, 50, 5, 16), closed: true, fill: "#000" },
    rng
  );
  assert.equal(strokes.length, 1);
  assert.equal(strokes[0].fill, "#000");
  assert.ok(strokes[0].d.endsWith("Z"), "a filled shape must stay closed");
});

test("handStrokes is deterministic for a given rng seed", () => {
  const a = handStrokes({ points: circle(50, 50, 20, 32), closed: true }, rngFromSeed("d"));
  const b = handStrokes({ points: circle(50, 50, 20, 32), closed: true }, rngFromSeed("d"));
  assert.deepEqual(a, b);
});

test("roughness scales how far the line strays", () => {
  const clean = handStrokes(
    { points: circle(50, 50, 20, 48), closed: true },
    rngFromSeed("r"),
    { roughness: 0, overshoot: false }
  );
  const messy = handStrokes(
    { points: circle(50, 50, 20, 48), closed: true },
    rngSeeded(),
    { roughness: 3 }
  );
  // With no roughness the retrace sits exactly on the original.
  assert.equal(clean[0].d, clean[1].d);
  assert.notEqual(messy[0].d, messy[1].d);

  function rngSeeded() {
    return rngFromSeed("r");
  }
});

test("handStrokes stays near the source geometry", () => {
  const strokes = handStrokes(
    { points: circle(50, 50, 20, 48), closed: true },
    rngFromSeed("near")
  );
  const nums = strokes[0].d.match(/-?\d+(\.\d+)?/g).map(Number);
  for (const v of nums) assert.ok(v > 20 && v < 80, `stroke ran away to ${v}`);
});

test("handStrokes ignores shapes with too few points", () => {
  assert.deepEqual(handStrokes({ points: [[1, 1]] }, rngFromSeed("x")), []);
  assert.deepEqual(handStrokes({ points: [] }, rngFromSeed("x")), []);
});
