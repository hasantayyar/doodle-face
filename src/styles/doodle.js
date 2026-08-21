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

export function resolveStyle(style) {
  if (!style) return doodle;
  if (typeof style === "string") {
    const found = styles[style];
    if (!found) {
      throw new Error(`unknown style: ${style} (have: ${Object.keys(styles).join(", ")})`);
    }
    return found;
  }
  return { ...doodle, ...style };
}
