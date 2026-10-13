# Public UI review — 19 September 2026

> Historical record, archived 19 September 2026. Status claims and commands below describe the original work; use [the active TODO](../../TO%20DO%20LIST.md) and current operating guides for today's tasks. This record does not authorize replaying migrations or deployments.

All eight findings below have now been addressed following approval. The original assessment is retained as the before-state record.

## Resolution and verification

- Native modal filters contain keyboard focus, dismiss with Escape/backdrop click, restore focus to the trigger, lock background scrolling, and release the modal on desktop resize. Collapsed desktop filters are inert. Mobile arrival starts with filters closed, independently of a saved desktop preference.
- Bookmarks guidance contrast improved from approximately 2.63:1 to **7.56:1**. Browse counts and affected secondary labels were darkened.
- Year arrows fit at 320px, 390px, and 1280px. Tiny year dots became labeled buttons with 44px targets.
- Affected homepage, Search, header, and Browse card controls were enlarged. Search filter fields now use 16px text and at least 44px height.
- Browse all remains centered on mobile, follows the filters in both visual and DOM order, and preserves the selected magazine and year. The Agnishikha handoff was exercised in the browser.
- Featured-card actions now use a full-width Read action followed by Preview and Bookmark on phones.
- Bookshelf transform/layout motion respects the system preference, automatic preview page turns stop under reduced motion, and Search filter expansion becomes immediate. First-load page transitions render identically on server and client to avoid reduced-motion hydration mismatch.
- TypeScript and targeted ESLint checks passed. Browser checks covered dimensions, target sizes, navigation, modal focus and dismissal, resize cleanup, and contrast under reduced-motion emulation. Verification script: `output/playwright/verify-public-ui-fixes.cjs`; screenshots use the `fixed-` prefix in that directory.

The checks remain local Chromium checks; no physical-device or production performance certification is implied.

## Scope and evidence

Impeccable audit, source review, and Playwright inspection of Home, Browse, Search with results, and empty Bookmarks at 390px and 1280px. Additional Home check at 320px and mobile Browse drawer interaction. Screenshots and inspection scripts are in `output/playwright/`.

This is a local Chromium review, not a full accessibility certification, Lighthouse benchmark, or physical iOS/Android test. Admin, full reader interactions, populated Bookmarks, and 200% text scaling were outside this pass. Screenshots taken during initial hydration were excluded from findings. The transient Search filter expansion frame was also excluded.

## Assessment

The visual system is coherent with the archive's existing identity. The main shortcomings are interaction accessibility and mobile adaptation, rather than a need for a redesign.

| Dimension | Provisional score / 4 | Evidence |
| --- | --- | --- |
| Accessibility | 2 | Pale instructional text and incomplete drawer keyboard behavior |
| Performance | 3 | Responsive local interactions; source review only, no production benchmark |
| Responsive design | 2 | 320px year controls clip; several small touch targets |
| Theming | 3 | Shared gold/flame tokens; some insufficient-contrast combinations |
| Implementation integrity | 3 | Consistent identity; filter handoff and visual/DOM order diverge |
| Total | 13 / 20 | Provisional: significant focused improvements needed |

Eight findings: 0 P0 blocking, 2 P1 major, 6 P2 minor. Priorities reflect this review's scope.

## Findings

1. **P1 — Mobile Browse drawer lacks complete modal/keyboard behavior.** `apps/web/src/app/browse/browse-client.tsx:612`. Browser check: Escape leaves the drawer open, no dialog or aria-modal semantics, background is not inert, and body overflow remains visible. Source has no drawer focus management or scroll lock. The desktop collapsed sidebar also uses aria-hidden without removing its controls from keyboard focus. Users of keyboards and assistive technology can lose context or reach background controls. Add a labeled dialog, focus entry/containment/return, Escape dismissal, background inertness, scroll locking, and inert collapsed desktop content. Suggested command: `$impeccable harden`.

2. **P1 — Important secondary text is too pale.** `apps/web/src/app/bookmarks/bookmarks-client.tsx:274` and `apps/web/src/app/browse/browse-client.tsx:667`. Bookmarks guidance measures RGB 152,160,175 on white, approximately 2.63:1 contrast. The same gray token appears on the Browse result count. These are instructions and useful status information, especially difficult in sunlight or for readers with low vision. Use a darker secondary-text token and verify rendered backgrounds, including active controls. Suggested command: `$impeccable colorize`.

3. **P2 — Year arrows clip on narrow phones.** `apps/web/src/components/home/animated-bookshelf.tsx:1025`. At 320px the Previous button starts at x=-6 and the Next button ends at x=326. The 220px minimum-width year card plus arrows and gaps cannot fit the inner content area. There is no whole-page horizontal scroll, so that check alone misses the defect. Let the year card shrink or restructure the arrows for narrow containers. Evidence: `output/playwright/audit-home-320.png`. Suggested command: `$impeccable adapt`.

4. **P2 — Touch targets are repeatedly undersized.** Homepage year dots are 10px high; magazine filters 30–32px; sort controls 36px. Search clear and Show filters controls measure 20px high. Browse share/bookmark controls are 32px, and Read/Details links 34px. Increase clickable areas toward 44px while keeping icons visually compact; enlarge dot hit areas without overlap. This is a usability target, not a claim that every sub-44px element automatically violates an accessibility standard. Radio inputs were excluded because their containing labels provide larger hit areas. Suggested command: `$impeccable adapt`.

5. **P2 — Browse all drops the chosen magazine.** `apps/web/src/components/home/animated-bookshelf.tsx:1169`. The shelf filters issues using magazineFilter, but browseHref includes only availability and year. Selecting Agnishikha and then Browse all therefore returns to all magazines for that year. Carry the selected magazine through using the Browse page's supported parameter. This is verified in source; an end-to-end filter handoff was not exercised. Suggested command: `$impeccable harden`.

6. **P2 — Featured-card bookmark becomes a detached action.** `apps/web/src/components/home/this-month-featured.tsx:678`. At 390px, Read issue and Preview here share a row while the heart occupies a new centered row on its own. This adds height and weakens the relationship between the three actions. Give the action group an intentional phone layout, such as a full-width primary action followed by a secondary-action row. Evidence: `output/playwright/audit-home-feature.png`. Suggested command: `$impeccable layout`.

7. **P2 — Homepage visual order differs from keyboard order.** `apps/web/src/components/home/animated-bookshelf.tsx:1193`. The filter group precedes Browse all in the DOM but uses order-last on mobile. Visually, Browse all appears above the filters; keyboard navigation reaches the filters first and then jumps back up to the link. This mismatch already existed before centering. Make DOM and visual reading order agree. Suggested command: `$impeccable harden`.

8. **P2 — Reduced-motion handling is inconsistent.** `apps/web/src/components/home/animated-bookshelf.tsx` and `apps/web/src/app/search/search-client.tsx:163`. The featured reader and header use useReducedMotion, but the bookshelf's layout springs and Search filter height animation do not use an equivalent preference check. The global reduced-motion rules cover specific shimmer/highlight effects only. Add deliberate low-motion alternatives to active animations. This finding is source-based; physical-device motion sensitivity was not tested. Suggested command: `$impeccable animate`.

## Practices to retain

- No whole-page horizontal overflow after hydration at 390px or 1280px on the four checked routes.
- Search completes and shows real results and a result status; empty Bookmarks provides a Browse action and explains local-only storage.
- Existing filter buttons expose selected states; major icon controls generally have accessible names.
- Shared tokens, preserved cover proportions, and public server-wrapper architecture remain consistent.

The mechanical detector flagged existing gradient text and gray text on a red feedback state. Gradient use is part of the established visual identity, so it was not counted as a defect by itself. The red feedback state was not exercised and is not counted as a verified finding.

## Suggested sequence

Address P1 keyboard/contrast issues, then narrow-phone sizing and touch targets, then filter handoff/action grouping/order/motion. Finish with `$impeccable polish`. Recheck the affected states after fixes; a full production performance score requires a separate benchmark.
