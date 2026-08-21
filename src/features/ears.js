import { bow } from "../geom.js";
import { headHalfWidth } from "./layout.js";

// Small arcs hung off the silhouette. Most faces skip them; ears on a doodle read
// as a deliberate choice rather than a default.
export function ears(L, rng) {
  if (L.earSize < 0.45) return [];

  const size = 2 + (L.earSize - 0.45) * 9;
  const top = L.cy - L.ry * 0.1;
  const bottom = top + size * L.earFlare * 1.5;
  const shapes = [];

  for (const side of [-1, 1]) {
    const jitter = 1 + (rng() * 2 - 1) * L.asym * 0.2;
    const p0 = [L.cx + side * headHalfWidth(L, top) * 0.99, top];
    const p1 = [L.cx + side * headHalfWidth(L, bottom) * 0.99, bottom];
    // Drawing top-to-bottom, the outward direction flips sign with the side.
    shapes.push({
      points: bow(p0, p1, -side * size * jitter, 10),
      weight: 0.85,
      layer: 15,
    });
  }

  return shapes;
}
