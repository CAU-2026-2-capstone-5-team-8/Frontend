import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import * as covers from "../scripts/prepare-open-library-covers.mjs";

const book = {
  book_id: "isbn13:9780130319999",
  isbn_13: "9780130319999",
  isbn_10: "0130319996",
};
const source = {
  book_id: book.book_id,
  provider: "open_library",
  source_type: "metadata_api",
  external_id: "/books/OL9285777M",
  url: "https://openlibrary.org/books/OL9285777M",
};
const input = (
  edition = {
    key: "/books/OL9285777M",
    isbn_13: ["9780130319999"],
    covers: [-1, 82467],
  },
) => ({
  books: [book],
  sources: [source],
  raw: { response: { edition_details: { "/books/OL9285777M": edition } } },
});

test("exact edition cover metadata yields an ID URL and guarded SQL, not an ISBN guess", () => {
  assert.equal(typeof covers.prepareCovers, "function");
  const result = covers.prepareCovers(input());
  assert.equal(
    result.records[0].coverUrl,
    "https://covers.openlibrary.org/b/id/82467-L.jpg?default=false",
  );
  assert.equal(result.records[0].checkedStatus, "metadata-only");
  const sql = covers.renderSql(result);
  assert.match(sql, /BEGIN;/);
  assert.match(sql, /cover_url IS NULL/);
  assert.match(sql, /RAISE EXCEPTION/);
  assert.match(sql, /ml_book_id/);
  assert.match(sql, /COMMIT;/);
});
test("mismatched ISBN and conflicting edition identities cannot produce images", () => {
  assert.throws(
    () =>
      covers.prepareCovers(
        input({
          key: "/books/OL9285777M",
          isbn_13: ["9780471694663"],
          covers: [82467],
        }),
      ),
    /ISBN/,
  );
  assert.throws(
    () =>
      covers.prepareCovers(
        input({
          key: "/books/OTHER",
          isbn_13: ["9780130319999"],
          covers: [82467],
        }),
      ),
    /edition/,
  );
  const data = input();
  data.sources.push({ ...source, external_id: "/books/OL999M" });
  assert.throws(() => covers.prepareCovers(data), /conflicting/);
});
test("missing metadata and nonpositive cover IDs stay explicitly missing", () => {
  for (const edition of [
    undefined,
    { key: "/books/OL9285777M", isbn_10: ["0130319996"], covers: [-1, 0] },
  ]) {
    const data = input();
    data.raw.response.edition_details = edition
      ? { "/books/OL9285777M": edition }
      : {};
    const result = covers.prepareCovers(data);
    assert.equal(result.records.length, 0);
    assert.equal(result.missing.length, 1);
  }
});

test("an unrelated canonical ISBN10 cannot make a different ISBN13 match", () => {
  const data = input({
    key: "/books/OL9285777M",
    isbn_10: ["0471694665"],
    covers: [82467],
  });
  data.books = [{ ...book, isbn_10: "0471694665" }];
  assert.throws(() => covers.prepareCovers(data), /ISBN/);
});

test("work metadata is never substituted or mistaken for a competing edition", () => {
  const data = input();
  data.sources.push({
    ...source,
    external_id: "/works/OL99W",
    url: "https://openlibrary.org/works/OL99W.json",
  });
  assert.equal(covers.prepareCovers(data).records.length, 1);
  data.sources.shift();
  assert.equal(covers.prepareCovers(data).records.length, 0);
});

test("offline file preparation pins exact input bytes and preserves prior review output", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "bookmatch-covers-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const data = input();
  const booksPath = join(dir, "books.jsonl"),
    sourcesPath = join(dir, "sources.jsonl"),
    rawPath = join(dir, "raw.json");
  const bookBytes = JSON.stringify(book) + "\n";
  await writeFile(booksPath, bookBytes);
  await writeFile(sourcesPath, JSON.stringify(source) + "\n");
  await writeFile(rawPath, JSON.stringify(data.raw));
  const options = {
    booksPath,
    sourcesPath,
    rawPath,
    outputDir: join(dir, "packet"),
  };
  const result = await covers.prepareFiles(options);
  assert.equal(
    result.inputs.books.sha256,
    createHash("sha256").update(bookBytes).digest("hex"),
  );
  const prior = await readFile(join(options.outputDir, "covers.json"), "utf8");
  assert.deepEqual(JSON.parse(prior), result);
  await assert.rejects(covers.prepareFiles(options), { code: "EEXIST" });
  assert.equal(
    await readFile(join(options.outputDir, "covers.json"), "utf8"),
    prior,
  );
});
