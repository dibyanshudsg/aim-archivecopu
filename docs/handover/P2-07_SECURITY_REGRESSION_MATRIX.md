# P2-07 — PDF security regression gate

8 October 2026. Local regression work complete. No deployment, Cloudflare access change, remote database mutation or live origin probe was performed.

## Repeatable local verification

From the repository root, run `pnpm.cmd test:pdf-security` (or `node scripts/test-pdf-security.cjs`). The runner executes nine suites in separate processes, stops on a failure/timeout and returns a failing exit code. It does not load service environment files or initiate a deployment. Tests use synthetic fixtures, isolated databases and mocked storage. Native canvas/PDF dependencies must be installed; use Node 22 as used for verification.

All nine suites passed. After final test additions, the affected public-delivery, signer and origin-checker suites passed again. Only scripts, a package command and documentation changed in P2-07; application source and dependencies did not change, so a new application build was unnecessary. The P2-06 production build remains the latest build evidence.

## Coverage and remaining evidence

| Concern | Local evidence | Hosted requirement |
|---|---|---|
| Catalogue/release states | Six schema-valid released/restricted/draft/boundary fixtures; actual public grant, redirect, attachment and admin handlers across GET/HEAD, anonymous/admin state (96 combinations), with range headers | Repeat on staging fixtures and deployed release |
| Public endpoints cannot gain admin privilege | Admin identity does not grant restricted/draft access on public routes; only authenticated admin route serves them | Verify real session/cookie behavior; broader authentication audit remains Phase 6 |
| Grant authenticity and lifetime | Real SDK signing, independently computed SigV4 verification; modified signature, host, path, method, expiry and disposition rejected; valid just before five minutes, invalid at expiry and before issuance | R2 must reject actual tampered/expired links; local verifier is not a substitute for the storage service |
| Publication and replacement | Fresh DB reads, changes during metadata lookup, new-grant denial after unpublishing, replaced-source denial; existing grant remains valid within its documented lifetime | Confirm application/CDN behavior and controllable cache invalidation |
| Release month | Actual gate tested before, at and after midnight IST release boundary for grant/redirect/download and GET/HEAD | Verify deployed clock/configuration |
| GET/HEAD/ranges | Method-specific signed requests; authenticated byte ranges, suffix/open-ended ranges, invalid/multiple ranges, If-Range fallback and cancellation; download HEAD does not increment counter | R2 redirect/range/CORS behavior, slow connections and idle expiry renewal |
| Covers and public metadata | No raw storage origins in public DTOs, draft-cover denial, bounded raster MIME/signature/size checks, publication races, private cache headers and bounded retry | Deployed optimizer/CDN and real browser checks |
| Admin maintenance/worker | Private reads; removed admin denial; replacement ticket expiry/tampering/replay/concurrent changes; retained previous PDF, atomic index reset, cover edit preservation, byte-hash identity | Scoped GitHub R2 secrets, synchronized worker source, real upload/copy/cleanup and English extraction |
| Retired filesystem endpoint | Always denied across environments; traversal/absolute/Windows/UNC/symlink-like inputs and ranges; production HTTP evidence recorded in P2-06 | Deploy and invalidate any controllable old file-response caches |
| Former origins | Former-origin stored locators are mapped to authenticated S3 grants only for eligible catalogue entries. Dedicated origin-checker self-tests cover success/partial responses, redirects, outages, fake PDF error bodies and valid denials | Enumerate and probe every known R2/custom/CDN/unsigned S3/local-file URL after cutover; no live denial certified yet |

The component suites are `test-pdf-access-fixtures.cjs`, `test-pdf-delivery.cjs`, `test-public-delivery.cjs`, `test-private-maintenance.cjs`, `test-local-pdf-denial.cjs`, `test-pdf-origins.cjs`, `test-indexing-jobs.cjs`, `test-indexing-controls.cjs` and `test-indexing.cjs`. Public fixture tests now freeze time so their expectations do not change when the calendar advances. The real native/scanned OCR suite and browser scenarios have separate P2-05 evidence; they are not silently represented as part of this nine-suite command.

## Known-origin check for P2-08/09

Prepare a reviewed JSON array in the private handover folder, using actual previously confirmed object URLs from the catalogue/inventory. Example structure (intentionally non-runnable until replaced):

```json
[
  {
    "label": "Current R2 origin, confirmed restricted issue",
    "kind": "restricted",
    "url": "https://replace-with-reviewed-origin.example.test/exact-known-object.pdf"
  }
]
```

Valid kinds are `restricted`, `draft` and `retired`. Include the current documented `pub-3ed08073797148cf93d772ea1eb341f9.r2.dev` origin and every attached custom/CDN domain identified by the Society storage administrator. Add known old workspace-route and unsigned S3 object URLs where applicable. Use exact existing object paths: arbitrary missing paths producing 404 do not prove protection. A sample cannot certify that the domain inventory is complete. Record inventory provenance and the tested release privately.

Run `node scripts/check-pdf-origins.cjs --manifest "<private-reviewed-origin-list.json>"` at the agreed staging/cutover step. This is a separate, explicitly invoked read-only network check, not part of the local suite. It loads no credentials and accepts unsigned HTTPS PDF URLs only; signed URLs, embedded credentials, arbitrary query parameters and placeholder domains are rejected. Numeric `v` cache-busters are allowed.

Each entry receives HEAD, GET and GET with `Range: bytes=0-4`, without following redirects. Only explicit 403/404 denial passes; 200/206, redirects, 401, rate limits, outages, DNS errors and timeouts fail verification. PDF-labelled errors and `%PDF-` prefixes also fail. Bodies are cancelled promptly; only up to five prefix bytes of an apparent denial are retained in memory. Reports include time, labels, methods, statuses and pass/fail, but exclude URLs, response bodies and query strings. Keep labels free of credentials. A failed run returns nonzero.

Deployment and provider configuration remain required. A five-minute signed grant issued before unpublishing may still work until expiry; bytes already downloaded or in flight cannot be recalled. Shared caches of previously public PDFs must be addressed separately under P2-09. P2-07 does not close either P2-08 or P2-09.
