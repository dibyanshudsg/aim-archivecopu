# AIM Archive DigitalOcean migration decision and plan

Prepared 8 October 2026 for Sri Aurobindo Society's IT team. No migration, DNS change, purchase, deployment or account transfer is authorized or performed by this document. The current database is **Turso/libSQL**; PDFs and covers are **Cloudflare R2** objects; the website is on **Vercel**; indexing runs manually on **GitHub Actions**.

Moving the website to DigitalOcean does not require moving its database or object storage. Choose each component deliberately after the receiving team confirms its operational standards. First resolve the access-control, backup and reproducibility findings in the [handover assessment](HANDOVER_ASSESSMENT_2026-10-08.md).

## Hosting choices

| Option | What changes | Implication |
|---|---|---|
| Transfer current services | Society takes ownership of current hosting, Turso, R2 and repository | Lowest application migration risk if the Society accepts these providers |
| Move web hosting first | Next.js runs on a Society DigitalOcean server; retain Turso/R2 and initially GitHub worker | Recommended staged approach if DigitalOcean web hosting is required; prove Linux deployment separately |
| Self-host compatible database | Run a verified libSQL/SQLite-compatible configuration on persistent DigitalOcean storage | Less SQL rewriting, but Society owns backup, recovery, patching, locking, availability and capacity; not equivalent to managed Turso |
| Adopt managed PostgreSQL/MySQL | Port repository/schema/search/worker integration and migrate data | A separate engineering project; not a connection-string change |
| Move R2 to Spaces | Copy objects and adapt storage implementation | Separate from database migration; requires endpoint, region, signing and delivery changes |

DigitalOcean's managed database documentation lists PostgreSQL, MySQL and other engines, not a managed Turso/libSQL equivalent. Do not order a managed PostgreSQL database and assume this application can connect unchanged. [DigitalOcean database reference](https://docs.digitalocean.com/reference/api/reference/databases/).

## Questions for the receiving IT team

Confirm the target hosting product (existing Droplet, App Platform or another arrangement), Linux distribution, supported Node runtime, process/container standards, database preference, object-storage policy, backup location, DNS control and budget owner. Agree availability, recovery time/data-loss targets, expected catalogue growth and who operates indexing. Confirm whether external Turso/R2 services are acceptable under Society ownership.

No fixed server size or cost is quoted here. PDF rendering/OCR consumes resources differently from serving the website; measure representative jobs and peak memory before sizing or co-locating services.

## Website migration work

1. Build an identifiable release from the Society's repository on Linux with the frozen lockfile. Verify native canvas/PDF/OCR dependencies and the four configured Google fonts or an approved local-font equivalent.
2. Deploy a full Node application with `next start`, reverse proxy, TLS, supervised restart and private configuration. Keep port 3000 behind the proxy. Next.js documents self-hosting and recommends a reverse proxy. [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting).
3. Provide writable runtime/cache directories and graceful shutdown. Decide cache coordination if using multiple app instances; current in-process caches/rate limiting cannot become shared by adding replicas.
4. Set the final app URL, image-host configuration, asset CORS and proxy headers. Verify correct origin checks, Secure cookies, streaming, request limits, timeouts and Next `after()` analytics behavior on the target host.
5. Remove/disable the unrestricted local PDF route; do not deploy source-content batches, private evidence or local secrets in the public application tree.
6. Verify Home, Browse, Search, Bookmarks, issue detail, Reader, preview, downloads, ZIPs and all required admin workflows on staging. Include real browser PDF rendering and replacement freshness.
7. Add health checks, logs, error alerts, backup monitoring and rollback instructions owned by the IT team.

## Database migration work

### Retaining Turso

Transfer or recreate the database in a Society-controlled account as supported by the chosen account arrangement. Rotate application and worker credentials, update secrets, and verify both services against the intended target. Preserve a consistent backup and isolated restore evidence regardless of provider.

### Using self-hosted compatible storage

The local application supports `file:` libSQL databases, but this is not a production deployment certification. Validate FTS5 trigram/JSON support, transactions, foreign keys, concurrency and crash recovery with the actual selected runtime. Use persistent storage and an appropriate consistent backup mechanism; a blind copy of a live database file is insufficient when write-ahead logs are active.

A GitHub-hosted worker cannot access a database file on a Droplet. Either host the worker where that file is safely accessible or expose a secured compatible database service; never place a SQLite database on casual shared network storage to solve this. Rework Admin dispatch accordingly and preserve manual-only operation. Do not enable the sample continuously running systemd service unchanged.

### Using PostgreSQL or MySQL

Port all repositories and the worker queue/probe paths, including:

- Parameter syntax, booleans, timestamps, JSON topic queries, upserts and transactions.
- Schema constraints/cascades and preservation of IDs, source URLs, page numbers and counters.
- FTS5 trigram replacement with equivalent tested substring, literal punctuation, Unicode and ranking behavior. Do not silently change search semantics.
- Job leases, concurrent claims, reservation/admission, retries, checkpoints, source hashes and immutable page reviews.
- Capability discovery and migration tracking.

Any PostgreSQL migration needs a new schema that includes navigation, durable indexing and current search. The Python GitHub queue probe also talks to the current database service and must be adapted.

Create a purpose-built export/import, compare every application table and record identity, verify search parity, exercise failure/rollback/concurrency tests, and measure performance. The SQLite backup is not an automatic database-engine conversion.

## Object storage migration work

Spaces exposes an S3-compatible API with partial S3 feature support; test the operations used here rather than assuming exact R2 behavior. [Spaces compatibility](https://docs.digitalocean.com/products/spaces/reference/s3-compatibility/).

The current `r2-client.ts` hard-codes a Cloudflare endpoint and the signing region `auto`. The browser PUT signer, client construction, URL/key handling, bucket naming validation, CORS and image configuration require adaptation. Merely changing `R2_PUBLIC_BASE_URL` does not migrate writes or signatures.

Copy all objects with a manifest, checksum them, verify MIME types, ranges and replacement cache behavior, and retain rollback copies. Separate public covers from private restricted PDFs. Establish storage-level authorization before exposing the replacement origin.

Keep existing source URL/fingerprint provenance in mind: indexing reviews are tied to the source. Prefer a tested mapping/alias strategy or deliberate provenance migration; blindly rewriting PDF URLs can invalidate reviews or force unnecessary reindexing. Ensure replacement and deletion resolve the right object at both old and new origins.

## Cutover and rollback sequence

1. Agree ownership, architecture, budget, change window, acceptance checks and rollback triggers. Resolve all critical findings and make the release reproducible.
2. Capture current database and object backups; restore into isolated staging and compare catalogue, page text, reviews, configuration and checksums.
3. Build and test the selected target using Society credentials. Keep staging indexing and mutations isolated from production.
4. Before final copy, stop new admin writes and indexing claims, let active jobs drain or stop safely, and account for analytics writes too. Define one authoritative database writer during cutover.
5. Take the final consistent database snapshot and final object delta. Record counts, checksums, migration state, source release and timestamp.
6. Apply the final data/configuration, verify restricted-origin denial and public reading/search, then switch app/asset routing and DNS if approved. Old public asset URLs must not continue exposing restricted files.
7. Perform the controlled admin fixture test and Society-led acceptance checks. Watch errors, latency, storage failures and queue state through an agreed observation period.
8. For rollback, return to the identified source release and routing, then reconcile any writes made after cutover. Simply switching DNS back after divergent writes risks data loss. Keep old service data preserved and disable conflicting writers.
9. After documented acceptance and retention approval, retire old services and revoke personal access. Do not delete old buckets/backups during initial cutover.

## Required completion record

Record the chosen option; Society service owners; private secret locations; target deployment and release tag; database engine/version and migration state; object manifest; restore results; acceptance tests; DNS/TLS details; alert contacts; actual costs/limits; rollback procedure; retention deadline; and the effective transfer date. These values depend on the receiving team's decisions and have not been invented here.
