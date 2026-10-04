import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWebServer } from "../scripts/serve-web.mjs";

async function start(t, server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  );
  return `http://127.0.0.1:${server.address().port}`;
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
