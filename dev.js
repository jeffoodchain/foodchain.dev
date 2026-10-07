// Local preview: builds the site, serves ./dist, rebuilds when sources change
// and reloads open browser tabs. Usage: `pnpm dev` (or `node dev.js`),
// optionally `PORT=4000 node dev.js`.
import fs from "fs";
import http from "http";
import path from "path";
import { spawn } from "child_process";

const PORT = Number(process.env.PORT) || 3000;
const DIST = path.resolve("dist");
const WATCH = ["posts", "templates", "styles.css", "site.js", "build.js"];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const RELOAD_SNIPPET =
  '<script>new EventSource("/__reload").onmessage=()=>location.reload();</script>';

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const clients = new Set();
let building = null;
let pending = false;

function build() {
  if (building) {
    pending = true;
    return building;
  }
  building = new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, ["build.js"], { stdio: ["ignore", "ignore", "inherit"] });
    child.on("exit", (code) => {
      building = null;
      if (code === 0) {
        console.log(`built in ${Date.now() - started}ms`);
        for (const res of clients) res.write("data: reload\n\n");
      } else {
        console.error(`build failed (exit ${code})`);
      }
      if (pending) {
        pending = false;
        build();
      }
      resolve();
    });
  });
  return building;
}

let timer = null;
function scheduleBuild(reason) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log(`change: ${reason}`);
    build();
  }, 150);
}

for (const target of WATCH) {
  if (!fs.existsSync(target)) continue;
  const recursive = fs.statSync(target).isDirectory();
  fs.watch(target, { recursive }, (_, file) =>
    scheduleBuild(recursive && file ? path.join(target, file) : target)
  );
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/__reload") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(":ok\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  let file = path.join(DIST, decodeURIComponent(url.pathname));
  if (!file.startsWith(DIST)) {
    res.writeHead(403).end("forbidden");
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) file = `${file}.html`;

  if (!fs.existsSync(file)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("404 not found");
    return;
  }

  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });

  if (ext === ".html") {
    const html = fs.readFileSync(file, "utf-8");
    res.end(html.replace("</body>", `${RELOAD_SNIPPET}</body>`));
  } else {
    fs.createReadStream(file).pipe(res);
  }
});

await build();
server.listen(PORT, () => {
  console.log(`\n  foodchain.dev preview → http://localhost:${PORT}\n`);
  console.log(`  watching: ${WATCH.join(", ")}  (ctrl+c to stop)\n`);
});
