// Runs the actual web proxy against a disposable Backend, using invalid credentials only.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createWebServer } from "./serve-web.mjs";

const backendUrl = process.env.SMOKE_BACKEND_URL;
if (!backendUrl || process.env.SMOKE_ALLOW_AUTH_ATTEMPTS !== "1")
  throw Error("Set SMOKE_BACKEND_URL and SMOKE_ALLOW_AUTH_ATTEMPTS=1 for a disposable Backend");

const run = randomUUID();
const checks = [];
async function throughProxy(trustedProxies, check) {
  const server = createWebServer({ backendUrl, trustedProxies });
  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    await check(`http://127.0.0.1:${server.address().port}/api/auth/login`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}
async function attempt(url, source, account, expected) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": source },
    body: JSON.stringify({ email: `${run}-${account}@example.invalid`, password: "Invalid-smoke-password-1!" }),
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, expected, `Expected ${expected}, received ${response.status}`);
  const body = await response.json();
  if (expected === 429) {
    assert.equal(body.code, "AUTH_RATE_LIMIT");
    assert.equal(response.headers.get("retry-after"), "60");
  }
  assert.equal(response.headers.get("set-cookie"), null);
  return response.status;
}

await throughProxy("127.0.0.1/32", async (url) => {
  const distinct = [];
  for (let i = 1; i <= 12; i++)
    distinct.push(await attempt(url, `198.51.100.${i}`, `distinct-${i}`, 401));
  checks.push({ name: "distinct-client-quotas", statuses: distinct });

  const account = [];
  for (let i = 1; i <= 11; i++)
    account.push(await attempt(url, `203.0.113.${i}`, "same-account", i === 11 ? 429 : 401));
  checks.push({ name: "account-quota-across-addresses", statuses: account });

  const chain = [];
  for (let i = 1; i <= 11; i++)
    chain.push(await attempt(url, `203.0.113.${i}, 198.51.100.200`, `chain-${i}`, i === 11 ? 429 : 401));
  checks.push({ name: "forged-leftmost-address-ignored", statuses: chain });
});

await throughProxy("", async (url) => {
  const untrusted = [];
  for (let i = 1; i <= 11; i++)
    untrusted.push(await attempt(url, `192.0.2.${i}`, `untrusted-${i}`, i === 11 ? 429 : 401));
  checks.push({ name: "untrusted-browser-cannot-rotate-quota", statuses: untrusted });
});

console.log(JSON.stringify({ checks, requestCount: 45 }, null, 2));
