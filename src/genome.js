import { forkRng, rngFromSeed, gaussian } from "./rng.js";

// The single source of truth for what a face is. Order matters only for the
// encoded form; every other lookup goes through GENE_INDEX by name, so appending
// a gene here is backwards compatible and never reshuffles an existing face.
export const GENES = [
  "headWidth",
  "headHeight",
  "headSquare",
  "headTilt",
  "jawWidth",
  "chinLength",
  "cheekFullness",

  "eyeSize",
  "eyeSpacing",
  "eyeLevel",
  "eyeSlant",
  "eyeAspect",
  "eyeShape",
  "pupilSize",
  "pupilDrift",

  "browHeight",
  "browAngle",
  "browLength",
  "browArch",
  "browWeight",

  "noseLength",
  "noseWidth",
  "noseStyle",

  "mouthWidth",
  "mouthLevel",
  "mouthStyle",
  "lipFullness",

  "earSize",
  "earFlare",

  "hairStyle",
  "hairAmount",
  "hairLength",
  "hairMess",

  "glasses",
  "freckles",
  "beard",
  "blush",

  "roughness",
  "strokeWeight",
  "asymmetry",

  // Resting mood, kept separate from mouthStyle so a cheerful face is not forced
  // into one particular mouth shape.
  "mood",
];

export const GENE_INDEX = Object.fromEntries(GENES.map((n, i) => [n, i]));
export const GENOME_LENGTH = GENES.length;

// 64 URL-safe characters, so one encoded character carries one gene at 6 bits of
// precision. That is ~1.6% resolution per trait, far finer than the eye can read
// off a 100-unit face.
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
const ALPHABET_INDEX = Object.fromEntries([...ALPHABET].map((c, i) => [c, i]));

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function gene(genome, name) {
  const i = GENE_INDEX[name];
  if (i === undefined) throw new Error(`unknown gene: ${name}`);
  return genome[i];
}

export function isGenome(value) {
  return (
    (value instanceof Float64Array || Array.isArray(value)) &&
    value.length === GENOME_LENGTH
  );
}

export function genomeFromSeed(seed) {
  const genome = new Float64Array(GENOME_LENGTH);
  // One forked stream per gene name rather than one stream read in order: this is
  // what makes appending to GENES safe.
  for (let i = 0; i < GENOME_LENGTH; i++) {
    genome[i] = forkRng(seed, "gene:" + GENES[i])();
  }
  return genome;
}

export function randomGenome(rng = Math.random) {
  const genome = new Float64Array(GENOME_LENGTH);
  for (let i = 0; i < GENOME_LENGTH; i++) genome[i] = rng();
  return genome;
}

export function encode(genome) {
  let out = "";
  for (let i = 0; i < GENOME_LENGTH; i++) {
    out += ALPHABET[Math.round(clamp01(genome[i]) * 63)];
  }
  return out;
}

export function decode(code) {
  if (typeof code !== "string" || code.length !== GENOME_LENGTH) {
    throw new Error(
      `expected a ${GENOME_LENGTH}-character genome code, got ${
        typeof code === "string" ? code.length : typeof code
      }`
    );
  }
  const genome = new Float64Array(GENOME_LENGTH);
  for (let i = 0; i < GENOME_LENGTH; i++) {
    const v = ALPHABET_INDEX[code[i]];
    if (v === undefined) throw new Error(`bad character in genome code: ${code[i]}`);
    genome[i] = v / 63;
  }
  return genome;
}

// Uniform crossover with a chance of blending instead of choosing. Blending
// matters for continuous traits: a wide-faced and a narrow-faced parent should
// sometimes produce a medium-faced child, not always one or the other.
export function breed(a, b, options = {}) {
  const { mutation = 0.04, blend = 0.35, seed } = options;
  const rng = rngFromSeed(seed ?? encode(a) + encode(b));
  const child = new Float64Array(GENOME_LENGTH);
  for (let i = 0; i < GENOME_LENGTH; i++) {
    let v;
    if (rng() < blend) {
      const t = 0.3 + rng() * 0.4;
      v = a[i] * t + b[i] * (1 - t);
    } else {
      v = rng() < 0.5 ? a[i] : b[i];
    }
    if (mutation > 0) v += gaussian(rng) * mutation;
    child[i] = clamp01(v);
  }
  return child;
}

export function mutate(genome, amount = 0.08, options = {}) {
  const rng = rngFromSeed(options.seed ?? encode(genome) + ":" + amount);
  const out = new Float64Array(GENOME_LENGTH);
  for (let i = 0; i < GENOME_LENGTH; i++) {
    out[i] = clamp01(genome[i] + gaussian(rng) * amount);
  }
  return out;
}

export function withGene(genome, name, value) {
  const out = Float64Array.from(genome);
  out[GENE_INDEX[name]] = clamp01(value);
  return out;
}

export function toObject(genome) {
  const out = {};
  for (let i = 0; i < GENOME_LENGTH; i++) out[GENES[i]] = genome[i];
  return out;
}

export function fromObject(values) {
  const genome = new Float64Array(GENOME_LENGTH);
  for (let i = 0; i < GENOME_LENGTH; i++) {
    genome[i] = clamp01(values[GENES[i]] ?? 0.5);
  }
  return genome;
}
