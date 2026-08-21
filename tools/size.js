// Size of the shipped library. Run for a per-file breakdown:
//
//   node tools/size.js
//
// Two totals are reported, because they answer different questions:
//
//   as written  what you get importing src/ directly, comments and all
//   stripped    comments, blank lines and indentation removed, which is a rough
//               stand-in for what a bundler would ship
//
// Neither is a minified figure. This project has no build step and no minifier,
// so quoting a mangled-identifier number would be quoting something that is
// never produced.

import { readFile, glob } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";

// Regression guards, not aspirations. Raise them deliberately when a feature
// earns the bytes.
export const BUDGET = { written: 18 * 1024, stripped: 11 * 1024 };

const root = resolve(import.meta.dirname, "..");
const gz = (text) => gzipSync(Buffer.from(text), { level: 9 }).length;

// Only whole-line comments are dropped, so no string or regex containing "//"
// can be damaged. That makes this an under-estimate of what a minifier removes.
const strip = (source) =>
  source
    .split("\n")
    .filter((l) => l.trim() !== "" && !l.trim().startsWith("//"))
    .map((l) => l.trimStart())
    .join("\n");

export async function measure() {
  const paths = [];
  for await (const p of glob("src/**/*.js", { cwd: root })) paths.push(p);
  paths.sort();

  const files = [];
  let written = "";
  let stripped = "";
  for (const path of paths) {
    const source = await readFile(resolve(root, path), "utf8");
    written += source;
    stripped += strip(source) + "\n";
    files.push({ path, raw: source.length, gzip: gz(source) });
  }

  return {
    files,
    written: { raw: written.length, gzip: gz(written) },
    stripped: { raw: stripped.length, gzip: gz(stripped) },
  };
}

if (process.argv[1] === import.meta.filename) {
  const { files, written, stripped } = await measure();
  const pad = Math.max(...files.map((f) => f.path.length));
  const row = (label, raw, gzip, note = "") =>
    `${label.padEnd(pad)}  ${String(raw).padStart(6)} raw  ${String(gzip).padStart(5)} gz  ${note}`;

  for (const f of files) console.log(row(f.path, f.raw, f.gzip));
  console.log("-".repeat(pad + 32));
  console.log(row("as written", written.raw, written.gzip, `budget ${BUDGET.written}`));
  console.log(row("stripped", stripped.raw, stripped.gzip, `budget ${BUDGET.stripped}`));

  if (written.gzip > BUDGET.written || stripped.gzip > BUDGET.stripped) {
    console.log("\nover budget");
    process.exitCode = 1;
  }
}
