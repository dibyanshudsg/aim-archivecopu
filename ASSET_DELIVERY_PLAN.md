# Archive domain and asset delivery

User decision, 19 September 2026: prefer **aimarchive.aurosociety.org** for the archive website. Record the choice only; defer domain setup and any spending. No DNS, Cloudflare bucket/domain, billing or deployment change has been made.

The website address and the address serving PDFs/covers are separate settings. Do not point the chosen website hostname directly at an R2 bucket. Choose a separate asset hostname when the domain work resumes.

Security update, 8 October 2026: the confirmed public-origin PDF bypass takes precedence over the deferred domain work below. Phase 2 must provide private restricted-PDF delivery and deny every old PDF origin. See the [access rollback approach](docs/handover/P1-06_PDF_ACCESS_ROLLBACK.md). No access configuration has been changed yet.

## Prepared locally

- R2 server uploads use a short, explicit `public, max-age=300, must-revalidate` policy because existing object keys can be overwritten. No immutable policy is applied to mutable PDFs/covers.
- Next image configuration accepts the configured R2 public hostname.
- `R2_LEGACY_PUBLIC_BASE_URLS` accepts comma-separated former bases. When a custom asset domain is ready, set this to the old public base and change `R2_PUBLIC_BASE_URL`. Public data responses rewrite those known bases without rewriting stored source URLs or invalidating indexing provenance. Keep aliases for replacement/deletion operations.
- Existing objects and direct browser PUT uploads do not acquire new headers retroactively. Apply a bucket/domain cache rule or a separately reviewed object-metadata update when delivery is configured. Verify replaced objects become fresh within the chosen TTL.

## Later verification

For assets explicitly approved for public delivery, connect the chosen asset hostname to R2 and configure CORS for the archive website. The Phase 2 design governs PDF delivery. Verify byte-range responses, image optimization, cache headers and a replaced asset. Test alias resolution and the new delivery path before deploying environment changes; aliases must not permit unauthorized bytes from old origins. Record cold/warm response headers. Retaining public r2.dev access is permissible only where it cannot expose restricted or draft PDFs.

Reference: [Cloudflare public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/).
