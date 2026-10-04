import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const routerRequire = createRequire(require.resolve('expo-router/package.json'));
const queryStringPath = routerRequire.resolve('query-string');
const queryString = routerRequire('query-string');

test('router CommonJS query API preserves Korean, spaces, repeated keys and serialization', () => {
  assert.deepEqual({ ...queryString.parse('q=%ED%95%9C%EA%B8%80+book&tag=a&tag=b&empty=') }, {
    empty: '', q: '한글 book', tag: ['a', 'b'],
  });
  assert.equal(queryString.stringify({ q: '한글 book', page: 2 }, { sort: false }),
    'q=%ED%95%9C%EA%B8%80%20book&page=2');
  assert.equal(queryString.parse('q=%E0%A4%A').q, '%E0%A4%A');
});

test('malformed percent-encoded query cannot monopolize the decoder', () => {
  // Isolate the vulnerable call: an unfixed recursive decoder must not hang the test runner.
  const child = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const queryString = require(${JSON.stringify(queryStringPath)});
    const input = '%FF'.repeat(2000);
    assert.equal(queryString.parse('q=' + input).q, input);
  `], { encoding: 'utf8', timeout: 3000 });
  assert.equal(child.error, undefined, 'query decoding exceeded the bounded child-process timeout');
  assert.equal(child.status, 0, child.stderr);
});
