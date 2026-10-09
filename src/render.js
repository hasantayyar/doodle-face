import { forkRng } from "./rng.js";
import { encode } from "./genome.js";
import { num } from "./geom.js";
import { handStrokes } from "./hand.js";
import { resolveStyle } from "./styles/doodle.js";
import { layout, CANVAS } from "./features/layout.js";
import { head } from "./features/head.js";
import { ears } from "./features/ears.js";
import { hair } from "./features/hair.js";
import { brows } from "./features/brows.js";
import { eyes } from "./features/eyes.js";
import { nose } from "./features/nose.js";
import { mouth } from "./features/mouth.js";
import { extras } from "./features/extras.js";

// Every feature gets its own random streams, keyed by name. Adding a feature or
// reordering this list cannot disturb the faces the others draw.
const FEATURES = [
  ["ears", ears],
  ["head", head],
  ["hair", hair],
  ["brows", brows],
  ["eyes", eyes],
  ["nose", nose],
  ["mouth", mouth],
  ["extras", extras],
];

const escapeXml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]
  );

/**
 * Geometry only: the strokes that make up a face, with no SVG around them.
 * Exists so a canvas or native renderer can reuse everything above this line.
 */
export function faceStrokes(genome, options = {}) {
  const style = resolveStyle(options.style);
  const L = layout(genome, options.expression);
  // The jitter is keyed off the whole genome, so each face is wobbled uniquely and
  // is fully determined by its genes. Pin `inkSeed` to hold the wobble still while
  // genes change, which is what makes dragging a slider legible.
  const key = options.inkSeed != null ? String(options.inkSeed) : encode(genome);

  const pen = {
    ...style,
    strokeWidth: (options.strokeWidth ?? style.strokeWidth) * L.strokeWeight,
    roughness: (options.roughness ?? style.roughness) * L.roughness,
  };

  const shapes = [];
  for (const [name, build] of FEATURES) {
    const geomRng = forkRng(key, "shape:" + name);
    const inkRng = forkRng(key, "ink:" + name);
    for (const shape of build(L, geomRng)) {
      shapes.push({ shape, inkRng, layer: shape.layer ?? 50 });
    }
  }

  // Stable sort: equal layers keep the order their feature produced them in.
  shapes.sort((a, b) => a.layer - b.layer);

  const strokes = [];
  for (const { shape, inkRng } of shapes) {
    strokes.push(...handStrokes(shape, inkRng, pen));
  }

  return { strokes, layout: L, style: pen, viewBox: CANVAS };
}

export function renderSvg(genome, options = {}) {
  const {
    size = null,
    color = "#1a1a1a",
    background = null,
    draw = false,
    title,
    className,
  } = options;

  const { strokes, layout: L, style } = faceStrokes(genome, options);

  const attrs = [
    'xmlns="http://www.w3.org/2000/svg"',
    `viewBox="0 0 ${CANVAS} ${CANVAS}"`,
  ];
  if (size != null) attrs.push(`width="${num(size)}"`, `height="${num(size)}"`);
  if (className) attrs.push(`class="${escapeXml(className)}"`);
  attrs.push(
    // A presentation attribute, so CSS on the element still wins. Standalone
    // files get a sensible ink colour; embedded ones can be recoloured.
    `color="${escapeXml(color)}"`,
    'fill="none"',
    'stroke="currentColor"',
    `stroke-width="${num(style.strokeWidth)}"`,
    `stroke-linecap="${escapeXml(style.linecap)}"`,
    `stroke-linejoin="${escapeXml(style.linejoin)}"`,
    title ? 'role="img"' : 'aria-hidden="true"'
  );

  const total = draw === true ? 1200 : Number(draw) || 0;

  // Prelude sits outside the tilt group so a background or title is not rotated.
  const prelude = [];
  if (title) prelude.push(`<title>${escapeXml(title)}</title>`);
  if (total > 0) {
    prelude.push(
      "<style>@keyframes dfDraw{to{stroke-dashoffset:0}}" +
        "@keyframes dfFade{from{opacity:0}}</style>"
    );
  }
  if (background) {
    prelude.push(
      `<rect width="${CANVAS}" height="${CANVAS}" fill="${escapeXml(background)}"/>`
    );
  }

  const paths = [];
  const n = strokes.length || 1;
  strokes.forEach((s, i) => {
    const parts = [`d="${s.d}"`];
    if (Math.abs(s.width - style.strokeWidth) > 0.005) {
      parts.push(`stroke-width="${num(s.width)}"`);
    }
    if (s.fill) parts.push(`fill="${s.fill}"`);
    if (s.opacity < 0.999) parts.push(`opacity="${num(s.opacity)}"`);

    if (total > 0) {
      // Strokes appear in drawing order, each one taking a slice of the budget.
      const delay = Math.round((total * 0.72 * i) / n);
      const dur = Math.round(total * 0.3);
      const css = s.fill
        ? `animation:dfFade ${dur}ms ease-out ${delay}ms both`
        : `stroke-dasharray:${num(s.length)};stroke-dashoffset:${num(s.length)};` +
          `animation:dfDraw ${dur}ms ease-out ${delay}ms forwards`;
      parts.push(`style="${css}"`);
    }

    paths.push(`<path ${parts.join(" ")}/>`);
  });

  // One group transform is the cheapest way to tilt the whole head, jitter and
  // all.
  const drawn =
    Math.abs(L.tilt) > 0.05
      ? `<g transform="rotate(${num(L.tilt)} ${CANVAS / 2} ${CANVAS / 2})">${paths.join(
          ""
        )}</g>`
      : paths.join("");

  return `<svg ${attrs.join(" ")}>${prelude.join("")}${drawn}</svg>`;
}
