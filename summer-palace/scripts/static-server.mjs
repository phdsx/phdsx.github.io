import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
const root = path.resolve("dist"),
  port = Number(process.env.PORT || 5184),
  prefix = "/palace/";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};
http
  .createServer(async (req, res) => {
    try {
      let name = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (!name.startsWith(prefix)) {
        res.writeHead(404).end();
        return;
      }
      name = name.slice(prefix.length) || "index.html";
      const file = path.resolve(root, name);
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      const body = await fs.readFile(file);
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Static build test: http://127.0.0.1:${port}${prefix}`),
  );
