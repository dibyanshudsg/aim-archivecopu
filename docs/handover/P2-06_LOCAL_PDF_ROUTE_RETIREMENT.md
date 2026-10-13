# P2-06 — Retire workspace PDF delivery

8 October 2026. Local implementation; no deployment or live origin/cache changes.

## Decision and implementation

The old `/api/pdf/[...path]` handler read PDFs relative to the workspace, without catalogue or admin authorization, and returned a one-day public cache policy. Its string-prefix containment check was not an adequate filesystem boundary. Repository searches found no current application callers of this route.

The endpoint is now an explicit empty 404 for GET and HEAD in every environment, including development. It does not inspect parameters, resolve paths, check file existence or open files. Browser, CDN and Vercel CDN cache headers specify `no-store`; `nosniff` and `no-referrer` remain set. There is no development flag to reopen it. Other methods have no content-serving implementation.

Use `/api/issues/[id]/pdf` for authorized public catalogue delivery and `/api/admin/issues/[id]/pdf` for authenticated admin delivery. Stored database locators and local source files are unchanged. Any external/manual tooling using the retired workspace endpoint must move to these catalogue routes; such external consumers cannot be excluded by a repository search alone.

## Verification

`node scripts/test-local-pdf-denial.cjs` exercises the actual handler for all six synthetic catalogue states (released, restricted, old/recent drafts and release boundaries), GET/HEAD, ranges, development/test/production, and relative/absolute/encoded/Windows/UNC/sibling-prefix/symlink-like paths. All return an empty uncached 404. A throwing parameter getter verifies the handler does not inspect path inputs. No actual symlink or sensitive filesystem file is needed because the filesystem implementation has been removed entirely.

`node scripts/test-pdf-delivery.cjs` confirms the separate catalogue/admin access gates still pass their existing authorization, publication-race, range and signed-link tests.

Production build passed, including lint/type validation and generation of 43 static pages. `node scripts/test-local-pdf-denial.cjs --port=3106` passed 16 actual Next production-server GET/HEAD/range requests using raw encoded HTTP paths on loopback. The server used synthetic configuration and was stopped after verification. This test cannot target a remote hostname.

One encoded `..` path is normalized by Next before route matching, resulting in its standard HTML 404 for `/api/outside.pdf`. That generic error page carries framework shared-cache headers and contains no PDF bytes; it is distinct from this handler's empty, explicitly uncached denial. The HTTP test checks both behaviors. No claim of overriding Next's general 404 caching is made.

## Release requirements

This closes the local workspace-file path only. It does not close public R2 origins or revoke a PDF already downloaded or cached from the previous implementation. During P2-08/09, deploy the fix, invalidate controllable old `/api/pdf/*` cached responses, check known historical URLs against the deployed host and preserve denial in any rollback. Do not restore the previous filesystem handler to recover PDF reading.

P2-07 remains the next task: consolidate and fill gaps in the full access regression matrix. Hosted storage credentials, CORS, worker synchronization, staging acceptance and public-origin closure remain open.
