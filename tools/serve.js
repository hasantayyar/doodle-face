// Static server for the playground. ES modules will not load over file://, and a
// dependency-free project should not need a dev server package to look at itself.
//
//   node tools/serve.js [port]

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const port = Number(process.argv[2]) || 5173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const path = decodeURIComponent(url.pathname);

    // Redirect rather than rewrite. Serving playground/index.html at "/" would
    // leave the document URL at the root, and its relative script src would then
    // resolve to /app.js.
    if (path === "/") {
      res.writeHead(302, { location: "/playground/" }).end();
      return;
    }

    // normalize collapses any ".." before it is joined to the root.
    const file = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ""));
    if (!file.startsWith(root)) {
      res.writeHead(403).end("forbidden");
      return;
    }

    const info = await stat(file);
    if (info.isDirectory() && !path.endsWith("/")) {
      res.writeHead(302, { location: path + "/" }).end();
      return;
    }
    const target = info.isDirectory() ? join(file, "index.html") : file;
    const body = await readFile(target);
    res.writeHead(200, {
      "content-type": TYPES[extname(target)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(port, () => {
  console.log(`playground: http://localhost:${port}`);
});
