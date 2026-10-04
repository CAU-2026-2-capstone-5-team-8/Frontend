import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { BlockList, isIP } from "node:net";

// Trust is opt-in. Never forward an arbitrary browser-supplied client identity.
function clientAddressResolver(configuration) {
  const trusted = new BlockList();
  for (const entry of configuration.split(",").map((s) => s.trim()).filter(Boolean)) {
    const [address, mask, extra] = entry.split("/");
    const family = isIP(address);
    const bits = mask === undefined ? (family === 4 ? 32 : 128) : Number(mask);
    if (!family || extra !== undefined || !Number.isInteger(bits) || bits < 1 ||
        bits > (family === 4 ? 32 : 128) || (mask !== undefined && !/^\d+$/.test(mask)))
      throw Error("Invalid trusted proxy CIDR");
    trusted.addSubnet(address, bits, family === 4 ? "ipv4" : "ipv6");
  }
  const normalize = (address) => address?.startsWith("::ffff:") && isIP(address.slice(7)) === 4
    ? address.slice(7) : address;
  const isTrusted = (address) => !!isIP(address) && trusted.check(address, isIP(address) === 4 ? "ipv4" : "ipv6");
  return (req) => {
    const peer = normalize(req.socket.remoteAddress);
    const header = req.headers["x-forwarded-for"];
    if (!isTrusted(peer) || typeof header !== "string" || header.length > 2048) return peer;
    const hops = header.split(",").map((s) => normalize(s.trim()));
    if (hops.length > 16 || hops.some((h) => !isIP(h))) return peer;
    let current = peer;
    for (let i = hops.length - 1; i >= 0 && isTrusted(current); i--) current = hops[i];
    return current;
  };
}
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
  trustedProxies = process.env.TRUSTED_PROXY_CIDRS || "",
} = {}) {
  const clientAddress = clientAddressResolver(trustedProxies);
  const root = resolve(directory);
  const upstream = new URL(backendUrl);
  if (
    !["http:", "https:"].includes(upstream.protocol) ||
    upstream.username ||
    upstream.password ||
    upstream.pathname !== "/" ||
    upstream.search ||
    upstream.hash
  )
    throw Error("Invalid backend address");
  return createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Cache-Control", "no-store");
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/healthz" && ["GET", "HEAD"].includes(req.method)) {
        await stat(resolve(root, "index.html"));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          req.method === "HEAD" ? undefined : JSON.stringify({ status: "ok" }),
        );
        return;
      }
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
        headers["X-Forwarded-For"] = clientAddress(req);
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
        const retryAfter = response.headers.get("retry-after");
        res.writeHead(response.status, {
          ...(retryAfter ? { "Retry-After": retryAfter } : {}),
          "Content-Type":
            response.headers.get("content-type") || "application/json",
          "Cache-Control": "no-store",
        });
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405).end();
        return;
      }
      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        res.writeHead(400).end();
        return;
      }
      const path = resolve(root, "." + pathname);
      if (path !== root && !path.startsWith(root + sep)) {
        res.writeHead(404).end();
        return;
      }
      let selected = path;
      try {
        if (!(await stat(selected)).isFile())
          selected = resolve(root, "index.html");
      } catch {
        if (
          extname(path) ||
          pathname.startsWith("/_expo/") ||
          pathname.startsWith("/assets/")
        ) {
          res.writeHead(404).end();
          return;
        }
        selected = resolve(root, "index.html");
      }
      const body = await readFile(selected);
      res.writeHead(200, {
        "Cache-Control": "no-cache",
        "Content-Type":
          (types[extname(selected)] || "application/octet-stream") +
          "; charset=utf-8",
      });
      res.end(req.method === "HEAD" ? undefined : body);
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
  if (process.env.NODE_ENV === "production" && !process.env.BACKEND_URL)
    throw Error("BACKEND_URL is required in production");
  const host = process.env.HOST || "127.0.0.1";
  const server = createWebServer().listen(
    Number(process.env.PORT || 5183),
    host,
    () => console.log(`책길: http://${host}:${process.env.PORT || 5183}`),
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 10000).unref();
    });
}
