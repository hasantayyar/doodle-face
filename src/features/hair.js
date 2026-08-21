import { line, arc, clamp, TAU } from "../geom.js";
import { headScaleX } from "./layout.js";

// A point on the crown. t runs 0 at the left temple, over the top, to 1 at the
// right. `outset` pushes it away from the skull, which is all hair really is.
function crown(L, t, outset = 0) {
  const a = Math.PI + clamp(t, 0, 1) * Math.PI;
  const p = 2 / L.headSquare;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const ux = Math.sign(c) * Math.abs(c) ** p;
  const uy = Math.sign(s) * Math.abs(s) ** p;
  return [
    L.cx + (L.rx + outset) * ux * headScaleX(L, uy),
    L.cy + (L.ry + outset) * uy,
  ];
}

// Straight runs between anchors, resampled. Catmull-Rom would round a zigzag into
// waves; extra points either side of each corner keep the corners sharp.
function densify(anchors, per = 3) {
  const out = [anchors[0]];
  for (let i = 1; i < anchors.length; i++) {
    out.push(...line(anchors[i - 1], anchors[i], per).slice(1));
  }
  return out;
}

function spikes(L, rng) {
  // Few long spikes read as a crown, so keep them numerous, short and uneven.
  const n = 7 + Math.round(L.hairAmount * 10);
  const len = 2.2 + L.hairLength * 5.5;
  const anchors = [];
  for (let i = 0; i < n; i++) {
    anchors.push(crown(L, i / n, -0.4));
    const wobble = 0.55 + rng() * (0.6 + L.hairMess * 0.9);
    anchors.push(crown(L, (i + 0.4 + rng() * 0.2) / n, len * wobble));
  }
  anchors.push(crown(L, 1, -0.4));
  return [{ points: densify(anchors), weight: 0.95, rough: 1.1, layer: 70 }];
}

function scribble(L, rng) {
  const n = 9 + Math.round(L.hairAmount * 16);
  const len = 2.5 + L.hairLength * 7;
  const shapes = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const drift = (rng() * 2 - 1) * L.hairMess * 0.09;
    const reach = len * (0.55 + rng() * 0.8);
    shapes.push({
      points: line(crown(L, t, -1), crown(L, t + drift, reach), 4),
      weight: 0.7,
      rough: 1.4,
      passes: 1,
      layer: 70,
    });
  }
  return shapes;
}

function swoosh(L, rng) {
  const n = 2 + Math.round(L.hairAmount * 1.6);
  const shapes = [];
  // Which way the parting falls.
  const flip = rng() < 0.5;
  // Strokes that all span the same arc at even offsets read as a cap. Starting
  // them off the temple, thickest at the parting and thinning as they travel,
  // reads as swept hair instead.
  for (let i = 0; i < n; i++) {
    const out = 2 + i * (1.4 + L.hairLength * 1.6);
    const a = -0.06 + i * 0.05;
    const b = clamp(0.42 + i * 0.16 + L.hairLength * 0.3 + rng() * 0.1, 0.2, 0.96);
    const [t0, t1] = flip ? [a, b] : [1 - a, 1 - b];
    const points = [];
    for (let k = 0; k <= 18; k++) {
      const f = k / 18;
      // Lifted off the skull at the parting and thinning as it travels. The
      // floor matters: strokes that reach zero land on the head outline and pile
      // into a dark smudge.
      points.push(crown(L, t0 + (t1 - t0) * f, 0.7 + out * (1 - f) ** 1.5));
    }
    shapes.push({ points, weight: 0.9, rough: 1, layer: 70 });
  }
  return shapes;
}

function curls(L, rng) {
  // Sparse small circles look like knobs stuck to the head. Curls have to be big
  // enough and close enough together to overlap into a mass.
  const n = 5 + Math.round(L.hairAmount * 6);
  const r = 2.4 + L.hairLength * 3;
  const shapes = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const [x, y] = crown(L, t, r * 0.3);
    const a0 = rng() * TAU;
    shapes.push({
      points: arc(x, y, r * (0.85 + rng() * 0.3), r * (0.8 + rng() * 0.4), a0, a0 + 5.2, 14),
      weight: 0.85,
      rough: 1.1,
      passes: 1,
      layer: 70,
    });
  }
  return shapes;
}

function frame(L, rng) {
  // Kept well clear of the skull: any closer and the crown arc doubles the head
  // outline instead of sitting on top of it.
  const out = 2.8 + L.hairLength * 3;
  const drop = L.cy + L.ry * (0.35 + L.hairLength * 0.85);
  const shapes = [];

  const top = [];
  for (let k = 0; k <= 26; k++) top.push(crown(L, k / 26, out));
  shapes.push({ points: top, weight: 1, layer: 10 });

  // Two lengths falling past the temples, tracked just outside the silhouette so
  // they frame the face instead of crossing it.
  for (const side of [-1, 1]) {
    const start = crown(L, side < 0 ? 0.02 : 0.98, out);
    const end = [start[0] + side * (0.5 + rng() * 1.5), drop];
    const points = [];
    for (let k = 0; k <= 12; k++) {
      const f = k / 12;
      points.push([
        start[0] + (end[0] - start[0]) * f + Math.sin(f * Math.PI) * side * L.hairMess,
        start[1] + (end[1] - start[1]) * f,
      ]);
    }
    shapes.push({ points, weight: 0.9, layer: 10 });
  }

  return shapes;
}

export function hair(L, rng) {
  const v = L.hairStyle;
  if (v < 0.14) return [];
  if (v < 0.32) return spikes(L, rng);
  if (v < 0.5) return scribble(L, rng);
  if (v < 0.66) return swoosh(L, rng);
  if (v < 0.82) return curls(L, rng);
  return frame(L, rng);
}
