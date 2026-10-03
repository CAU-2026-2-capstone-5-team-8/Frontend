import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};
export function createWebServer({
  backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8087",
  directory = fileURLToPath(new URL("../dist/", import.meta.url)),
} = {}) {
  const root = resolve(directory);
  const upstream = new URL(backendUrl);
  if (
    !["http:", "https:"].includes(upstream.protocol) ||
    upstream.username ||
    upstream.password
  )
    throw Error("Invalid backend address");
  return createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/api/")) {
        if (!["GET", "POST", "PUT", "DELETE"].includes(req.method)) {
          res.writeHead(405).end();
          return;
        }
        let size = 0;
        const chunks = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 65536) {
            res.writeHead(413).end();
            return;
          }
          chunks.push(chunk);
        }
        const headers = { "Content-Type": "application/json" };
        if (typeof req.headers.authorization === "string")
          headers.Authorization = req.headers.authorization;
        if (typeof req.headers["idempotency-key"] === "string")
          headers["Idempotency-Key"] = req.headers["idempotency-key"];
        const response = await fetch(
          new URL(url.pathname + url.search, upstream.origin),
          {
            method: req.method,
            headers,
            redirect: "error",
            signal: AbortSignal.timeout(25000),
            ...(size ? { body: Buffer.concat(chunks) } : {}),
          },
        );
        res.writeHead(response.status, {
          "Content-Type":
            response.headers.get("content-type") || "application/json",
          "Cache-Control": "no-store",
        });
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      if (req.method !== "GET") {
        res.writeHead(405).end();
        return;
      }
      const path = resolve(root, "." + decodeURIComponent(url.pathname));
      if (path !== root && !path.startsWith(root + sep)) {
        res.writeHead(404).end();
        return;
      }
      let selected = path;
      try {
        if (!(await stat(selected)).isFile())
          selected = resolve(root, "index.html");
      } catch {
        selected = resolve(root, "index.html");
      }
      const body = await readFile(selected);
      res.writeHead(200, {
        "Content-Type":
          (types[extname(selected)] || "application/octet-stream") +
          "; charset=utf-8",
      });
      res.end(body);
    } catch {
      if (!res.headersSent)
        res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "서버 연결을 확인하지 못했어요. 다시 시도해 주세요.",
        }),
      );
    }
  });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  createWebServer().listen(Number(process.env.PORT || 5183), "127.0.0.1", () =>
    console.log(`책길: http://127.0.0.1:${process.env.PORT || 5183}`),
  );
}
