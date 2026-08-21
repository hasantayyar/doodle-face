// Contact sheet. Renders a wall of faces to out/grid.html so the aesthetic can be
// judged in bulk rather than one lucky seed at a time.
//
//   node tools/grid.js [count] [--cols=10] [--seed=prefix] [--out=file]

import { mkdirSync, writeFileSync } from "node:fs";
import { face } from "../src/index.js";

const args = process.argv.slice(2);
const count = Number(args.find((a) => /^\d+$/.test(a))) || 100;
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const cols = Number(flag("cols", 10));
const prefix = flag("seed", "face");
const out = flag("out", "out/grid.html");

const cells = [];
for (let i = 0; i < count; i++) {
  const seed = `${prefix}-${i}`;
  cells.push(
    `<figure><div class="f">${face(seed, { size: 120 })}</div><figcaption>${seed}</figcaption></figure>`
  );
}

const html = `<!doctype html>
<meta charset="utf-8">
<title>${count} faces</title>
<style>
  body { margin: 0; padding: 18px; background: #fbfaf7; font: 11px ui-monospace, monospace; color: #999; }
  .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 6px; }
  figure { margin: 0; text-align: center; }
  .f { background: #fff; border: 1px solid #eee; border-radius: 8px; color: #1a1a1a; }
  svg { display: block; width: 100%; height: auto; }
  figcaption { padding-top: 2px; }
</style>
<div class="grid">${cells.join("")}</div>
`;

mkdirSync(out.replace(/\/[^/]+$/, ""), { recursive: true });
writeFileSync(out, html);
console.log(`wrote ${out} (${count} faces)`);
