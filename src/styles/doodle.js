// The one style shipped so far. A style is only ever pen settings; it never
// decides what gets drawn, which is what lets a new style be a few numbers.
export const doodle = {
  name: "doodle",
  strokeWidth: 1.7,
  // Multiplies the per-face roughness gene.
  roughness: 1,
  wander: 0.85,
  offset: 0.5,
  passes: 2,
  overshoot: true,
  linecap: "round",
  linejoin: "round",
};

export const styles = { doodle };

const LINECAP_VALUES = new Set(["butt", "round", "square"]);
const LINEJOIN_VALUES = new Set(["miter", "round", "bevel", "arcs", "miter-clip"]);

export function resolveStyle(style) {
  if (!style) return doodle;
  if (typeof style === "string") {
    const found = styles[style];
    if (!found) {
      throw new Error(`unknown style: ${style} (have: ${Object.keys(styles).join(", ")})`);
    }
    return found;
  }
  const merged = { ...doodle, ...style };
  merged.linecap = LINECAP_VALUES.has(merged.linecap) ? merged.linecap : doodle.linecap;
  merged.linejoin = LINEJOIN_VALUES.has(merged.linejoin) ? merged.linejoin : doodle.linejoin;
  return merged;
}
