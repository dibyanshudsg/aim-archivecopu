# Production release — 19 September 2026

Website: https://aim-archive.vercel.app

Deployment: `dpl_5V2XphXmDRLfDB4ku83WkYgeSf7x`, READY and aliased to the existing production address. [Vercel release](https://vercel.com/mugdhanilks-projects/aim-archive/5V2XphXmDRLfDB4ku83WkYgeSf7x).

Deployed the approved local UI and performance changes through the existing linked Vercel project. Vercel's production build, type checks and lint checks passed. Existing production environment settings were retained. No custom domain or billing settings were changed.

## Verified on the deployed site

- Fresh mobile browser: no PDF engine in initial scripts, centered Browse all, no horizontal overflow.
- Actual production R2 access: featured preview and main reader both render PDF canvases. No CORS overrides or mocked asset responses were used.
- Closing preview removes its canvases. Older shelf years load on demand. The public shelf endpoint returns the lightweight DTO without descriptions.
- Desktop Browse renders; metadata Browse query and public text-search API return successful responses.
- Bookmarks, admin login and the versioned PDF worker are reachable.
- Public issue download redirects to its asset. Restricted issue data hides PDF URLs and its download returns 403. Unauthenticated admin stats returns 401.
- No browser page errors in the verification session.

Verification script: `output/playwright/verify-production-release.cjs`. Screenshots: `release-home-mobile.png`, `release-browse-desktop.png` in the same directory. Build/test artifacts are excluded from Vercel uploads.

These are focused release checks. No real issue was uploaded, replaced, deleted or reindexed for this release. Normal reader/download smoke checks can increment their analytics counters. ZIP limits, upload verification logic and indexing transactions were covered by the previously recorded local checks; a new live upload was not created.

## Remaining agreed limitations

- Website domain `aimarchive.aurosociety.org` and asset/CDN domain setup remain deferred by the owner.
- `INDEXING_GITHUB_TOKEN` is absent from Production, so Admin's Start indexing connection remains disabled. Existing indexed search works independently.
- This release deployed the website through Vercel; no Git commit/push or GitHub workflow dispatch was made. The hosted worker checks out GitHub main, so local worker batching changes require a separate source synchronization before hosted runs use them.
- Larger capacity options and opt-in field metrics remain documented in PERFORMANCE_IMPLEMENTATION.md.
