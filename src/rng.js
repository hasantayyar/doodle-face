// Deterministic pseudo-randomness. Everything the library generates traces back
// to one of these, so identical input always yields a byte-identical SVG.

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function rngFromSeed(seed) {
  return mulberry32(hashString(String(seed)));
}

// A named sub-stream. Lets each feature draw from its own sequence, so adding a
// gene or a feature does not shift the numbers every other feature receives.
export function forkRng(seed, label) {
  return mulberry32(hashString(String(seed) + "\u0000" + label));
}

// Sum of uniforms, which is close enough to a bell curve for jitter and
// mutation and costs nothing.
export function gaussian(rng) {
  return (rng() + rng() + rng() + rng() + rng() + rng() - 3) / 3;
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}
