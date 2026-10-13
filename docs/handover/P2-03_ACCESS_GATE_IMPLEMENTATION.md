# PDF access gate implementation and verification

Completed locally, 8 October 2026. P2-03 implements the new delivery endpoints and their authorization boundary. It is not deployed, and existing browser/download/worker paths still require P2-04/05 integration. Live public R2 access is unchanged.

## Implemented endpoints

| Route | Behavior |
|---|---|
| `GET /api/issues/[id]/access` | Returns a five-minute signed GET URL and expiry after fresh published/embargo checks |
| `GET /api/issues/[id]/pdf` | Same checks, then a no-store 307 redirect to signed GET access |
| `HEAD /api/issues/[id]/pdf` | Same checks, then a method-specific signed HEAD redirect |
| `GET/HEAD /api/admin/issues/[id]/pdf` | Authenticated private streaming/metadata for catalogue PDFs, including drafts and recent editions; existing replacement POST retained |

`pdf-access.ts` validates catalogue IDs, publication/date eligibility, configured storage locators and single byte ranges. Locator validation rejects unsupported origins, credentials, fragments, unexpected query parameters, malformed/double encodings, control characters and dot/slash traversal segments. Only PDF keys resolved from server-owned database records are eligible; request query parameters cannot choose a key.

`pdf-delivery.ts` reads catalogue rows directly, bypassing public metadata caches. It verifies object metadata and rechecks the catalogue after storage I/O to detect unpublishing or replacement during authorization. Admin delivery calls `verifyAdmin()` and queries current admin membership directly, avoiding the existing identity cache when confirming removal. Errors do not expose credentials, object keys or upstream messages.

Application success/error responses carry private/no-store browser and CDN directives, no-referrer and nosniff. Signed GETs include response cache/type/disposition overrides. The maintained `@aws-sdk/s3-request-presigner` is pinned to 3.1045.0 alongside the current S3 client release. No custom read-signing cryptography was introduced.

Admin GET supports full files, one explicit/open-ended/suffix range, 206 and 416. HEAD returns metadata without fetching bytes. A mismatched If-Range falls back to full delivery. Reads use the observed ETag as If-Match and verify returned length/type/ETag/range before streaming. Upstream requests carry cancellation/timeout signals; the SDK WebStream bridge forwards consumer cancellation. Full PDFs are not buffered by the route.

The five-minute bearer lifetime and already-downloaded-byte limitations in [P2-01](P2-01_PRIVATE_PDF_DESIGN.md) still apply. Rechecks reduce request races; they do not provide an atomic transaction spanning database, storage and subsequent browser requests.

## Verification

- `node scripts/test-pdf-delivery.cjs` passed. Uses the actual handler, real initial SQLite schema in memory, synthetic storage responses and the real SDK signer with fake credentials. Checks all six fixture access states, fresh catalogue reads, removed admin denial, unpublishing/replacement during authorization, ID/locator attacks, missing objects, invalid MIME type, full PDF bytes, ranges, HEAD, cancellation and safe failure/cache responses. Actual route exports are exercised as well.
- An independent SigV4 verifier in that test validates generated GET/HEAD signatures, rejects changed object/method/expiry parameters, and checks the five-minute expiry boundary. This is local cryptographic verification, not an assertion that live R2/browser CORS has been tested.
- `node scripts/test-asset-locations.cjs` passed existing configured-origin/alias regression checks.
- Web `pnpm.cmd exec tsc --noEmit` and ESLint on changed source passed.
- Web `pnpm.cmd build` passed compilation, lint/types, all 43 static pages and build tracing; new endpoints appear in the production route inventory.
- Scoped Git whitespace checks passed. An unrelated pnpm rewrite of the Expo Bunyan engine entry was reverted; earlier integration cleanup remains intact.

R2's documented GET conditional/range support informed the implementation; actual response overrides, range semantics and browser CORS must still be verified against the receiving configuration during P2-07/08. [Cloudflare S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/), [S3 GetObject semantics](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html).

## Remaining integration and release gates

P2-04 must wire public serializers/readers, covers, downloads and ZIP renewal to these endpoints. The existing single-download redirect and public metadata still use old delivery paths until then; do not claim those paths are secured by merely adding the new routes. Cover delivery routes remain part of that integration, including magazine covers.

P2-05 must wire authenticated admin previews and maintenance, large-file replacement and private worker/operator reads. P2-06 must close the local workspace PDF route. P2-07 expands integrated regression coverage; P2-08/09 rehearse rollback, deploy and deny all public origins. Do not disable live bucket access until these dependent paths are ready. No deployment, workflow dispatch, database/object mutation, credential rotation or remote account change was performed for this task.
