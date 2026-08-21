import { superellipse } from "../geom.js";
import { headScaleX, headScaleY } from "./layout.js";

// The silhouette: a superellipse warped by jaw taper, chin length and cheek
// fullness. One closed shape, drawn first so everything else sits on top.
export function head(L) {
  const base = superellipse(L.cx, L.cy, L.rx, L.ry, L.headSquare, 56);
  const points = base.map(([x, y]) => {
    const v = (y - L.cy) / L.ry;
    return [
      L.cx + (x - L.cx) * headScaleX(L, v),
      L.cy + (y - L.cy) * headScaleY(L, v),
    ];
  });
  return [{ points, closed: true, weight: 1.15, layer: 20 }];
}
