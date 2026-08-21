import test from "node:test";
import assert from "node:assert/strict";
import face, {
  face as namedFace,
  strokes,
  faceDataUri,
  breed,
  mutate,
  toGenome,
  encode,
  decode,
  genomeFromSeed,
  GENOME_LENGTH,
  withGene,
} from "../src/index.js";

// Pull every coordinate out of every path in an SVG.
function coords(svg) {
  const out = [];
  for (const m of svg.matchAll(/ d="([^"]+)"/g)) {
    for (const n of m[1].match(/-?\d+(\.\d+)?/g) ?? []) out.push(Number(n));
  }
  return out;
}

const pathCount = (svg) => (svg.match(/<path /g) ?? []).length;

test("default and named exports are the same function", () => {
  assert.equal(face, namedFace);
});

test("a seed produces a well-formed svg", () => {
  const svg = face("hasan");
  assert.ok(svg.startsWith("<svg "));
  assert.ok(svg.endsWith("</svg>"));
  assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /viewBox="0 0 100 100"/);
  assert.ok(pathCount(svg) > 4, "a face needs more than a few strokes");
});

test("the same seed always renders the same bytes", () => {
  assert.equal(face("hasan"), face("hasan"));
  assert.equal(face("a-much-longer-seed-value"), face("a-much-longer-seed-value"));
});

test("different seeds render differently", () => {
  assert.notEqual(face("alice"), face("bob"));
});

test("a genome, its code and an equivalent object all render the same", () => {
  const g = genomeFromSeed("hasan");
  const code = encode(g);
  assert.equal(face(decode(code)), face(code));
});

test("a 41-character non-code string is treated as a seed", () => {
  const seed = "!".repeat(GENOME_LENGTH);
  assert.equal(seed.length, GENOME_LENGTH);
  assert.equal(face(seed), face(seed));
  assert.ok(face(seed).startsWith("<svg"));
});

test("numbers are accepted as seeds", () => {
  assert.equal(face(42), face("42"));
});

test("bad input is rejected", () => {
  assert.throws(() => face(null));
  assert.throws(() => face(undefined));
  assert.throws(() => face(true));
});

test("size sets width and height, and is optional", () => {
  assert.match(face("hasan", { size: 256 }), / width="256" height="256"/);
  assert.ok(!face("hasan").includes(' width="'));
});

test("colour, background, title and class options land in the output", () => {
  const svg = face("hasan", {
    color: "#c0ffee",
    background: "#fff",
    title: "Hasan & co <hi>",
    className: "avatar",
  });
  assert.match(svg, /color="#c0ffee"/);
  assert.match(svg, /<rect width="100" height="100" fill="#fff"\/>/);
  assert.match(svg, /<title>Hasan &amp; co &lt;hi&gt;<\/title>/);
  assert.match(svg, /class="avatar"/);
  assert.match(svg, /role="img"/);
});

test("a face with no title is hidden from assistive tech", () => {
  assert.match(face("hasan"), /aria-hidden="true"/);
});

test("draw option adds dash animation to outlines", () => {
  const svg = face("hasan", { draw: true });
  assert.match(svg, /@keyframes dfDraw/);
  assert.match(svg, /stroke-dasharray:/);
  assert.match(svg, /animation:dfDraw \d+ms/);
  assert.ok(!face("hasan").includes("@keyframes"));
});

test("draw accepts a duration", () => {
  assert.match(face("hasan", { draw: 400 }), /animation:dfDraw 120ms/);
});

test("expression changes the drawing but not the identity", () => {
  const happy = face("hasan", { expression: { joy: 1 } });
  const sad = face("hasan", { expression: { joy: -1 } });
  assert.notEqual(happy, sad);
  // Same genome, so the head is drawn identically; only the features move.
  const headOf = (svg) => svg.match(/<path d="([^"]+)"/g)[0];
  assert.equal(headOf(happy), headOf(sad));
});

test("every expression knob does something", () => {
  const base = face("hasan");
  for (const e of [{ joy: 1 }, { surprise: 1 }, { anger: 1 }, { blink: 1 }]) {
    assert.notEqual(face("hasan", { expression: e }), base, `no effect: ${JSON.stringify(e)}`);
  }
});

test("gaze moves the pupils of a face that has pupils", () => {
  // Dot and curve eyes have no pupil to move, so this needs an eye shape that
  // does. eyeShape 0.3 is in the round band.
  const g = withGene(genomeFromSeed("hasan"), "eyeShape", 0.3);
  assert.notEqual(face(g, { expression: { gaze: { x: 1 } } }), face(g));
});

test("gaze accepts an array or an object", () => {
  const g = withGene(genomeFromSeed("hasan"), "eyeShape", 0.3);
  assert.equal(
    face(g, { expression: { gaze: [1, -1] } }),
    face(g, { expression: { gaze: { x: 1, y: -1 } } })
  );
});

test("expression values are clamped, not extrapolated", () => {
  assert.equal(
    face("hasan", { expression: { joy: 5 } }),
    face("hasan", { expression: { joy: 1 } })
  );
});

test("an unknown style is rejected", () => {
  assert.throws(() => face("hasan", { style: "watercolour" }), /unknown style/);
});

test("a style object overrides the defaults", () => {
  assert.match(face("hasan", { style: { strokeWidth: 5 } }), /stroke-width="[45]/);
});

test("strokes() exposes geometry without svg", () => {
  const { strokes: list, layout, viewBox } = strokes("hasan");
  assert.equal(viewBox, 100);
  assert.ok(list.length > 4);
  assert.equal(typeof layout.rx, "number");
  for (const s of list) {
    assert.equal(typeof s.d, "string");
    assert.ok(s.width > 0);
    assert.ok(s.length >= 0);
  }
});

test("faceDataUri is usable as an img src", () => {
  const uri = faceDataUri("hasan");
  assert.ok(uri.startsWith("data:image/svg+xml;utf8,"));
  assert.equal(decodeURIComponent(uri.slice(24)), face("hasan"));
});

test("breed accepts seeds, codes and genomes", () => {
  const kid = breed("alice", "bob");
  assert.equal(kid.length, GENOME_LENGTH);
  assert.deepEqual([...breed("alice", "bob")], [...kid]);
  assert.deepEqual(
    [...breed(genomeFromSeed("alice"), genomeFromSeed("bob"))],
    [...kid]
  );
  assert.ok(face(kid).startsWith("<svg"));
});

test("breeding from codes lands close to breeding from genomes", () => {
  // Not identical: a code has been quantised, so the parents differ slightly.
  const fromGenomes = breed(genomeFromSeed("alice"), genomeFromSeed("bob"));
  const fromCodes = breed(encode(genomeFromSeed("alice")), encode(genomeFromSeed("bob")));
  const drift =
    [...fromGenomes].reduce((s, v, i) => s + Math.abs(v - fromCodes[i]), 0) /
    GENOME_LENGTH;
  assert.ok(drift < 0.05, `codes drifted the child by ${drift}`);
});

test("a child resembles its parents more than a stranger does", () => {
  const a = genomeFromSeed("alice");
  const b = genomeFromSeed("bob");
  const kid = breed(a, b, { mutation: 0 });
  const stranger = genomeFromSeed("zoe");
  const dist = (x, y) =>
    [...x].reduce((s, v, i) => s + Math.abs(v - y[i]), 0) / GENOME_LENGTH;
  const toParents = (x) => (dist(x, a) + dist(x, b)) / 2;
  assert.ok(toParents(kid) < toParents(stranger));
});

test("mutate returns a renderable neighbour", () => {
  const m = mutate("hasan", 0.1);
  assert.equal(m.length, GENOME_LENGTH);
  assert.ok(face(m).startsWith("<svg"));
  assert.notEqual(face(m), face("hasan"));
});

test("toGenome is idempotent", () => {
  const g = toGenome("hasan");
  assert.deepEqual([...toGenome(g)], [...g]);
  assert.deepEqual([...toGenome(encode(g))], [...decode(encode(g))]);
});

test("no stroke escapes the canvas", () => {
  for (let i = 0; i < 500; i++) {
    const svg = face("bounds-" + i);
    for (const v of coords(svg)) {
      assert.ok(v > -3 && v < 103, `seed bounds-${i} drew at ${v}`);
    }
  }
});

test("extreme genomes still stay on the canvas", () => {
  for (const fill of [0, 1]) {
    const g = new Float64Array(GENOME_LENGTH).fill(fill);
    for (const v of coords(face(g))) {
      assert.ok(v > -6 && v < 106, `all-${fill} genome drew at ${v}`);
    }
  }
  // And one gene at a time pushed to each extreme.
  const base = genomeFromSeed("extreme");
  for (let i = 0; i < GENOME_LENGTH; i++) {
    for (const v of [0, 1]) {
      const g = Float64Array.from(base);
      g[i] = v;
      for (const c of coords(face(g))) {
        assert.ok(c > -6 && c < 106, `gene ${i}=${v} drew at ${c}`);
      }
    }
  }
});

test("every face draws a head and some features", () => {
  for (let i = 0; i < 200; i++) {
    const n = pathCount(face("count-" + i));
    assert.ok(n >= 4, `seed count-${i} only drew ${n} strokes`);
    assert.ok(n < 200, `seed count-${i} drew ${n} strokes, too busy`);
  }
});

test("output stays small", () => {
  for (let i = 0; i < 200; i++) {
    const bytes = face("size-" + i).length;
    assert.ok(bytes < 40000, `seed size-${i} rendered ${bytes} bytes`);
  }
});

test("no NaN reaches the output", () => {
  for (let i = 0; i < 300; i++) {
    const svg = face("nan-" + i, { expression: { joy: 1, surprise: 1, anger: 1 } });
    assert.ok(!svg.includes("NaN"), `seed nan-${i} produced NaN`);
    assert.ok(!svg.includes("undefined"), `seed nan-${i} produced undefined`);
    assert.ok(!svg.includes("Infinity"));
  }
});

test("a pinned inkSeed holds the rest of the face still", () => {
  const g = genomeFromSeed("isolate");
  const opts = { inkSeed: "pinned" };
  const before = face(g, opts);
  const after = face(withGene(g, "mouthWidth", 0.95), opts);
  assert.notEqual(before, after);
  const headPath = (svg) => svg.match(/<path d="[^"]+"/g)[0];
  assert.equal(headPath(before), headPath(after), "the head should not be re-inked");
});

test("without a pinned inkSeed, any gene change re-inks the whole face", () => {
  const g = genomeFromSeed("isolate");
  const headPath = (svg) => svg.match(/<path d="[^"]+"/g)[0];
  assert.notEqual(headPath(face(g)), headPath(face(withGene(g, "mouthWidth", 0.95))));
});
