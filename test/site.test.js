import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildSite } from "../tools/build-site.js";

test("the Pages tree imports the library from ./src", async () => {
  const dir = await mkdtemp(join(tmpdir(), "doodle-face-site-"));
  try {
    await buildSite(dir);
    const html = await readFile(join(dir, "index.html"), "utf8");
    assert.ok(html.includes('"./src/index.js"'));
    assert.ok(!html.includes("../src/index.js"));

    const app = await readFile(join(dir, "app.js"), "utf8");
    assert.ok(app.includes('from "doodle-face"'));

    const nojekyll = await readFile(join(dir, ".nojekyll"), "utf8");
    assert.equal(nojekyll, "");

    const lib = await import(pathToFileURL(join(dir, "src/index.js")).href);
    assert.ok(lib.face("maya").startsWith("<svg"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
