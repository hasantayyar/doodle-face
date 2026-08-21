import { superellipse, circle, bow, rotate, translate, clamp } from "../geom.js";

const DEG = Math.PI / 180;

// Four eye kinds, chosen by gene rather than blended, because eyes are the one
// feature where a halfway shape reads as a mistake.
function pickKind(v) {
  if (v < 0.15) return "dot";
  if (v < 0.5) return "round";
  if (v < 0.78) return "almond";
  return "curve";
}

// A lens: upper lid arcs higher than the lower, which is what separates an eye
// from a leaf.
function almond(rx, ry) {
  const l = [-rx, 0];
  const r = [rx, 0];
  const upper = bow(l, r, -ry * 1.15, 10);
  const lower = bow(r, l, -ry * 0.75, 10);
  return [...upper, ...lower.slice(1, -1)];
}

export function eyes(L, rng) {
  const shapes = [];
  const kind = pickKind(L.eyeShape);
  const closedLid = L.blink >= 0.55;

  for (const side of [-1, 1]) {
    // Asymmetry is most legible in the eyes, so this is where it is spent.
    const jx = (rng() * 2 - 1) * L.asym * 1.1;
    const jy = (rng() * 2 - 1) * L.asym * 1.1;
    const jr = 1 + (rng() * 2 - 1) * L.asym * 0.13;

    const x = L.cx + side * L.eyeGap + jx;
    const y = L.eyeY + jy;
    const rx = L.eyeR * jr;
    // Half-closing squashes the eye instead of clipping it, which costs nothing
    // and still reads as a heavy lid.
    const ry = rx * L.eyeAspect * jr * (1 - L.blink * 0.85);
    const slant = (side * L.eyeSlant + side * L.anger * 12) * DEG;

    const place = (points) => translate(rotate(points, slant), x, y);

    if (closedLid) {
      // A shut eye is a line, and a happy shut eye curves upward.
      const curve = L.joy > 0.15 ? -ry * 0.9 : ry * 0.5;
      shapes.push({
        points: place(bow([-rx, 0], [rx, 0], curve, 10)),
        weight: 1,
        layer: 45,
      });
      continue;
    }

    if (kind === "curve") {
      // The classic doodle eye: one arc, no outline. Curves up when cheerful and
      // flattens out when not.
      const curve = -ry * (0.5 + Math.max(0, L.joy) * 0.75) - L.surprise * ry * 0.3;
      shapes.push({
        points: place(bow([-rx, 0], [rx, 0], curve, 10)),
        weight: 1.15,
        layer: 45,
      });
      continue;
    }

    if (kind === "dot") {
      // No socket to move within, so the whole dot shifts a little instead. Less
      // literal than a pupil, but it still reads as looking somewhere.
      shapes.push({
        points: place(
          circle(L.gazeX * rx * 0.4, L.gazeY * rx * 0.4, rx * 0.62, 16)
        ),
        closed: true,
        fill: "currentColor",
        rough: 0.5,
        layer: 45,
      });
      continue;
    }

    const outline =
      kind === "almond" ? almond(rx, ry) : superellipse(0, 0, rx, ry, 2.1, 22);
    shapes.push({ points: place(outline), closed: true, weight: 1, layer: 45 });

    // Pupil. Gaze and the genome's resting drift share one budget so the pupil
    // can never leave the eye.
    // Capped well short of the eye so there is always somewhere for the gaze to
    // travel; a pupil that fills its socket cannot look anywhere.
    const pr = clamp(ry * L.pupilSize * 1.4, rx * 0.2, Math.min(rx, ry) * 0.66);
    const freeX = Math.max(0, rx - pr) * 0.92;
    const freeY = Math.max(0, ry - pr) * 0.92;
    const px = clamp(L.gazeX + L.pupilDrift * 0.35, -1, 1) * freeX;
    const py = clamp(L.gazeY, -1, 1) * freeY;
    shapes.push({
      points: place(circle(px, py, pr, 14)),
      closed: true,
      fill: "currentColor",
      rough: 0.45,
      layer: 50,
    });
  }

  return shapes;
}
