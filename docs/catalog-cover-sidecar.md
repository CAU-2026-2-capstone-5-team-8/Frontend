# Offline Open Library cover sidecar

`native/scripts/prepare-open-library-covers.mjs` reads already collected canonical
books/sources and one preserved Open Library raw snapshot. It never contacts a
provider or database. It emits `covers.json` and an administrator-review SQL file;
existing files are not overwritten. Keep output under ignored `native/.local-checks/`.

```sh
node native/scripts/prepare-open-library-covers.mjs BOOKS.jsonl SOURCES.jsonl RAW.json native/.local-checks/cover-review
node --test native/tests/catalogCovers.test.mjs
```

The join requires an exact canonical `sources.external_id` edition key and an
edition ISBN matching the canonical ISBN. ISBN checksums and ISBN10/ISBN13
equivalence are validated. Work-level records, titles, search-result cover guesses,
negative IDs, and absent cover metadata never provide fallback images. Conflicting
edition sources fail the preparation. The first positive ID in the exact edition's
observed `covers` array is selected deterministically; all observed positive IDs
remain in the review JSON.

The [official Covers API](https://openlibrary.org/dev/docs/api/covers) documents
direct image URLs by Cover ID. URLs use the **observed Cover ID**, not an assumed
ISBN image: `https://covers.openlibrary.org/b/id/ID-L.jpg?default=false`.
`default=false` requests a missing-image error instead of a provider blank image.
The app's existing image-error fallback remains necessary. No images are bulk
downloaded or bundled. The provider welcomes a courtesy Open Library link.

JSON includes hashes of exact raw/books/sources bytes, edition/source identities,
selection policy and `checkedStatus: metadata-only`. This means automated metadata
identity checking only: no human visual review, successful image fetch, copyright
ownership, or permission clearance is claimed. Administrators must review the
packet and applicable provider terms before applying SQL to their chosen database.
The database's `cover_checked_at` is assigned only when that administrator executes
the reviewed SQL, not when this generator runs.

SQL runs in one transaction with a table lock, requires exactly one matching
`ml_book_id` **and** `isbn` row for every entry, and fills null cover fields only.
Different existing covers abort the transaction; identical existing covers are
left unchanged. Apply with `psql -v ON_ERROR_STOP=1 -f covers.sql` only after review.
The generator neither activates recommendations nor changes concept profiles.

For the preserved September 23 OS catalog (raw retrieved September 19), preparation
produced 22 metadata-backed cover candidates and 3 explicit missing entries. This
is not new collection, a visual-quality evaluation, or proof that every remote
image is currently available.
