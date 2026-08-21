import test from "node:test";
import assert from "node:assert/strict";
import { measure, BUDGET } from "../tools/size.js";

test("the library stays inside its size budget", async () => {
  const { written, stripped } = await measure();
  assert.ok(
    written.gzip <= BUDGET.written,
    `src/ as written is ${written.gzip} bytes gzipped, budget is ${BUDGET.written}`
  );
  assert.ok(
    stripped.gzip <= BUDGET.stripped,
    `src/ stripped is ${stripped.gzip} bytes gzipped, budget is ${BUDGET.stripped}`
  );
});

test("the library has no dependencies", async () => {
  const pkg = JSON.parse(
    await (await import("node:fs/promises")).readFile(
      new URL("../package.json", import.meta.url),
      "utf8"
    )
  );
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.peerDependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
});

test("nothing in src/ imports outside src/", async () => {
  const { readFile, glob } = await import("node:fs/promises");
  const root = new URL("../", import.meta.url);
  for await (const path of glob("src/**/*.js", { cwd: root })) {
    const source = await readFile(new URL(path, root), "utf8");
    for (const m of source.matchAll(/from\s+"([^"]+)"/g)) {
      const spec = m[1];
      assert.ok(
        spec.startsWith("./") || spec.startsWith("../"),
        `${path} imports "${spec}"; the library must be self-contained`
      );
      assert.ok(
        !spec.includes("../../"),
        `${path} reaches outside src/ with "${spec}"`
      );
    }
  }
});

test("src/ contains no browser or node globals", async () => {
  const { readFile, glob } = await import("node:fs/promises");
  const root = new URL("../", import.meta.url);
  // The library renders by building strings, so it must run identically in a
  // browser, in Node and in a worker.
  const banned = /\b(document|window|process|require|__dirname|localStorage)\b/;
  for await (const path of glob("src/**/*.js", { cwd: root })) {
    const source = await readFile(new URL(path, root), "utf8");
    const line = source.split("\n").findIndex((l) => banned.test(l));
    assert.equal(line, -1, `${path}:${line + 1} uses a host global`);
  }
});
