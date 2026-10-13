# PDF delivery map and isolated fixtures

P2-02, 8 October 2026. Source/configuration mapping and isolated fixtures are complete. This prepares the [selected design](P2-01_PRIVATE_PDF_DESIGN.md); it does not prove the new gate or close live R2 access. Account-side origin/cache inventory remains an explicit cutover prerequisite.

## Public delivery paths

Paths below are relative to `apps/web/src` unless stated otherwise.

| Surface | Current source and behavior | Required change / task |
|---|---|---|
| Catalogue and SSR data | `lib/db/public-repository.ts`, `lib/db/mappers.ts`, `lib/api.ts`, `lib/embargo.ts`; home/browse/search/bookmarks/issue/read wrappers serialize asset URLs | P2-03: preserve internal storage locators, emit stable application routes; authorization must query current eligibility independently of cached data |
| Public APIs | `app/api/issues/route.ts`, `issues/shelf`, `issues/bookmarks`, `issues/[id]`, `search`, `magazines`; search also uses `lib/db/search-repository.ts` | P2-03: inspect every response shape, including magazine covers and nested magazine data; no signatures in cacheable JSON |
| Main reader | `app/read/[id]/page.tsx`, `reader-issue-context.tsx`; react-pdf reads `issue.pdfUrl` | P2-04: access resolution, range/expiry handling, bounded retry and preserved reading state |
| Homepage previews | `components/home/animated-bookshelf.tsx` calls PDF.js directly; `this-month-featured.tsx` passes URL to `slide-reader.tsx` | P2-04: both embedded readers must use gated access; do not fix only the full reader |
| Issue page count | `app/issue/[id]/issue-detail-client.tsx` opens the PDF when metadata is missing | P2-04: gated fetch or trusted stored page count; no raw-origin fallback |
| Single downloads | `app/api/issues/[id]/download/route.ts` checks embargo, increments counter and redirects to stored URL | P2-03/04: fresh authorization, short-lived signed GET, attachment filename and no-store redirect; avoid counting HEAD/renewal as downloads |
| Bulk ZIPs | `app/browse/browse-client.tsx`, `app/bookmarks/bookmarks-client.tsx`, `lib/download-zip.ts` fetch PDF URLs in-browser | P2-04: fresh access per queued file, expired-grant retry, unchanged 50 MiB/concurrency limits; skip newly restricted/draft issues |
| Cover display | Home cards, subscriber editions, issue cards/list views, search results, issue detail, reader and continue-reading FAB use Image/img URLs | P2-03/04: issue-cover routes, plus magazine-cover handling; embargoed published covers remain visible; drafts require admin |
| Cover sharing | `lib/share-issue.ts` fetches cover bytes for sharing/copy | P2-04: same permitted cover route; graceful fallback on missing cover |
| Saved reading state | `lib/reading-history.ts`, reader localStorage, home recent-reading list and `components/layout/continue-reading-fab.tsx` retain old cover URL snapshots | P2-04: derive fresh cover route from saved issue ID or refresh metadata; retain position/preferences, never persist grants |
| Local file route | `app/api/pdf/[...path]/route.ts` reads workspace PDFs without auth; lexical prefix containment; one-day public cache | P2-06: disable in production or replace with authorized safe containment; remove bypass and cached responses under control |

Magazine covers are distinct from issue covers: provide a magazine-ID route for a valid catalogue magazine cover, not an arbitrary key endpoint. Validate image bytes/type. An absent cover remains a placeholder. This is a refinement to P2-01's cover-route design, not a new public PDF exception.

## Admin and background paths

| Surface | Source / current dependency | Required change / task |
|---|---|---|
| Admin issue download and cover regeneration | `app/admin/(dashboard)/issues/issues-client.tsx` fetches `issue.pdf_url` and calls `renderPdfFirstPageCoverFromUrl`; `lib/pdf-cover-client.ts` | P2-05: authenticated catalogue preview route; retain filename/source identity separately |
| Indexing preview | `app/admin/(dashboard)/indexing/[id]/preview/page.tsx`, PDF preview component | P2-05: authenticated GET/HEAD/ranges; no public bearer grant for restricted previews |
| Indexing review provenance | `indexing/workspace.tsx`, `indexing/page-review-editor.tsx`, `api/admin/indexing/review`, workspace/review repositories compare stored `pdf_url` and source hash | P2-05: keep locator/hash as identity fields; add separate preview URL, never replace provenance with an expiring URL |
| Storage open links | `app/admin/(dashboard)/storage/storage-client.tsx` opens `obj.publicUrl`; `lib/db/admin-repository.ts` constructs links | P2-05: linked assets open through authenticated issue routes. Disable unlinked-object open links in this scoped fix; listing/deletion can remain authenticated. Do not add an arbitrary public object gateway |
| New/bulk upload | `issues/new/page.tsx`, `api/admin/upload/presign`, `api/admin/upload/route.ts`; presigned PUT and stored `publicUrl`; missing cover path fetches direct PDF URL | P2-05: distinguish locator from delivery; verify private object before DB commit; use authenticated reads for missing-cover generation |
| PDF/cover replacement | `api/admin/issues/[id]/pdf`, `.../cover`; private writes return public URL; PDF replacement sends multipart through website | P2-05: direct authenticated upload for large replacement, unique revision keys and verified completion; map returned delivery fields correctly |
| Thumbnail generation | `api/admin/thumbnails`, `lib/pdf-thumbnail.ts`, `lib/crop-cover-spread.ts` | P2-05: S3 reads and private writes; cover bytes served only through appropriate image route |
| Durable worker | `lib/indexing-worker.ts`, `scripts/indexing-worker.cjs`, `.github/workflows/search-indexing.yml` | P2-05: scoped R2 read credentials and source validation; deploy workflow separately from web; preserve source hashes/checkpoints |
| Alternate extraction helper | `lib/search-indexer.ts:indexIssueFromUrl` still fetches a URL; main reindex routes enqueue jobs | P2-05: adapt or retire helper so it cannot become a remaining public-fetch path; update its callers/tests |
| Operators (historical baseline) | Original R2 smoke test and extraction-pilot/rebuild tools used public/stored PDF URLs | P2-05 replaced reads with authenticated access; the pilot tools were privately archived on 13 October. Current R2 smoke test still needs explicit write approval; current worker/rebuild guides are authoritative |

## Origins and cache inventory

| Layer | Evidence available locally | Required treatment |
|---|---|---|
| R2 public origin | `https://pub-3ed08073797148cf93d772ea1eb341f9.r2.dev` in local current configuration, Next image allowlist and worker fallback | Disable public access at cutover; verify known restricted URLs deny GET/HEAD/range; keep exact origin only as an internal locator alias |
| Former configured origins | `R2_LEGACY_PUBLIC_BASE_URLS` unset locally on this check | Does not prove no other hostname exists; inspect Vercel/GitHub receiving configuration and Cloudflare attached domains |
| S3 endpoint | Derived from private `R2_ACCOUNT_ID`; authenticated object API, future public signed reads | Keep credentials server-side; unsigned object requests must fail. Do not expose account credentials in evidence |
| Current website | `https://aim-archive.vercel.app`; local development `http://localhost:3000` | Check CORS per actual browser origin; add only explicitly used staging origins. Future Society domain remains deferred |
| Cloudflare domains/rules/cache | Not accessible from source configuration alone | Society bucket administrator must enumerate attached domains, r2.dev status, CORS and cache/access rules before P2-08/09. No claim of complete remote discovery |
| Repository caches | `public-repository.ts`: list/facets 10 s; lookup/shelf 30 s; detail 60 s. Admin identity 30 s, facets 10 s, storage 5 s | Fresh gate bypasses public metadata caches; evaluate admin removal/session revocation against identity cache, rather than promising instant revocation |
| Next page/data cache | Home `unstable_cache` 30 s; public page wrappers commonly revalidate 60 s; `public-cache.ts` clears repositories/tags/paths | Cache stable routes only, never grants; invalidate on publication/reference changes |
| Public API CDN cache | Issues/search 60 s + stale 300 s; shelf 30 + stale 60; bookmarks browser 60/CDN 300 + stale 3600; magazines 600 + stale 3600; issue detail no-store | Stale metadata cannot grant access; test gate independently after unpublishing |
| Image optimizer | Next Image plus explicit old R2 hostname in `next.config.ts` | Remove old-origin dependency; bypass shared optimization for private covers; account for old optimized image copies and invalidate where controlled |
| Object/browser PDF cache | Server R2 uploads set public max-age 300; direct PUT/existing metadata may differ; local PDF route max-age 86400 | Enforce/verify private no-store for PDF delivery. Do not assume changing authorization response headers changes R2 body headers |
| Browser document memory | PDF.js retains loaded bytes, range requests and document tasks; ZIP builder holds blobs | Reauthorize new grants and preserve reading state. Already downloaded bytes cannot be revoked |
| Static PDF.js worker | `/pdf.worker-4.8.69.min.mjs` immutable one-year cache | Keep unchanged: executable reader library, not archive PDF content |

No service-worker asset was found in `apps/web/public`. This does not replace checking deployed browser/network behavior during P2-08.

## Reusable isolated fixtures

`scripts/fixtures/pdf-access.cjs` exports six synthetic catalogue records, an in-memory object map of one-page PDFs and PNG covers, fixed clock `2026-10-08T09:00:00Z`, three exact IST boundary instants, and adversarial IDs/locators/ranges. Only `.test`/`.invalid` fixture hosts are used. It does not load environment files, contact services or persist data.

| Fixture | Anonymous PDF | Anonymous cover | Active admin PDF |
|---|---|---|---|
| Published January 2020 | Allow | Allow | Allow |
| Published January 2026 | Deny | Allow | Allow |
| Draft February 2020 | Deny | Deny | Allow |
| Draft February 2026 | Deny | Deny | Allow |
| Published October 2021 | Allow at fixed clock | Allow | Allow |
| Published November 2021 | Deny at fixed clock | Allow | Allow |

October 2021 must change from denied to allowed at `2026-09-30T18:30:00.000Z`. Unknown IDs and unauthenticated admin access must deny. Host spoofing, unsupported schemes, invalid encoding and traversal-like locators are rejection inputs for the future gate, not assertions that today's helpers reject every one.

Validation command: `node scripts/test-pdf-access-fixtures.cjs`. **Passed 8 October:** inserted all six records using the real initial schema in SQLite `:memory:`, checked integrity/FKs, parsed and extracted text from all six PDFs using installed PDF.js, decoded all six PNGs with canvas, checked all three boundary instants against `embargo.ts`, and exercised disposable unpublishing/replacement rows. Global fetch is denied. No production data or environment files used.

This validates the fixture package, not the unimplemented authorization layer. P2-03/07 must consume these fixtures to test actual route responses and signer behavior, expired/tampered grants, no-store headers, valid/invalid ranges, missing objects, stale caches, admin removal, revoked publication, replaced sources and bounded retry. P2-08/09 add real browser/staging/origin evidence. No new full web build is needed for this fixture/documentation-only change.
