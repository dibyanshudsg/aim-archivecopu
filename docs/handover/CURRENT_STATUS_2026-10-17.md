# AIM Archive handover status — 17 October 2026

This is the current status for a recipient cloning GitHub `main`. Older dated reports in this repository remain evidence of work at their stated dates; where they describe the site as an undeployed candidate or shared-password Admin, this record supersedes them.

## Source and deployed website

- GitHub: private `MugdhanilK/aim-archive`, branch `main`. The deployed web source is commit `8f89f4e` (security code `8fdea86`, release candidate `7fec2b3`); subsequent documentation-only commits may advance `main`. Verify `git rev-parse HEAD` after cloning.
- Vercel: `aim-archive` production alias `https://aim-archive.vercel.app`, promoted deployment `dpl_6qBbGKAZ54qoa7eykewmZ8a2fcWe`. This remains a review deployment; it has not been declared the Society's official public launch.
- The 17 October deployment passed Vercel's Linux Next.js 15.5.28 build, lint and type checks. Read-only production checks returned 200 for Home, `/api/issues` and Admin login with CSP headers. An unaliased deployment also passed Browse, Search and Bookmarks checks.
- The recorded catalogue is 104 issues. Recheck live counts before making an editorial or data-change decision.

## Current implementation

- Public catalogue, browsing, search, bookmarks, issue details, reader and five-year application access checks are deployed.
- Admin has individual accounts/passwords, roles and permissions, session revocation, activity audit, and management screens. The earlier shared-password description is historical.
- Application rate limits cover public and Admin routes. The Vercel firewall has one enabled per-IP rule for `/api/admin/auth`: 120 requests per 600 seconds, then HTTP 429. See the [rate-limit table](../../RATE_LIMITING.md) and [security hardening](SECURITY_HARDENING_2026-10-17.md).
- CSP, bounded Admin JSON requests and generic API failures were added in the 17 October release. PDF/cover uploads have separate limits.
- Search indexing is manually dispatched through GitHub Actions; its live dispatch credentials and worker behavior need receiving-team verification before relying on the Admin Start control.

## Handover decisions and verification still open

- Dibyanshu Ji needs to accept/verify his private repository access and clone/setup. An invitation to `dibyanshudsg` was reported as sent on 13 October; acceptance was not reverified here.
- Assign the receiving owners of GitHub, Vercel, Turso, Society R2, billing, backups, monitoring and incidents. No account ownership transfer is claimed.
- Isolated staging is recommended for role/account mutations, migration, upload/replacement and recovery rehearsals before future high-impact changes. This release received read-only production smoke, not a full Admin mutation rehearsal.
- The five-year rule is enforced by the app, but the previously tested direct R2 public PDF origin can bypass it. The owner deferred origin closure to Society IT; Dibyanshu Ji should confirm the accepted exposure and close or restrict that origin when authorized. Possession of an old URL is not required for a URL to be discoverable.
- Historical credential copies may still exist outside current source. The owner deferred coordinated rotation. Receiving operators should plan replacement of any inherited Admin/service credentials and session secrets without interrupting the site.
- The firewall threshold has not been load-tested at 429 or tuned against shared Society-network traffic. The Vercel CLI Firewall overview returned a Hobby-plan 402; inspect available dashboard analytics and application 429s after real usage.
- Full hosted workflow/role testing, independent recovery, R2 origin denial and native app dependency work remain open. The mobile app is an Expo skeleton, not a delivery-ready app.
- Source pin is Node 22.23.3; the observed Vercel Node 22.x build resolved to 22.23.2. The cloud build passed, but the runtime mismatch should be reconciled during receiving setup.

## Reading order

Start with [README](../../README.md), [setup](../../SETUP.md), the [active tracker](../../TO%20DO%20LIST.md), this status, [security hardening](SECURITY_HARDENING_2026-10-17.md), then the [Society document index](SOCIETY_DOCUMENT_INDEX.md). Historical phase reports are dated evidence and should not be treated as the current deployment state.
