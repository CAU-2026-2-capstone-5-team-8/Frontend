import test from "node:test";
import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { once } from "node:events";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWebServer } from "../scripts/serve-web.mjs";

async function start(t, server, host = "127.0.0.1") {
  server.listen(0, host);
  await once(server, "listening");
  t.after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  );
  return `http://${host === "::" ? "[::1]" : host}:${server.address().port}`;
}
test("shelf and review DELETE reach Backend with bearer credentials and return empty 204", async (t) => {
  const received = [];
  const upstream = await start(
    t,
    createServer((req, res) => {
      received.push({
        path: req.url,
        method: req.method,
        token: req.headers.authorization,
        cookie: req.headers.cookie,
      });
      res.writeHead(204).end();
    }),
  );
  const proxy = await start(t, createWebServer({ backendUrl: upstream }));
  for (const resource of ["shelf", "reviews"]) {
    const response = await fetch(`${proxy}/api/users/42/${resource}/3`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer synthetic-test-token",
        Cookie: "not-forwarded=1",
      },
    });
    assert.equal(response.status, 204);
    assert.equal(await response.text(), "");
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.deepEqual(
    received,
    ["shelf", "reviews"].map((resource) => ({
      path: `/api/users/42/${resource}/3`,
      method: "DELETE",
      token: "Bearer synthetic-test-token",
      cookie: undefined,
    })),
  );
});

test("release serves health and deep links, rejects missing assets, and revalidates HTML", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "bookmatch-release-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(
    join(directory, "index.html"),
    "<!doctype html><title>Bookmatch</title>",
  );
  const proxy = await start(t, createWebServer({ directory }));
  const health = await fetch(`${proxy}/healthz`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });
  const deepLink = await fetch(`${proxy}/books/42`);
  assert.equal(deepLink.status, 200);
  assert.equal(deepLink.headers.get("cache-control"), "no-cache");
  assert.equal(deepLink.headers.get("x-frame-options"), "DENY");
  assert.equal((await fetch(`${proxy}/_expo/missing.js`)).status, 404);
  const head = await fetch(`${proxy}/books/42`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  assert.equal((await fetch(`${proxy}/%ZZ`)).status, 400);
});

test("backend URL must be an origin without ignored path, query, or fragment", () => {
  for (const backendUrl of [
    "http://localhost:8080/base",
    "http://localhost:8080/?x=1",
    "http://localhost:8080/#secret",
  ]) {
    assert.throws(
      () => createWebServer({ backendUrl }),
      /Invalid backend address/,
    );
  }
});

test("proxy overwrites forged client headers with the actual socket peer", async (t) => {
  const upstream = await start(t, createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ xff: req.headers["x-forwarded-for"], forwarded: req.headers.forwarded }));
  }));
  const proxy = await start(t, createWebServer({ backendUrl: upstream, trustedProxies: "" }));
  const response = await fetch(`${proxy}/api/auth/login`, { method: "POST",
    headers: { "X-Forwarded-For": "203.0.113.99", Forwarded: "for=203.0.113.99" } });
  assert.deepEqual(await response.json(), { xff: "127.0.0.1" });
});

test("only explicitly trusted proxy hops may supply a client address", async (t) => {
  const upstream = await start(t, createServer((req, res) => res.end(req.headers["x-forwarded-for"])));
  const proxy = await start(t, createWebServer({ backendUrl: upstream, trustedProxies: "127.0.0.1/32,10.1.0.0/16" }));
  for (const [forwarded, expected] of [
    ["198.51.100.7, 10.1.2.3", "198.51.100.7"],
    ["203.0.113.99, 198.51.100.7", "198.51.100.7"],
    ["198.51.100.7, invalid", "127.0.0.1"],
    ["2001:db8::7", "2001:db8::7"],
  ]) {
    const response = await fetch(`${proxy}/api/auth/login`, { method: "POST", headers: { "X-Forwarded-For": forwarded } });
    assert.equal(await response.text(), expected);
  }
});

test("trust-all or malformed proxy configuration fails closed at startup", () => {
  for (const trustedProxies of ["0.0.0.0/0", "::/0", "localhost", "127.0.0.1/99", "*"]) {
    assert.throws(() => createWebServer({ trustedProxies }), /trusted proxy/i);
  }
});

test("two real socket peers remain distinct through the same web proxy", async (t) => {
  const upstream = await start(t, createServer((req, res) => res.end(req.headers["x-forwarded-for"])));
  // IPv4 and IPv6 loopback exist on macOS and Linux without configuring aliases.
  // One dual-stack listener also exercises normalization of IPv4-mapped peers.
  const proxy = await start(t, createWebServer({ backendUrl: upstream, trustedProxies: "" }), "::");
  for (const peer of ["127.0.0.1", "::1"]) {
    const target = new URL(`${proxy}/api/auth/login`);
    target.hostname = peer === "::1" ? "[::1]" : peer;
    const received = await new Promise((resolve, reject) => {
      const req = request(target, { method: "POST", localAddress: peer,
        headers: { "X-Forwarded-For": "203.0.113.99" } }, (res) => {
        let text = ""; res.on("data", (chunk) => { text += chunk; }); res.on("end", () => resolve(text));
      });
      req.on("error", reject); req.end();
    });
    assert.equal(received, peer);
  }
});

test("rate-limit retry interval reaches the browser without forwarding cookies", async (t) => {
  const upstream = await start(t, createServer((req, res) => {
    res.writeHead(429, { "Retry-After": "60", "Set-Cookie": "must-not-forward=1" }).end("limited");
  }));
  const proxy = await start(t, createWebServer({ backendUrl: upstream }));
  const response = await fetch(`${proxy}/api/auth/login`, { method: "POST" });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(response.headers.get("set-cookie"), null);
});
test("rejected methods never reach Backend and ownership errors are preserved", async (t) => {
  let calls = 0;
  const upstream = await start(
    t,
    createServer((req, res) => {
      calls++;
      res
        .writeHead(403, { "Content-Type": "application/json" })
        .end(JSON.stringify({ code: "FORBIDDEN", message: "권한 없음" }));
    }),
  );
  const proxy = await start(t, createWebServer({ backendUrl: upstream }));
  assert.equal(
    (await fetch(`${proxy}/api/users/42/shelf`, { method: "PATCH" })).status,
    405,
  );
  assert.equal(calls, 0);
  const response = await fetch(`${proxy}/api/users/42/shelf/3`, {
    method: "DELETE",
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, "FORBIDDEN");
  assert.equal(calls, 1);
});
