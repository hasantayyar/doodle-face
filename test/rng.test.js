import test from "node:test";
import assert from "node:assert/strict";
import { rngFromSeed, hashString, forkRng, gaussian } from "../src/rng.js";

test("same seed yields the same sequence", () => {
  const a = rngFromSeed("hasan");
  const b = rngFromSeed("hasan");
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test("different seeds diverge", () => {
  const a = rngFromSeed("hasan");
  const b = rngFromSeed("hasam");
  let same = 0;
  for (let i = 0; i < 100; i++) if (a() === b()) same++;
  assert.equal(same, 0);
});

test("output stays in [0,1)", () => {
  const rng = rngFromSeed("range");
  for (let i = 0; i < 10000; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});

test("output is roughly uniform", () => {
  const rng = rngFromSeed("uniform");
  const buckets = new Array(10).fill(0);
  const n = 100000;
  for (let i = 0; i < n; i++) buckets[Math.floor(rng() * 10)]++;
  for (const count of buckets) {
    assert.ok(Math.abs(count - n / 10) < n / 50, `skewed bucket: ${count}`);
  }
});

test("hashString is stable and unsigned", () => {
  assert.equal(hashString("hasan"), hashString("hasan"));
  assert.ok(hashString("hasan") >= 0);
  assert.notEqual(hashString(""), hashString("a"));
});

test("forked streams are independent", () => {
  const eyes = forkRng("hasan", "eyes");
  const nose = forkRng("hasan", "nose");
  assert.notEqual(eyes(), nose());
  assert.equal(forkRng("hasan", "eyes")(), forkRng("hasan", "eyes")());
});

test("gaussian is centred and bounded", () => {
  const rng = rngFromSeed("bell");
  let sum = 0;
  const n = 50000;
  for (let i = 0; i < n; i++) {
    const v = gaussian(rng);
    assert.ok(v >= -1 && v <= 1);
    sum += v;
  }
  assert.ok(Math.abs(sum / n) < 0.02);
});
