// Offline only: canonical edition joins, no network calls and no database connection.
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

function validIsbnPair(book) {
  const isbn = book.isbn_13;
  if (
    !/^\d{13}$/.test(isbn) ||
    [...isbn].reduce((sum, n, i) => sum + Number(n) * (i % 2 ? 3 : 1), 0) %
      10 !==
      0
  )
    return false;
  if (!book.isbn_10) return true;
  const ten = book.isbn_10;
  return (
    /^\d{9}[\dX]$/.test(ten) &&
    [...ten].reduce(
      (sum, n, i) => sum + (n === "X" ? 10 : Number(n)) * (10 - i),
      0,
    ) %
      11 ===
      0 &&
    isbn.slice(0, 12) === "978" + ten.slice(0, 9)
  );
}

export function prepareCovers({ books, sources, raw }) {
  const seen = new Set();
  const records = [],
    missing = [];
  for (const book of [...books].sort((a, b) =>
    a.book_id.localeCompare(b.book_id),
  )) {
    if (seen.has(book.book_id)) throw Error("duplicate canonical book");
    seen.add(book.book_id);
    if (
      !/^isbn13:\d{13}$/.test(book.book_id) ||
      book.book_id !== `isbn13:${book.isbn_13}` ||
      !validIsbnPair(book)
    )
      throw Error("invalid canonical ISBN identity");
    const matches = sources.filter(
      (s) =>
        s.book_id === book.book_id &&
        s.provider === "open_library" &&
        s.source_type === "metadata_api" &&
        /^\/books\/OL\d+M$/.test(s.external_id),
    );
    const editions = [...new Set(matches.map((s) => s.external_id))];
    if (editions.length > 1)
      throw Error(`conflicting edition sources: ${book.book_id}`);
    const editionId = editions[0];
    const edition = raw.response?.edition_details?.[editionId];
    if (!edition) {
      missing.push({ bookId: book.book_id, reason: "no-edition-metadata" });
      continue;
    }
    if (!/^\/books\/OL\d+M$/.test(editionId) || edition.key !== editionId)
      throw Error(`edition identity mismatch: ${book.book_id}`);
    if (!(
      edition.isbn_13?.includes(book.isbn_13) ||
      (book.isbn_10 && edition.isbn_10?.includes(book.isbn_10))
    ))
      throw Error(`ISBN mismatch: ${book.book_id}`);
    const sourceUrl = `https://openlibrary.org${editionId}`;
    if (
      matches.some((s) => s.url !== sourceUrl && s.url !== sourceUrl + ".json")
    )
      throw Error(`edition source URL mismatch: ${book.book_id}`);
    const coverIds = [
      ...new Set(
        (edition.covers || []).filter(
          (id) => Number.isSafeInteger(id) && id > 0,
        ),
      ),
    ];
    if (!coverIds.length) {
      missing.push({ bookId: book.book_id, reason: "no-positive-cover-id" });
      continue;
    }
    records.push({
      bookId: book.book_id,
      isbn13: book.isbn_13,
      editionId,
      sourceUrl,
      observedCoverIds: coverIds,
      selectedCoverId: coverIds[0],
      coverUrl: `https://covers.openlibrary.org/b/id/${coverIds[0]}-L.jpg?default=false`,
      checkedStatus: "metadata-only",
    });
  }
  return {
    version: "open-library-cover-sidecar-v1",
    selectionPolicy: "first-positive-cover-id-in-exact-edition-record",
    apiDocumentation: "https://openlibrary.org/dev/docs/api/covers",
    records,
    missing,
  };
}

const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
export function renderSql(result) {
  const blocks = result.records
    .map(
      (row) => `
DO $cover$
DECLARE matched integer; existing backend.book%ROWTYPE;
BEGIN
  SELECT count(*) INTO matched FROM backend.book WHERE ml_book_id=${quote(row.bookId)} AND isbn=${quote(row.isbn13)};
  IF matched <> 1 THEN RAISE EXCEPTION 'Expected exactly one matching catalog book: ${row.bookId}'; END IF;
  SELECT * INTO existing FROM backend.book WHERE ml_book_id=${quote(row.bookId)} AND isbn=${quote(row.isbn13)};
  IF existing.cover_url IS NOT NULL THEN
    IF existing.cover_url IS DISTINCT FROM ${quote(row.coverUrl)} OR existing.cover_source_url IS DISTINCT FROM ${quote(row.sourceUrl)} THEN
      RAISE EXCEPTION 'Existing cover conflict: ${row.bookId}';
    END IF;
  ELSE
    UPDATE backend.book SET cover_url=${quote(row.coverUrl)}, cover_source_url=${quote(row.sourceUrl)}, cover_checked_at=CURRENT_TIMESTAMP
    WHERE ml_book_id=${quote(row.bookId)} AND isbn=${quote(row.isbn13)} AND cover_url IS NULL;
  END IF;
END $cover$;`,
    )
    .join("\n");
  return `-- ADMIN REVIEW REQUIRED: metadata-only edition/ISBN check, not visual or rights clearance.\n-- Generated offline. This file does not execute itself. Run with psql -v ON_ERROR_STOP=1 only after review.\nBEGIN;\nLOCK TABLE backend.book IN SHARE ROW EXCLUSIVE MODE;\n${blocks}\nCOMMIT;\n`;
}

export async function prepareFiles({
  booksPath,
  sourcesPath,
  rawPath,
  outputDir,
}) {
  const paths = { books: booksPath, sources: sourcesPath, raw: rawPath };
  const bytes = Object.fromEntries(
    await Promise.all(
      Object.entries(paths).map(async ([key, path]) => [
        key,
        await readFile(path),
      ]),
    ),
  );
  const jsonl = (buffer) =>
    buffer
      .toString("utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  const result = prepareCovers({
    books: jsonl(bytes.books),
    sources: jsonl(bytes.sources),
    raw: JSON.parse(bytes.raw.toString("utf8")),
  });
  result.inputs = Object.fromEntries(
    Object.entries(bytes).map(([key, content]) => [
      key,
      { sha256: createHash("sha256").update(content).digest("hex") },
    ]),
  );
  await mkdir(outputDir, { recursive: true });
  // Exclusive writes preserve any prior review packet instead of replacing it.
  await writeFile(
    join(outputDir, "covers.json"),
    JSON.stringify(result, null, 2) + "\n",
    { flag: "wx" },
  );
  await writeFile(join(outputDir, "covers.sql"), renderSql(result), {
    flag: "wx",
  });
  return result;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  if (args.length !== 4)
    throw Error(
      "Usage: node prepare-open-library-covers.mjs BOOKS.jsonl SOURCES.jsonl RAW.json OUTPUT_DIRECTORY (offline only)",
    );
  const result = await prepareFiles({
    booksPath: args[0],
    sourcesPath: args[1],
    rawPath: args[2],
    outputDir: args[3],
  });
  console.log(
    JSON.stringify({
      records: result.records.length,
      missing: result.missing.length,
      checkedStatus: "metadata-only",
      databaseModified: false,
    }),
  );
}
