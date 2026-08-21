import { bow, superellipse, line, clamp } from "../geom.js";

// In SVG the y axis points down, so a smile is a curve whose middle sits *below*
// its corners. Every bulge in this file follows from that.
export function mouth(L, rng) {
  const w = L.mouthWidth;
  const y = L.mouthY;
  const skew = (rng() * 2 - 1) * L.asym * 1.2;
  const left = [L.cx - w, y - skew * 0.5];
  const right = [L.cx + w, y + skew * 0.5];
  const curve = L.joy * w * 0.5;
  const layer = 60;

  // A surprised mouth is a hole, whatever the genome had in mind.
  if (L.surprise > 0.45) {
    const r = w * (0.3 + L.surprise * 0.3);
    return [
      {
        points: superellipse(L.cx, y + r * 0.2, r * 0.85, r, 2.2, 20),
        closed: true,
        weight: 1,
        layer,
      },
    ];
  }

  const v = L.mouthStyle;

  if (v < 0.22) {
    return [{ points: bow(left, right, curve, 14), weight: 1.1, layer }];
  }

  if (v < 0.44) {
    // Fuller mouth: the main line plus a shorter one below it.
    const inset = 0.7;
    const lower = L.lipFullness * w * 0.3 + 0.8;
    return [
      { points: bow(left, right, curve, 14), weight: 1.1, layer },
      {
        points: bow(
          [L.cx - w * inset, y + lower],
          [L.cx + w * inset, y + lower],
          curve * 0.5,
          10
        ),
        weight: 0.8,
        layer,
      },
    ];
  }

  if (v < 0.62) {
    // Corner ticks turning the same way as the smile.
    const tickLen = w * 0.28;
    const dir = L.joy >= 0 ? -1 : 1;
    return [
      { points: bow(left, right, curve, 14), weight: 1.1, layer },
      {
        points: line(left, [left[0] - tickLen * 0.3, left[1] + dir * tickLen], 3),
        weight: 0.85,
        layer,
      },
      {
        points: line(right, [right[0] + tickLen * 0.3, right[1] + dir * tickLen], 3),
        weight: 0.85,
        layer,
      },
    ];
  }

  if (v < 0.82) {
    // Open mouth: a lens between the smile line and a deeper lower lip.
    const depth = clamp(w * (0.3 + L.lipFullness * 0.35), 1.6, 7);
    const upper = bow(left, right, curve * 0.6, 12);
    const lower = bow(right, left, -(depth + Math.max(0, L.joy) * w * 0.2), 12);
    return [
      {
        points: [...upper, ...lower.slice(1, -1)],
        closed: true,
        weight: 1,
        layer,
      },
    ];
  }

  // Squiggle: an unbothered wavy line.
  const steps = 22;
  const waves = 2 + Math.round(L.lipFullness * 2);
  const amp = w * 0.16;
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push([
      L.cx - w + 2 * w * t,
      y + Math.sin(t * Math.PI * waves) * amp + Math.sin(t * Math.PI) * curve,
    ]);
  }
  return [{ points, weight: 1.05, layer }];
}
