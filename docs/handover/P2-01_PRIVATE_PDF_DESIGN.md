# Private PDF delivery design

Selected engineering design, 8 October 2026, for P2-01. This is the implementation baseline, not a deployed security fix. P2-02 through P2-09 remain open.

Keep the current Society R2 bucket and object keys. Make the entire bucket private at cutover. Authorize public PDF reads through the website, then issue short-lived R2 links for eligible editions. Serve restricted admin previews through an authenticated streaming route. Serve covers through separate catalogue-based image routes. No new domain, paid service, bucket migration or database migration is required by this design.

## Options and selection

| Option | Benefit | Tradeoff | Decision |
|---|---|---|---|
| Stream every PDF through Next.js | Recheck authorization on every new request; same-origin reader | Website handles PDF bandwidth, long connections and range semantics | Use for authenticated admin previews, not normal public PDF traffic |
| Authorize and issue temporary R2 links | Direct storage delivery; small authorization responses; portable web hosting | Links are bearer access until expiry; reader renewal and CORS needed | Selected for public released PDFs |
| Introduce a Cloudflare Worker gateway | Dedicated file gateway with request-level access controls | Another deployment, configuration and operating responsibility | Defer; reconsider if measured traffic or stricter revocation needs justify it |

Vercel documents a 4.5 MB ordinary function payload limit, but streaming responses can bypass the response-size limit. Streaming remains a valid option, not an impossibility; duration and traffic still need testing. Its guidance recommends direct storage delivery for large files. [Function limits](https://vercel.com/docs/functions/limitations), [streaming and direct-delivery guidance](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions).

R2 presigned links grant an operation on one object, are reusable bearer links until expiry, and use the S3 endpoint rather than a custom domain. [Cloudflare presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

## Access contract

| Caller and object | Required decision |
|---|---|
| Anonymous, published issue at least 60 months old | Grant temporary PDF read access |
| Anonymous, published issue within embargo | Deny PDF access; retain public metadata and cover |
| Anonymous, draft or unknown issue | Deny without disclosing private metadata |
| Authenticated active admin | Allow catalogue-bound previews, including drafts and embargoed editions |
| Indexing worker | Authenticated S3 read for a validated claimed job and its recorded source |

Use `embargo.ts`: release at midnight Asia/Kolkata on the first day of the issue month plus 60 months, regardless of visitor time zone. Validate year/month and fail closed on malformed data. Read current publication state and eligibility at each authorization/renewal; never use a cached public listing as the authority.

Public APIs and server-rendered page data expose stable application delivery URLs for released issues, not raw R2 URLs or expiring signatures. Restricted PDF fields remain null. The server resolves issue ID to the stored asset, validates the configured storage origin and canonical key, and never signs arbitrary client URLs or keys. Reject ambiguous encodings, traversal-like input, unsupported origins and invalid IDs. Do not make cover routes a PDF proxy: only the issue's cover field and verified image types may be returned.

## Public links and reading sessions

Implementation default: five-minute public GET grants, with an explicit expiry in the authorization response. Use the maintained AWS SDK presigner for GET/HEAD rather than extending the custom PUT cryptography. A GET signature is not a HEAD signature; sign methods separately where needed.

The reader requests access on opening and renews after expiry or an expiry-related failure, rechecking eligibility and preserving page, zoom and search state. Avoid periodic full-document reloads while a loaded document remains usable. Test fresh range requests after idle periods, background-tab resume, slow transfers and bounded retries. ZIP workers obtain fresh grants when starting each file; preserve the current 50 MiB ZIP budget and concurrency limit. Downloads retain their own analytics action; reading, HEAD probes and renewal must not increment download counters.

**Revocation limit:** an already issued public grant can authorize new requests until its five-minute expiry even if the issue is unpublished meanwhile. An in-flight transfer or bytes already downloaded may outlive expiry. No fresh grants are issued after eligibility is withdrawn. This bounded behavior is part of this design, not immediate revocation. If immediate request-level revocation becomes a requirement, switch public delivery to a checked streaming gateway before release.

Do not issue browser R2 bearer links for restricted admin previews. Their same-origin streaming endpoint calls `verifyAdmin()` and resolves the catalogue file on each GET/HEAD/range request. Use no-store responses, preserve range/416 semantics, abort upstream reads on disconnect and avoid buffering whole PDFs. An admin can still download or copy a document they are authorized to see; this is access control, not copy protection.

Authorization responses, redirects and PDF responses must use private/no-store cache policy. Override existing object cache metadata through signed response parameters or server response headers as appropriate; verify actual R2 behavior in staging. Exclude signatures from application logs, analytics, persisted bookmarks and error reports. Use a no-referrer policy on delivery surfaces. Never store signed URLs in the database.

Browser R2 CORS must allow the exact active website origins and necessary GET/HEAD/Range behavior, exposing Content-Length, Content-Range, Accept-Ranges and ETag where needed. Preserve the existing authenticated upload requirements. CORS is browser interoperability, not authorization. [R2 CORS configuration](https://developers.cloudflare.com/r2/buckets/cors/).

## Covers and storage identity

Keep PDF and cover bytes in the existing bucket. Separate their application delivery routes rather than creating a public bucket during this fix. Public cover routes require a published issue but do not apply the PDF embargo. Admin-only covers use authenticated routes. Bound image sizes, validate MIME/content and return a placeholder on invalid objects; never fall back to the old public origin. Start with no-store delivery and avoid shared image-optimizer caching for private/draft covers. Any later public-cover caching needs an explicit invalidation policy.

Existing `pdf_url` and `cover_image_url` values remain internal source locators so indexing provenance and object keys are unchanged. Configured former bases remain a strict locator allowlist even after those origins stop serving bytes. Refactor serializers and client asset helpers to return/accept application routes; do not clear `R2_PUBLIC_BASE_URL` while existing repository filters depend on it. Document its temporary legacy naming. Internal source locators must not be confused with browser delivery URLs.

## Admin maintenance and worker compatibility

Current changes required by source inspection:

- `r2-client.ts` and `asset-url.ts`: distinguish stored identity, signing and browser delivery; use private PDF cache policy.
- `db/public-repository.ts`, `db/search-repository.ts`, search API and serializers: emit gated delivery routes and cover routes consistently.
- Reader, homepage slide reader, previews, individual downloads and `download-zip.ts`: resolve/renew access and handle denial without old-origin fallback.
- `indexing-worker.ts` and `pdf-thumbnail.ts`: replace public URL fetches with authenticated S3 reads of validated source keys. Preserve job source/fingerprint checks and stale-result rejection. Never give the worker unrestricted URL fetching as a fallback.
- Admin upload completion, replacement and previews: use private verification/reads. Existing server PDF replacement accepts up to 100 MiB through multipart; adapt large replacement to the authenticated direct-upload flow because browser-to-function payload limits still apply. Use unique keys, validate uploaded size/type/signature, and only then update the reference.
- `.github/workflows/search-indexing.yml`: deploy compatible worker code and supply separately scoped R2 read credentials; thumbnail writes stay with the web/admin credential. Verify scope with Society IT before cutover.
- `/api/pdf/[...path]`: disable in production or replace with the same catalogue authorization and safe path containment; no anonymous workspace-file delivery.

This is an initial design impact map. P2-02 must enumerate every call site, cache, origin and isolated fixture before implementation is marked ready.

## Cutover and verification

Deploy compatible web and worker code before disabling origins. Pause mutations/indexing for the controlled transition; verify private reads, covers and worker access. Disable both r2.dev and every public custom-domain path for this bucket, and purge/deny controlled cached restricted responses. These public access paths are independent. Changing one alone is insufficient. [R2 public access controls](https://developers.cloudflare.com/r2/buckets/public-buckets/).

Test anonymous released/restricted/draft access, GET/HEAD/ranges, expired/tampered links, publication changes, IST boundaries, long reading sessions, ZIPs, admin previews and actual worker extraction. Verify old restricted URLs return no PDF bytes. Rehearse the [secure rollback approach](P1-06_PDF_ACCESS_ROLLBACK.md): keep origins private and use temporary PDF unavailability if no compatible secure release exists.

No production change is complete until deployed browser, CORS, range, cache and origin-denial evidence passes P2-07/08/09. Local tests alone cannot establish these properties.

## Accounts and operating implications

No immediate owner action is needed for local design/fixtures. Before live changes, verify who can manage the Society bucket's CORS, public access, attached domains/cache and scoped tokens. Existing object read access does not establish these administrative permissions. Confirm available receiving GitHub/Vercel configuration access separately.

This design adds authorization/database requests and cover/admin traffic through the website; ordinary public PDF bytes go directly from R2 to readers. It does not establish a fixed cost or guarantee free operation. R2 charges depend on storage and operations, with direct R2 egress currently free; review actual plans/usage before launch. [R2 pricing](https://developers.cloudflare.com/r2/pricing/). A future DigitalOcean web host can retain this delivery design and the same Turso/R2 services.
