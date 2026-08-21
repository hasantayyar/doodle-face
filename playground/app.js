import {
  face,
  encode,
  decode,
  breed,
  mutate,
  genomeFromSeed,
  randomGenome,
  GENES,
  GENOME_LENGTH,
} from "doodle-face";

const GENE_INDEX = Object.fromEntries(GENES.map((n, i) => [n, i]));

// Gene names grouped for the UI. Kept here rather than in the library: the
// library has no opinion about how a control panel should be laid out.
const GROUPS = {
  Head: ["headWidth", "headHeight", "headSquare", "headTilt", "jawWidth", "chinLength", "cheekFullness"],
  Eyes: ["eyeShape", "eyeSize", "eyeSpacing", "eyeLevel", "eyeSlant", "eyeAspect", "pupilSize", "pupilDrift"],
  Brows: ["browHeight", "browAngle", "browLength", "browArch", "browWeight"],
  Nose: ["noseStyle", "noseLength", "noseWidth"],
  Mouth: ["mouthStyle", "mouthWidth", "mouthLevel", "lipFullness", "mood"],
  Ears: ["earSize", "earFlare"],
  Hair: ["hairStyle", "hairAmount", "hairLength", "hairMess"],
  Extras: ["glasses", "freckles", "beard", "blush"],
  Pen: ["roughness", "strokeWeight", "asymmetry"],
};

const DEFAULT_SEED = "maya";

const EXPRESSION = [
  // joy is the only knob with a genome-supplied resting value; the rest are
  // additions to whatever the face already is.
  { key: "joy", label: "joy", min: -1, max: 1, value: 0, resting: true },
  { key: "surprise", label: "surprise", min: 0, max: 1, value: 0 },
  { key: "anger", label: "anger", min: 0, max: 1, value: 0 },
  { key: "blink", label: "blink", min: 0, max: 1, value: 0 },
  { key: "gazeX", label: "gaze x", min: -1, max: 1, value: 0 },
  { key: "gazeY", label: "gaze y", min: -1, max: 1, value: 0 },
];

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of children) node.append(c);
  return node;
};

const state = {
  genome: null,
  // Pinning the ink means dragging a slider moves one feature instead of
  // redrawing every wobble on the face.
  ink: "pinned",
  expression: {},
  // `joy` left out of the expression object falls back to the genome's own mood,
  // which is what "resting" means.
  restingJoy: true,
  alive: null,
  parents: { a: null, b: null },
};

// ---- rendering ----

function currentExpression() {
  const e = { ...state.expression };
  if (state.restingJoy) delete e.joy;
  return e;
}

function draw(node, genome, options = {}) {
  node.innerHTML = face(genome, {
    inkSeed: state.ink,
    expression: currentExpression(),
    ...options,
  });
}

function render() {
  draw($("portrait"), state.genome);
  $("code").textContent = encode(state.genome);
  syncGeneInputs();
  renderFamily();
  const code = encode(state.genome);
  if (location.hash.slice(1) !== code) {
    history.replaceState(null, "", "#" + code);
  }
}

// ---- controls ----

function slider({ key, label, min = 0, max = 1, value, onInput }) {
  const readout = el("b", { textContent: value.toFixed(2) });
  const input = el("input", {
    type: "range",
    min,
    max,
    step: 0.01,
    value,
    ariaLabel: label,
  });
  input.addEventListener("input", () => {
    readout.textContent = Number(input.value).toFixed(2);
    onInput(Number(input.value));
  });
  const row = el("div", { className: "slider" }, [
    el("span", { textContent: label }),
    readout,
    input,
  ]);
  row.dataset.gene = key;
  return row;
}

function buildGenePanel() {
  const host = $("genes");
  for (const [group, names] of Object.entries(GROUPS)) {
    const box = el("div", {}, [el("h2", { textContent: group })]);
    for (const name of names) {
      const i = GENE_INDEX[name];
      box.append(
        slider({
          key: name,
          label: name.replace(/([A-Z])/g, " $1").toLowerCase(),
          value: state.genome[i],
          onInput: (v) => {
            state.genome[i] = v;
            draw($("portrait"), state.genome);
            $("code").textContent = encode(state.genome);
            renderFamily();
          },
        })
      );
    }
    host.append(box);
  }
}

function buildExpressionPanel() {
  const host = $("expression");
  const box = el("div", {});
  for (const spec of EXPRESSION) {
    box.append(
      slider({
        ...spec,
        onInput: (v) => {
          state.expression[spec.key] = v;
          if (spec.resting) state.restingJoy = false;
          draw($("portrait"), state.genome);
        },
      })
    );
  }
  host.append(box);
  syncExpressionInputs();
}

function syncGeneInputs() {
  for (const row of document.querySelectorAll("#genes .slider")) {
    const i = GENE_INDEX[row.dataset.gene];
    const input = row.querySelector("input");
    const v = state.genome[i];
    if (Math.abs(Number(input.value) - v) > 0.005) {
      input.value = v;
      row.querySelector("b").textContent = v.toFixed(2);
    }
  }
}

// ---- breeding ----

function renderFamily() {
  for (const side of ["a", "b"]) {
    const node = $("parent" + side.toUpperCase());
    const g = state.parents[side];
    if (g) draw(node, g, { inkSeed: "p" + side });
    else node.textContent = "";
  }

  const host = $("children");
  host.textContent = "";
  const { a, b } = state.parents;
  if (!a || !b) {
    host.append(
      el("p", {
        className: "hint",
        textContent: "Pick two parents to see their children.",
        style: "grid-column:1/-1;margin:0",
      })
    );
    return;
  }
  for (let i = 0; i < 8; i++) {
    const child = breed(a, b, { seed: "kid" + i, mutation: 0.05 });
    const node = el("button", { className: "thumb", title: encode(child) });
    node.innerHTML = face(child, { inkSeed: "kid" + i });
    node.addEventListener("click", () => load(child));
    host.append(node);
  }
}

// ---- actions ----

function load(genome, { seedText } = {}) {
  state.genome = Float64Array.from(genome);
  state.ink = encode(state.genome);
  if (seedText !== undefined) $("seed").value = seedText;
  render();
}

function stopAlive() {
  if (!state.alive) return;
  clearTimeout(state.alive);
  state.alive = null;
  $("alive").setAttribute("aria-pressed", "false");
  state.expression.blink = 0;
  state.expression.gazeX = 0;
  state.expression.gazeY = 0;
  syncExpressionInputs();
  draw($("portrait"), state.genome);
}

function syncExpressionInputs() {
  for (const row of document.querySelectorAll("#expression .slider")) {
    const spec = EXPRESSION.find((s) => s.key === row.dataset.gene);
    const v = state.expression[spec.key] ?? spec.value;
    row.querySelector("input").value = v;
    // An untouched joy slider is not really at zero, it is wherever the genome's
    // mood gene puts it, so saying "0.00" would be a lie.
    row.querySelector("b").textContent =
      spec.resting && state.restingJoy ? "resting" : v.toFixed(2);
  }
}

// Blink and glance on a loose timer. The point of the demo: identity is fixed,
// only the expression moves.
function tickAlive() {
  const blink = Math.random() < 0.55;
  if (blink) {
    state.expression.blink = 1;
    draw($("portrait"), state.genome);
    setTimeout(() => {
      state.expression.blink = 0;
      if (state.alive) draw($("portrait"), state.genome);
    }, 110);
  } else {
    state.expression.gazeX = Math.random() * 2 - 1;
    state.expression.gazeY = Math.random() - 0.5;
    draw($("portrait"), state.genome);
  }
  state.alive = setTimeout(tickAlive, 700 + Math.random() * 2200);
}

function download() {
  const svg = face(state.genome, { size: 512, expression: currentExpression() });
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const a = el("a", { href: url, download: `face-${encode(state.genome)}.svg` });
  a.click();
  URL.revokeObjectURL(url);
}

async function copy(text, button) {
  const label = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied";
  } catch {
    button.textContent = "Copy failed";
  }
  setTimeout(() => (button.textContent = label), 1200);
}

// ---- wiring ----

// Every gene must appear in exactly one panel group, or the panel silently drops
// a trait when the library gains one.
const grouped = Object.values(GROUPS).flat();
if (grouped.length !== GENES.length || new Set(grouped).size !== GENES.length) {
  console.warn("Gene panel is out of sync with the library.", {
    missing: GENES.filter((g) => !grouped.includes(g)),
    unknown: grouped.filter((g) => !GENES.includes(g)),
  });
}

function genomeFromHash() {
  const hash = location.hash.slice(1);
  if (hash.length !== GENOME_LENGTH) return null;
  try {
    return decode(hash);
  } catch {
    return null;
  }
}

state.genome = genomeFromHash() ?? genomeFromSeed(DEFAULT_SEED);
state.ink = encode(state.genome);
state.parents.a = genomeFromSeed("sam");
state.parents.b = genomeFromSeed("nora");

buildGenePanel();
buildExpressionPanel();
render();

$("seed").addEventListener("input", (e) => {
  const text = e.target.value;
  load(text ? genomeFromSeed(text) : randomGenome());
});

$("random").addEventListener("click", () => {
  const word = Math.random().toString(36).slice(2, 9);
  load(genomeFromSeed(word), { seedText: word });
});

$("nudge").addEventListener("click", () => {
  load(mutate(state.genome, 0.1, { seed: String(Math.random()) }));
});

$("replay").addEventListener("click", () => {
  draw($("portrait"), state.genome, { draw: 1400 });
});

$("alive").addEventListener("click", () => {
  if (state.alive) {
    stopAlive();
  } else {
    $("alive").setAttribute("aria-pressed", "true");
    tickAlive();
  }
});

$("resetExpression").addEventListener("click", () => {
  stopAlive();
  state.expression = {};
  state.restingJoy = true;
  syncExpressionInputs();
  draw($("portrait"), state.genome);
});

$("copySvg").addEventListener("click", (e) =>
  copy(face(state.genome, { size: 512, expression: currentExpression() }), e.target)
);
$("copyLink").addEventListener("click", (e) =>
  copy(location.href.replace(/#.*$/, "") + "#" + encode(state.genome), e.target)
);
$("download").addEventListener("click", download);

for (const button of document.querySelectorAll("[data-parent]")) {
  button.addEventListener("click", () => {
    state.parents[button.dataset.parent] = Float64Array.from(state.genome);
    renderFamily();
  });
}
for (const side of ["a", "b"]) {
  $("parent" + side.toUpperCase()).addEventListener("click", () => {
    if (state.parents[side]) load(state.parents[side]);
  });
}

window.addEventListener("hashchange", () => {
  const code = location.hash.slice(1);
  if (code.length === GENOME_LENGTH && code !== encode(state.genome)) {
    try {
      load(decode(code));
    } catch {
      /* not a genome code */
    }
  }
});
