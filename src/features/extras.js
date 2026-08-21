import { superellipse, circle, line, bow } from "../geom.js";
import { headHalfWidth, headScaleX, headScaleY } from "./layout.js";

// Extras are gated on a high gene value so that most faces have none and the ones
// that do feel like they were singled out. Expected count is well under one per
// face.
const GATE = { glasses: 0.8, freckles: 0.8, beard: 0.86, blush: 0.84 };

function glasses(L) {
  const shapes = [];
  const rx = L.eyeR * 1.75;
  const ry = Math.max(L.eyeR * 1.2, rx * 0.62);
  // Rounder or squarer frames, decided by how far past the gate the gene sits.
  const boxy = L.glasses > 0.9 ? 3.4 : 2;

  for (const side of [-1, 1]) {
    const x = L.cx + side * L.eyeGap;
    shapes.push({
      points: superellipse(x, L.eyeY, rx, ry, boxy, 26),
      closed: true,
      weight: 0.85,
      rough: 0.7,
      layer: 80,
    });
    // Arm running from the frame back to the edge of the head.
    const edge = L.cx + side * headHalfWidth(L, L.eyeY);
    shapes.push({
      points: line([x + side * rx, L.eyeY - ry * 0.15], [edge, L.eyeY - ry * 0.5], 4),
      weight: 0.7,
      rough: 0.7,
      layer: 80,
    });
  }

  const gap = L.eyeGap - rx;
  if (gap > 0.4) {
    shapes.push({
      points: bow([L.cx - gap, L.eyeY], [L.cx + gap, L.eyeY], -gap * 0.5, 8),
      weight: 0.7,
      rough: 0.7,
      layer: 80,
    });
  }

  return shapes;
}

function freckles(L, rng) {
  // A handful per cheek. More than that stops reading as freckles and starts
  // reading as grime.
  const n = 2 + Math.round((L.freckles - GATE.freckles) * 10);
  const shapes = [];
  for (const side of [-1, 1]) {
    const cx = L.cx + side * L.eyeGap * 1.05;
    const cy = (L.eyeY + L.mouthY) / 2 + 1;
    for (let i = 0; i < n; i++) {
      const spread = L.eyeR * 1.7;
      shapes.push({
        points: circle(
          cx + (rng() * 2 - 1) * spread,
          cy + (rng() * 2 - 1) * spread * 0.6,
          0.3 + rng() * 0.22,
          8
        ),
        closed: true,
        fill: "currentColor",
        rough: 0.3,
        opacity: 0.6,
        layer: 66,
      });
    }
  }
  return shapes;
}

// A few short parallel ticks on the cheek. This is the drawn convention for
// blush; hatching an ellipse gives long strokes in the middle and short ones at
// the edges, which reads as whiskers instead.
function blush(L, rng) {
  const shapes = [];
  const cy = (L.eyeY + L.mouthY) / 2 + 2;
  const n = 2 + Math.round((L.blush - GATE.blush) * 14);
  const len = L.eyeR * 0.95;
  const gap = Math.max(1.4, L.eyeR * 0.42);
  const angle = -0.62;
  const dx = Math.cos(angle) * len * 0.5;
  const dy = Math.sin(angle) * len * 0.5;

  for (const side of [-1, 1]) {
    const cx = L.cx + side * L.eyeGap * 1.15;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * gap;
      const x = cx + off * 0.75;
      const y = cy - off * 0.35 + (rng() * 2 - 1) * 0.3;
      shapes.push({
        points: line([x - dx, y - dy], [x + dx, y + dy], 3),
        weight: 0.55,
        rough: 0.8,
        passes: 1,
        opacity: 0.55,
        layer: 66,
      });
    }
  }
  return shapes;
}

// A point on the lower silhouette. t runs 0 at the right cheek, under the chin,
// to 1 at the left.
function jawPoint(L, t) {
  const a = t * Math.PI;
  const p = 2 / L.headSquare;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const ux = Math.sign(c) * Math.abs(c) ** p;
  const uy = Math.sign(s) * Math.abs(s) ** p;
  return [
    L.cx + L.rx * ux * headScaleX(L, uy),
    L.cy + L.ry * uy * headScaleY(L, uy),
  ];
}

function beard(L, rng) {
  const shapes = [];
  const density = 0.45 + (L.beard - GATE.beard) * 4;
  const steps = 30;
  // Short strokes hung off the jaw, angled back towards the middle of the face.
  for (let i = 0; i <= steps; i++) {
    const [x, y] = jawPoint(L, i / steps);
    if (y < L.mouthY - 1) continue;
    if (rng() > density) continue;
    const dx = L.cx - x;
    const dy = L.cy + L.ry * 0.2 - y;
    const len = Math.hypot(dx, dy) || 1;
    const reach = 1.8 + rng() * 2.8;
    shapes.push({
      points: line([x, y], [x + (dx / len) * reach, y + (dy / len) * reach], 3),
      weight: 0.6,
      rough: 1.4,
      passes: 1,
      opacity: 0.8,
      layer: 58,
    });
  }
  return shapes;
}

export function extras(L, rng) {
  const shapes = [];
  // Order is fixed rather than gene-dependent so that adding one extra to a face
  // does not shift the random stream the others draw from.
  if (L.blush > GATE.blush) shapes.push(...blush(L, rng));
  if (L.freckles > GATE.freckles) shapes.push(...freckles(L, rng));
  if (L.beard > GATE.beard) shapes.push(...beard(L, rng));
  if (L.glasses > GATE.glasses) shapes.push(...glasses(L));
  return shapes;
}

export { GATE as EXTRA_GATES };
