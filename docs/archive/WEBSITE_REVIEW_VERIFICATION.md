# Website review — local verification

> Historical record, archived 19 September 2026. Status claims and commands below describe the original work; use [the active TODO](../../TO%20DO%20LIST.md) and current operating guides for today's tasks. This record does not authorize replaying migrations or deployments.

Date: 6 September 2026  
Tracker: [Website Review Action Plan](../../WEBSITE_REVIEW_ACTION_PLAN.md)  
Result: 22 delivery tasks verified locally; P3-07 curated collections deferred by the owner. No deployment performed.

## Delivered

- Accurate catalogue counts, represented languages, supported formats, and five-year access wording.
- Readable homepage selection before limits; compact mobile introduction and navigation-based resume access.
- URL-backed Search with server-side availability, accurate match provenance, visible touch/keyboard actions, recoverable errors, and protection against stale responses.
- Theme-led discovery, one Browse availability control, optional homepage PDF preview, related readable editions, and contextual problem reporting.
- Mobile reader fit-to-width, accessible options drawer, full title access, and browser-local bookmark disclosure.

## Checks and results

| Check | Result / scope |
|---|---|
| `pnpm.cmd build` from `apps/web` | Passed on final source; compilation, lint, type checking, and generation of 37 static pages completed with exit code 0. |
| `pnpm.cmd test:review` from the root | Passed. Uses real repository SQL and API handlers against isolated SQLite fixtures; requires Node 22.16 or newer. |
| Access fixtures | Before/at/after IST month boundaries, including year rollover; published/readable selection before limits; count definitions; related issues exclude self, drafts, restricted and unusable assets. |
| Search fixtures | Availability, literal wildcard handling, metadata provenance with null page numbers, matched page navigation, restricted snippet redaction, sanitization, actual topic suggestions, invalid filters, zero matches, and database failure response. |
| Search browser interactions | Surrender, animals, Divine Grace; direct URLs, scope changes, reload and Back/Forward; deliberately delayed responses including an abort-ignoring response; failed request and recovery. |
| Responsive journeys | Desktop 1440px and mobile 360px, 390px, 430px; short 360 × 640 viewport; homepage, Browse, issue detail, reader, bookmarks, and Hindi catalogue. No horizontal overflow in checked layouts. |
| Reader and persistence | Actual touch pinch, fit reset and page containment; page navigation and URL updates; options drawer focus/Escape return; bookmark toggling/reload; returning-reader history. |
| Keyboard and motion | Actual Tab navigation reaches a visibly focused Search Read link; labelled reader controls and focus trapping; Search renders with reduced motion enabled. |
| Optional preview | Observed zero homepage PDF requests before opening preview; canvas loads on request and closes back to discovery. No comparative speed claim or Lighthouse score asserted. |
| Feedback | Existing configured form offered with copyable issue/page context. A mocked missing configuration hides the action. No form submitted. |

Browser checks ran in an isolated local Chromium profile. The full journey checks used a local production build. A final display-only fix hides an absent page count, followed by a successful rebuild. Browser evidence is local and does not establish production or cross-browser compatibility.

## Local evidence

The following scripts and screenshots are in ignored `.codex-logs`, available in this workspace rather than committed release artifacts:

- `review-pass1.mjs`: initial mobile/desktop and access journeys.
- `review-search.mjs`: URL, scope, response-order and error interactions.
- `review-final.mjs`: production-build journey and preview checks; passed without browser exceptions.
- `review-confirm.mjs`: settled renders, pinch/reset, bookmark persistence and Hindi layout checks passed; its final programmatic focus-visible assertion was unsuitable after touch emulation. Actual keyboard verification below supersedes that assertion; this script is not reported as a complete pass.
- `review-keyboard.mjs`: genuine Tab/focus and missing-feedback checks passed without browser exceptions.
- Representative captures: `confirmed-home-desktop.png`, `final-home-mobile.png`, `pass2-search-mobile.png`, `confirmed-reader-mobile.png`, `final-reader-options.png`, `confirmed-hindi-mobile.png`, `confirmed-search-keyboard.png`.

## Limits and follow-up

**Search coverage remains the material content gap:** 0 of 94 readable editions in the configured database has indexed page text. The one indexed restricted Hindi edition has structurally complete page coverage; transcription accuracy was not established. Real public page-text search cannot be validated end to end until a readable edition is indexed. Fixtures verify its current code path. See [Search Coverage Audit](../../SEARCH_REBUILD_REPORT.md#historical-baseline-before-the-september-6-rebuild), including SC-01–SC-04 for source inspection, a bounded pilot, batch planning, and revalidation.

The owner confirmed physical subscriptions exist, online subscriber access does not, and the five-year embargo supports physical issue value and eventual public access. No unverified print contact link, payment flow, or digital entitlement was added. P3-05 delivers related readable alternatives; a contact link awaits an official destination. Curated collections await approved selections and a maintainer.

The [Public Copy Audit](../../PUBLIC_COPY_AUDIT.md) records the copy changes. Existing unrelated working-tree changes were preserved. No bulk indexing, database migration, Git commit, or deployment was performed for this pass. Ordinary local browsing can increment the application's existing reading analytics.
