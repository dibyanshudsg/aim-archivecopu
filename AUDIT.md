# AIM Archive — Audit & Issues Tracker

> Historical measurements and audit evidence. Earlier open/fixed labels describe the original audits, not the current backlog. Track remaining work in [TO DO LIST.md](TO%20DO%20LIST.md); see [September's performance fixes](PERFORMANCE_IMPLEMENTATION.md) for subsequent changes. Retain these Lighthouse baselines and append fresh production measurements when available.

---

## How to run a Lighthouse audit

1. `pnpm build && pnpm start` from `apps/web/` — Lighthouse needs a production build (dev mode inflates bundle sizes and renders unminified, both of which skew perf scores by 20-30 points). `pnpm start` binds to port 3000 per the package's script.
2. Open Chrome on `http://localhost:3000`, F12 → **Lighthouse** tab.
3. Select **Performance**, **Accessibility**, **Best Practices**, **SEO**. Mode: **Navigation**. Device: **Mobile** for first run, **Desktop** for second.
4. Run for: `/`, `/browse`, `/search`, `/issue/[id]` (any), `/read/[id]` (any), `/admin/login`.
5. Paste the four scores below per route, plus any High-severity findings into the relevant table.

### Lighthouse score history

| Date | Build | Route | Device | Perf | A11y | Best | SEO | Notes |
|---|---|---|---|---|---|---|---|---|
| 2026-05-09 | a68f4a7 | `/` | Mobile | 70 | 100 | 100 | 100 | Baseline. Top opportunity: unused JS (~600ms — react-pdf eager-loaded for carousel). |
| 2026-05-09 | a68f4a7 | `/browse` | Mobile | 62 | 98 | 100 | 100 | Baseline. LCP + render-blocking are the levers. |
| 2026-05-09 | a68f4a7 | `/search` | Mobile | 74 | 98 | 100 | 100 | Baseline. |
| 2026-05-09 | a68f4a7 | `/issue/[id]` | Mobile | 81 | 94 | 100 | 92 | Baseline. |
| 2026-05-09 | a68f4a7 | `/read/[id]` | Mobile | 50 | 88 | 100 | 92 | Baseline — worst route. Perf hit by react-pdf bundle + LCP delay; a11y hit by color-contrast, unlabeled controls, missing `<main>` landmark. |
| 2026-05-09 | a68f4a7 | `/admin/login` | Mobile | 97 | 98 | 100 | 61 | Baseline. SEO 61 is **by design** — admin login carries `robots: noindex` and no canonical (intentional). |
| 2026-05-09 | a68f4a7 | `/` | Desktop | 78 | 100 | 100 | 100 | Baseline. |
| 2026-05-09 | _uncommitted_ | `/` | Mobile | **74** ↑4 | 100 | 100 | 100 | Hero subtitle (LCP element) rendered statically (no Framer transform); carousel `next/dynamic` lazy-loaded. |
| 2026-05-09 | _uncommitted_ | `/browse` | Mobile | **83** ↑21 | 98 | 100 | 100 | First-row cover thumbnails carry `priority` + opacity-gate dropped from card animation. **LCP 25.1s → 3.3s**. |
| 2026-05-09 | _uncommitted_ | `/read/[id]` | Mobile | **55** ↑5 | **100** ↑12 | 100 | 92 | Cover-JPEG fallback overlay pins LCP to a fast image instead of the PDF canvas. **A11y 88 → 100** — color-contrast, page-input aria-label, `<main>` landmark all fixed. Deeper LCP win still needs SSR-fetched issue data so the cover URL is in initial HTML. |

---

## Accessibility (static review, 2026-05-08)

| Severity | Issue | File:Line | Status |
|---|---|---|---|
| High | Search dropdown disables focus ring with inline `outline: none` / `boxShadow: none`, bypassing global `*:focus-visible`. Underline focus indicator works in current state but pattern is fragile. | [header-search-dropdown.tsx:65-67](apps/web/src/components/browse/header-search-dropdown.tsx#L65-L67) | **Fixed** 2026-05-08 — global focus rule moved into `@layer base` so utility classes can override; inline style replaced with `focus-visible:outline-none focus-visible:shadow-none` |
| Medium | Footer copyright at `text-gray-400` on white — borderline WCAG AA (~5.5:1, but visually thin). Bump to `text-gray-500` or darker. | [footer.tsx:125](apps/web/src/components/layout/footer.tsx#L125) | Open |
| Medium | Carousel zoom buttons in floating pill — verify screen-reader announces them clearly with the new placement. Existing `aria-label="Zoom in/out"` should suffice but worth a NVDA/VoiceOver pass. | [this-month-featured.tsx:993-1018](apps/web/src/components/home/this-month-featured.tsx#L993-L1018) | Open |
| Low | Continue-reading shelf uses `<img alt="">` (intentional — title text provides context). Verify SR users get sufficient context from sibling text. | [home-client.tsx:123-127](apps/web/src/app/home-client.tsx#L123-L127) | Open |
| Low | Admin login email/password inputs have `<label htmlFor>` ✓ but lack `autocomplete="email"` / `autocomplete="current-password"`. Helps password managers. | [admin/login/page.tsx:65-85](apps/web/src/app/admin/login/page.tsx#L65-L85) | Open |
| Low | Carousel keyboard ←/→ only works when focus is inside the section. Discoverable enough but consider auto-focusing the carousel region after first tab. | [this-month-featured.tsx:167-181](apps/web/src/components/home/this-month-featured.tsx#L167-L181) | Open |

### From Lighthouse baseline (2026-05-09)

| Severity | Issue | Route | Status |
|---|---|---|---|
| High | `/read/[id]` color-contrast failure — actual culprit was the `<span class="text-gray-400">/ {numPages}</span>` next to the page input (2.6:1 on white). | [read/[id]/page.tsx:1302](apps/web/src/app/read/[id]/page.tsx#L1302) | **Fixed** 2026-05-09 (uncommitted) — bumped to `text-gray-500` and added `aria-hidden` since the label is decorative; the page count is announced via the input's `aria-label`. |
| High | `/read/[id]` form element missing associated `<label>` — page-number input had no label / aria-label / placeholder. | [read/[id]/page.tsx:1294-1301](apps/web/src/app/read/[id]/page.tsx#L1294-L1301) | **Fixed** 2026-05-09 (uncommitted) — added `aria-label="Page number, of {n}"`. |
| High | `/read/[id]` document missing `<main>` landmark — all three return paths wrapped content in `<div>`. | [read/[id]/page.tsx](apps/web/src/app/read/[id]/page.tsx) | **Fixed** 2026-05-09 (uncommitted) — wrapped loading, not-found, and main render paths in `<main>` with descriptive `aria-label`. |

---

## SEO

| Severity | Issue | File:Line | Status |
|---|---|---|---|
| Medium | `/browse`, `/search`, `/bookmarks` lack Twitter Card images and JSON-LD structured data. Falls back to site-level OG. | [browse/layout.tsx](apps/web/src/app/browse/layout.tsx), [search/layout.tsx](apps/web/src/app/search/layout.tsx), [bookmarks/layout.tsx](apps/web/src/app/bookmarks/layout.tsx) | Open |
| Medium | Bookmarks page is `robots: { index: false }` — correct (user-specific) but worth confirming intent. | [bookmarks/layout.tsx:6](apps/web/src/app/bookmarks/layout.tsx#L6) | Open |
| Low | Sitemap lists `/issue/[id]` but not `/read/[id]`. Reader is where users spend time — adding it gives a stronger SEO signal for indexed content. | [sitemap.ts:34](apps/web/src/app/sitemap.ts#L34) | Open |
| Low | Every layout sets `alternates: { canonical: '/<route>' }` redundantly; could be centralized via `metadataBase`. | Multiple `layout.tsx` files | Open |

---

## Best practices / code quality

| Severity | Issue | File:Line | Status |
|---|---|---|---|
| Medium | Inline style override on search input (`outline: none`, `boxShadow: none`) — fragile pattern for replacing the global focus ring. Move to a Tailwind class with explicit replacement focus styling. | [header-search-dropdown.tsx:65-67](apps/web/src/components/browse/header-search-dropdown.tsx#L65-L67) | **Fixed** 2026-05-08 — same change as Accessibility/High above. |
| Low | Continue-reading shelf uses bare `<img>` instead of `next/image`. Tiny thumbnails, low impact, but inconsistent with rest of codebase. | [home-client.tsx:123-127](apps/web/src/app/home-client.tsx#L123-L127) | Open |
| Low | Issue card share/bookmark closures capture `issue` + `copied` state. Negligible memory at current scale; refactor only if hot-path. | [issue-card.tsx:109-140](apps/web/src/components/magazine/issue-card.tsx#L109-L140) | Open |

---

## Performance (Lighthouse baseline, 2026-05-09)

> Recurring opportunities across multiple routes. Tackle by impact (largest savings × routes affected) rather than per-route.

| Severity | Issue | Routes affected | Notes |
|---|---|---|---|
| High | `unused-javascript` — react-pdf + pdfjs worker shipped on first load even when the carousel isn't visible. ~600 ms savings on `/`, ~300 ms on `/read/[id]`, smaller on others. | `/`, `/read/[id]`, `/browse`, `/search` | **Fixed** 2026-05-09 (uncommitted) — `ThisMonthFeatured` is now `next/dynamic` with `ssr: false` and a min-height skeleton placeholder. `/` First Load JS dropped 285 → 272 kB; route bundle 18.5 → 14.2 kB. |
| High | LCP delayed across `/`, `/browse`, `/read/[id]` — Lighthouse scores 0 on LCP for all three. | `/`, `/browse`, `/read/[id]` | **Mostly fixed** 2026-05-09 (uncommitted). `/browse` LCP 25.1s → **3.3s** via `priority` on first-row covers + dropping opacity-gate on card animations. `/` LCP element rendered statically. `/read/[id]` LCP element switched from PDF canvas to a cover-JPEG overlay (with `fetchPriority="high"`), but the cover URL isn't known at SSR time so the image still has to wait for hydration — deeper win needs reader page to be SSR-fetched. |
| Medium | Render-blocking requests — common across all routes; likely Google Fonts CSS not subset/preloaded optimally. | All | Verify `next/font/google` config for Inter + Playfair Display includes `display: 'swap'` and only used weights. |
| Medium | `legacy-javascript-insight` on `/` — polyfills shipped that modern browsers don't need. | `/` | Likely a transitive dep; check `next.config.ts` for `swcMinify`/transpile config. |
| Low | `forced-reflow-insight` on `/browse` — layout-thrashing loop, probably the filter panel measurement on toggle. | `/browse` | Profile with DevTools Performance tab; batch reads/writes with `requestAnimationFrame`. |

---

## Reader parity (full reader vs homepage embedded reader, 2026-05-08)

> The two PDF readers have drifted. Document reflects findings from a code-level audit; consolidating helpers into `apps/web/src/lib/` would let one fix land in both places.

### Drifts that affect users
| Severity | Issue | Location | Status |
|---|---|---|---|
| Medium | Swipe sensitivity mismatch — Reader A: 60px / 500px-per-s. Reader B: 30px / 200px-per-s (hypersensitive, triggers on relaxed hand). | [read/[id]/page.tsx:1125-1130](apps/web/src/app/read/[id]/page.tsx#L1125-L1130) vs [this-month-featured.tsx:835](apps/web/src/components/home/this-month-featured.tsx#L835) | Open |
| Medium | Zoom step grid mismatch — Reader A: continuous 0.2 increments. Reader B: discrete `[0.75, 1, 1.25, 1.5, 1.75, 2]`. Switching readers carries non-snapped zoom levels. | Reader A `~line 818-819`, Reader B [this-month-featured.tsx:806](apps/web/src/components/home/this-month-featured.tsx#L806) | Open |
| Medium | Spread snap-to-odd-page only in Reader B — Reader A allows asymmetric (page 2-3) spreads. | [this-month-featured.tsx:763-766](apps/web/src/components/home/this-month-featured.tsx#L763-L766) | Open |

### Polish Reader B has that Reader A is missing
| Issue | Status |
|---|---|
| Cover JPEG shown while PDF loads (Reader A: blank/spinner ~2-4s) | **Partial** 2026-05-09 (uncommitted) — cover JPEG overlay + `firstPageRendered` state added to Reader A; LCP element switches from PDF canvas to cover image. Full polish (smooth fade-out, sized to page aspect) still pending. |
| Neighbour issue preloading (cover + PDF) | Open |
| Page-turn shimmer skeleton fallback | Open |
| Floating zoom pill (always visible vs. scrollable header zoom) | Open |

### Polish Reader A has that Reader B doesn't
| Issue | Status |
|---|---|
| Page scrubber (timeline jump-to-page) | Open / future |
| Pinch-to-zoom on touch | Open / future |
| Single-vs-continuous scroll mode toggle | Open / future |
| Fullscreen mode | Open / future |
| Resume-reading per issue | Open / future |
| Page-level sharing | Open / future |

### Code duplication worth extracting
- PDF.js worker setup (identical in both)
- `useMediaQuery` hook (inline in both, slightly different)
- Zoom step array + handlers
- Spread snap-to-odd helper
- Ease curve `[0.22, 1, 0.36, 1]` (different durations either side)
- DPR floor — `renderDpr` (Reader A) vs `hiDPI` (Reader B), same intent

---

## Security

| Severity | Issue | Detected | Status |
|---|---|---|---|

---

## Process notes

- Before fixing High-severity items, capture a Lighthouse baseline so we can prove the regression goes the right way.
- Include the issue's row from this doc in the commit message (e.g. `fix(a11y): restore focus ring on search dropdown — AUDIT.md "Accessibility / High"`).
- New findings: add to the relevant table with severity, file:line, and `Open` status. Don't reorder — append.
- When marking `Fixed`: add a `→ commit-sha` annotation in the Status column so the doc stays connected to history.

Historical database-provider security records were preserved privately during the 8 October 2026 handover cleanup; current database authorization is implemented in the application.
