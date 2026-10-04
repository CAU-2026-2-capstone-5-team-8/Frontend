# Expo Router query decoder compatibility

Expo Router 57.0.24 uses the CommonJS named API of query-string 7.1.3. Its decoder
range otherwise resolves to decode-uri-component 0.2.2, affected by
[GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr).

The scoped npm override selects the patched decoder 0.5.0. That package is ESM,
so this patch reads its default export while retaining query-string's existing
CommonJS API for Expo Router. Overriding query-string to its current ESM major
would break Router's named `parse`/`stringify` imports.

`postinstall` applies the patch with `--error-on-fail` before generating KaTeX
styles. Keep `patches/` available before `npm ci`, including in Docker builds.
Do not install with `--ignore-scripts`. Development/build dependencies are
required in the build stage; the static serving image contains no node_modules.

Run `npm run test:query-decoding` to exercise the actual Router dependency's
Korean/duplicate query parsing, serialization, and bounded malformed-input
handling. Also run the root `npm run check` and `npm run build:web` after upgrades.
Remove the override and this patch together when a compatible Expo Router release
uses a fixed decoder natively, then rerun those checks and browser navigation.
