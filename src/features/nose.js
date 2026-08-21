import { line, circle, bow } from "../geom.js";

// Noses are where doodles differ most from portraits: leaving it out entirely is
// as valid as drawing one, so "none" is a real style here.
export function nose(L, rng) {
  const v = L.noseStyle;
  const w = L.noseWidth;
  const top = L.noseY - w * 1.1;
  const bottom = L.noseY + w * 0.35;
  const lean = (rng() * 2 - 1) * L.asym * 0.9;
  const x = L.cx + lean;
  const layer = 55;

  if (v < 0.16) return [];

  if (v < 0.4) {
    // A single stroke down the centre.
    return [{ points: line([x, top], [x + lean * 0.5, bottom], 8), weight: 0.9, layer }];
  }

  if (v < 0.6) {
    // Hook: down, then a flick out to one side.
    const dir = lean >= 0 ? -1 : 1;
    return [
      {
        points: [
          ...line([x, top], [x, bottom], 6),
          ...line([x, bottom], [x + dir * w * 0.9, bottom - w * 0.25], 4).slice(1),
        ],
        weight: 0.9,
        layer,
      },
    ];
  }

  if (v < 0.78) {
    // Two nostril dots and nothing else.
    const r = Math.max(0.55, w * 0.24);
    return [-1, 1].map((side) => ({
      points: circle(x + side * w * 0.6, L.noseY, r, 10),
      closed: true,
      fill: "currentColor",
      rough: 0.4,
      layer,
    }));
  }

  if (v < 0.9) {
    // A shallow "v".
    return [
      {
        points: [
          ...line([x - w, top + w * 0.3], [x, bottom], 5),
          ...line([x, bottom], [x + w, top + w * 0.3], 5).slice(1),
        ],
        weight: 0.9,
        layer,
      },
    ];
  }

  // A rounded underside, like a "u" tucked under the bridge.
  return [
    {
      points: bow([x - w * 0.8, L.noseY - w * 0.5], [x + w * 0.8, L.noseY - w * 0.5], w * 0.85, 10),
      weight: 0.9,
      layer,
    },
  ];
}
