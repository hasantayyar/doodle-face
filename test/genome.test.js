import test from "node:test";
import assert from "node:assert/strict";
import {
  GENES,
  GENOME_LENGTH,
  genomeFromSeed,
  randomGenome,
  encode,
  decode,
  breed,
  mutate,
  gene,
  withGene,
  toObject,
  fromObject,
  isGenome,
} from "../src/genome.js";
import { rngFromSeed } from "../src/rng.js";

test("gene names are unique", () => {
  assert.equal(new Set(GENES).size, GENES.length);
});

test("genomeFromSeed is deterministic and in range", () => {
  const a = genomeFromSeed("hasan");
  const b = genomeFromSeed("hasan");
  assert.deepEqual([...a], [...b]);
  assert.equal(a.length, GENOME_LENGTH);
  for (const v of a) assert.ok(v >= 0 && v < 1);
});

test("different seeds give different genomes", () => {
  const a = genomeFromSeed("alice");
  const b = genomeFromSeed("bob");
  assert.notDeepEqual([...a], [...b]);
});

test("encode round-trips within quantisation error", () => {
  const g = genomeFromSeed("round-trip");
  const code = encode(g);
  assert.equal(code.length, GENOME_LENGTH);
  const back = decode(code);
  for (let i = 0; i < GENOME_LENGTH; i++) {
    assert.ok(Math.abs(g[i] - back[i]) <= 0.5 / 63, `gene ${GENES[i]} drifted`);
  }
});

test("decode of an encoded genome is itself stable", () => {
  const code = encode(genomeFromSeed("stable"));
  assert.equal(encode(decode(code)), code);
});

test("decode rejects malformed codes", () => {
  assert.throws(() => decode("abc"));
  assert.throws(() => decode(null));
  assert.throws(() => decode("!".repeat(GENOME_LENGTH)));
});

test("encode clamps out-of-range values", () => {
  const g = new Float64Array(GENOME_LENGTH).fill(5);
  assert.equal(encode(g), "_".repeat(GENOME_LENGTH));
  assert.equal(encode(new Float64Array(GENOME_LENGTH).fill(-5)), "0".repeat(GENOME_LENGTH));
});

test("breed is deterministic and stays in range", () => {
  const a = genomeFromSeed("mum");
  const b = genomeFromSeed("dad");
  const c1 = breed(a, b);
  const c2 = breed(a, b);
  assert.deepEqual([...c1], [...c2]);
  for (const v of c1) assert.ok(v >= 0 && v <= 1);
});

test("breed with no mutation or blend inherits gene-for-gene", () => {
  const a = genomeFromSeed("mum");
  const b = genomeFromSeed("dad");
  const c = breed(a, b, { mutation: 0, blend: 0 });
  for (let i = 0; i < GENOME_LENGTH; i++) {
    assert.ok(c[i] === a[i] || c[i] === b[i], `gene ${GENES[i]} came from nowhere`);
  }
});

test("breed draws from both parents", () => {
  const a = new Float64Array(GENOME_LENGTH).fill(0);
  const b = new Float64Array(GENOME_LENGTH).fill(1);
  const c = breed(a, b, { mutation: 0, blend: 0 });
  assert.ok([...c].some((v) => v === 0));
  assert.ok([...c].some((v) => v === 1));
});

test("breed seed option changes the outcome", () => {
  const a = genomeFromSeed("mum");
  const b = genomeFromSeed("dad");
  assert.notDeepEqual([...breed(a, b, { seed: "1" })], [...breed(a, b, { seed: "2" })]);
});

test("mutate moves genes a little, not a lot", () => {
  const g = genomeFromSeed("mutant");
  const m = mutate(g, 0.05);
  let moved = 0;
  for (let i = 0; i < GENOME_LENGTH; i++) {
    assert.ok(m[i] >= 0 && m[i] <= 1);
    if (m[i] !== g[i]) moved++;
  }
  assert.ok(moved > GENOME_LENGTH / 2);
  const mean = [...g].reduce((s, v, i) => s + Math.abs(v - m[i]), 0) / GENOME_LENGTH;
  assert.ok(mean < 0.05, `mutation too strong: ${mean}`);
});

test("mutate with zero amount is a no-op", () => {
  const g = genomeFromSeed("still");
  assert.deepEqual([...mutate(g, 0)], [...g]);
});

test("gene lookup by name", () => {
  const g = genomeFromSeed("named");
  assert.equal(gene(g, "eyeSize"), g[GENES.indexOf("eyeSize")]);
  assert.throws(() => gene(g, "nostrilCount"));
});

test("withGene sets one gene and clamps", () => {
  const g = genomeFromSeed("setter");
  const out = withGene(g, "eyeSize", 9);
  assert.equal(gene(out, "eyeSize"), 1);
  assert.equal(gene(out, "noseWidth"), gene(g, "noseWidth"));
});

test("object form round-trips", () => {
  const g = genomeFromSeed("obj");
  const back = fromObject(toObject(g));
  assert.deepEqual([...back], [...g]);
});

test("fromObject defaults missing genes to the midpoint", () => {
  const g = fromObject({ eyeSize: 0.9 });
  assert.equal(gene(g, "eyeSize"), 0.9);
  assert.equal(gene(g, "noseWidth"), 0.5);
});

test("isGenome accepts genomes and rejects other things", () => {
  assert.ok(isGenome(genomeFromSeed("x")));
  assert.ok(isGenome(new Array(GENOME_LENGTH).fill(0.5)));
  assert.ok(!isGenome("hasan"));
  assert.ok(!isGenome([1, 2, 3]));
  assert.ok(!isGenome(null));
});

test("randomGenome honours a supplied rng", () => {
  const a = randomGenome(rngFromSeed("r"));
  const b = randomGenome(rngFromSeed("r"));
  assert.deepEqual([...a], [...b]);
});

test("genomes are well spread across the population", () => {
  const sums = new Float64Array(GENOME_LENGTH);
  const n = 2000;
  for (let i = 0; i < n; i++) {
    const g = genomeFromSeed("user" + i);
    for (let j = 0; j < GENOME_LENGTH; j++) sums[j] += g[j];
  }
  for (let j = 0; j < GENOME_LENGTH; j++) {
    const mean = sums[j] / n;
    assert.ok(Math.abs(mean - 0.5) < 0.05, `gene ${GENES[j]} mean is ${mean}`);
  }
});
