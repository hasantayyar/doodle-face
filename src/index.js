import {
  GENES,
  GENOME_LENGTH,
  genomeFromSeed,
  randomGenome,
  isGenome,
  encode,
  decode,
  breed as breedGenome,
  mutate as mutateGenome,
  gene,
  withGene,
  toObject,
  fromObject,
} from "./genome.js";
import { renderSvg, faceStrokes } from "./render.js";
import { rngFromSeed } from "./rng.js";
import { styles } from "./styles/doodle.js";

/**
 * Coerce whatever the caller has into a genome.
 * Accepts a genome, a 41-character genome code, or any other string as a seed.
 */
export function toGenome(input) {
  if (isGenome(input)) {
    return input instanceof Float64Array ? input : Float64Array.from(input);
  }
  if (typeof input === "number") return genomeFromSeed(String(input));
  if (typeof input === "string") {
    if (input.length === GENOME_LENGTH && /^[\w-]+$/.test(input)) {
      try {
        return decode(input);
      } catch {
        // Not a genome code after all; fall through and treat it as a seed.
      }
    }
    return genomeFromSeed(input);
  }
  if (input && typeof input === "object") return fromObject(input);
  throw new TypeError(`cannot make a face from ${typeof input}`);
}

/**
 * Draw a face.
 *
 *   face("hasan")
 *   face("hasan", { size: 256, expression: { joy: 1 } })
 *
 * Returns an SVG string. The same input always returns the same string.
 */
export function face(input, options) {
  return renderSvg(toGenome(input), options);
}

/** The strokes behind a face, for anyone who wants to draw them elsewhere. */
export function strokes(input, options) {
  return faceStrokes(toGenome(input), options);
}

/** A `data:` URI, handy for an <img src> or a CSS background. */
export function faceDataUri(input, options) {
  return "data:image/svg+xml;utf8," + encodeURIComponent(face(input, options));
}

/** Mix two faces. Accepts seeds, codes or genomes for either parent. */
export function breed(a, b, options) {
  return breedGenome(toGenome(a), toGenome(b), options);
}

/** Nudge every gene a little. */
export function mutate(input, amount, options) {
  return mutateGenome(toGenome(input), amount, options);
}

/** A genome from a seed, or from nothing at all. */
export function random(seed) {
  return seed === undefined ? randomGenome() : randomGenome(rngFromSeed(seed));
}

export {
  GENES,
  GENOME_LENGTH,
  genomeFromSeed,
  randomGenome,
  isGenome,
  encode,
  decode,
  gene,
  withGene,
  toObject,
  fromObject,
  styles,
};

export default face;
