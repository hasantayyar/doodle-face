import { bow } from "../geom.js";

// Brows carry most of the emotion, so this is where expression has the loudest
// say. A slice of faces get none at all, which is a legitimate doodle look.
export function brows(L, rng) {
  if (L.gene("browWeight") < 0.12) return [];

  const shapes = [];
  const eyeTop = L.eyeY - L.eyeR * Math.max(L.eyeAspect, 0.8);

  for (const side of [-1, 1]) {
    const jy = (rng() * 2 - 1) * L.asym * 1.3;
    const half = L.eyeR * L.browLength;
    const y = eyeTop - L.browGap + jy;

    // Positive tilt drops the inner end, which is the whole vocabulary of a
    // scowl. Sadness does the opposite, surprise lifts both ends together.
    let tilt = L.browAngle * 0.085 + L.anger * 2.6;
    if (L.joy < 0) tilt -= -L.joy * 1.8;
    const lift = L.surprise * 2.8 + Math.max(0, L.joy) * 0.5;

    const inner = [L.cx + side * (L.eyeGap - half), y + tilt - lift];
    const outer = [L.cx + side * (L.eyeGap + half), y - tilt * 0.6 - lift];

    // bow() bulges to the right of travel. Drawing inner-to-outer means the sign
    // that arches upward flips between the two sides.
    const arch = L.eyeR * 0.45 * L.browArch;

    shapes.push({
      points: bow(inner, outer, side < 0 ? arch : -arch, 10),
      weight: L.browWeight,
      layer: 40,
    });
  }

  return shapes;
}
