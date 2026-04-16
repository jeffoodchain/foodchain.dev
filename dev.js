import { spawnSync } from "child_process";
import http from "http";
import fs from "fs";
import path from "path";

function build() {
  const r = spawnSync("node", ["build.js"], { stdio: "inherit" });
  if (r.status !== 0) console.error("build failed");
}

build();

for (const dir of ["posts", "templates"]) {
  fs.watch(dir, { recursive: true }, (_event, filename) => {
    console.log(`change: ${dir}/${filename} — rebuilding`);
    build();
  });
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const PORT = 3000;
http
  .createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
    if (p.endsWith("/")) p += "index.html";
    const filePath = path.join("dist", p);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log(`serving dist/ at http://localhost:${PORT}`));
