// Assemble a static GitHub Pages site from the playground plus the library.
//
//   node tools/build-site.js [outDir]
//
// The playground imports the library as "doodle-face" via an import map that
// points at ../src. Pages deploys a flattened tree (index.html next to src/),
// so the map is rewritten to ./src/index.js.

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = resolve(root, process.argv[2] ?? "site");

const LOCAL_SPEC = "../src/index.js";
const PAGES_SPEC = "./src/index.js";

export async function buildSite(dest = out) {
  const html = await readFile(resolve(root, "playground/index.html"), "utf8");
  if (!html.includes(LOCAL_SPEC)) {
    throw new Error(`playground/index.html is missing import map spec ${LOCAL_SPEC}`);
  }

  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  await writeFile(resolve(dest, "index.html"), html.replaceAll(LOCAL_SPEC, PAGES_SPEC));
  await cp(resolve(root, "playground/app.js"), resolve(dest, "app.js"));
  await cp(resolve(root, "src"), resolve(dest, "src"), { recursive: true });
  // GitHub Pages runs Jekyll by default; this keeps src/_-prefixed files intact
  // if any appear later, and skips the Jekyll pass entirely.
  await writeFile(resolve(dest, ".nojekyll"), "");
  return dest;
}

if (process.argv[1] === import.meta.filename) {
  const dest = await buildSite();
  console.log(`wrote ${dest}`);
}
