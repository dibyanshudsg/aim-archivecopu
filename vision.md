# AIM Archive — Vision Document

> A north-star vision for the AIM Archive platform, informed by a deep study of [namahjournal.com](https://namahjournal.com/) — the sister publication suggested by the boss as a reference benchmark.

---

## 1. Why namahjournal.com Matters to Us

NAMAH ("The Journal of Integral Health") and AIM (All India Magazine + Agnishikha) **share the same parent organization**: the Sri Aurobindo Society in Pondicherry. NAMAH is published by the Society's *Sri Aurobindo International Institute for Integral Health and Research*. So this isn't merely "a website we admire" — it's a **sibling publication** within the same institutional family. The boss surfacing it tells us:

- The Society values NAMAH's editorial and digital approach.
- Our archive should feel like a **family member** of the NAMAH site (shared lineage, shared parent links in the footer, harmonious visual language) — but **clearly distinct** in purpose and superior in execution.
- We are expected to study what NAMAH does well, do at least as much, and exceed it where the medium allows.

Treat NAMAH as the **floor**, not the ceiling.

---

## 2. NAMAH at a Glance — What It Is

| Aspect | Detail |
|---|---|
| Title | NAMAH — The Journal of Integral Health |
| Publisher | Sri Aurobindo International Institute for Integral Health and Research, under Sri Aurobindo Society |
| Location | 11 St. Martin Street, Puducherry 605001, India |
| Domain | https://namahjournal.com/ |
| Frequency | Quarterly — January 15, April 24, July 15, October 15 |
| Format | Print + e-journal (~50 pages, 18.5 × 24.5 cm, matted cover) |
| Volume scope | Currently on Volume 34, Issue 1 (so ~34 years of archive) |
| Audience | Devotees, doctors, psychologists, integral-health practitioners, spiritual seekers |
| Editorial focus | Integral health — body, emotions, mind, spirit; synthesis of medical systems; Yoga psychology |
| Tech stack (apparent) | Traditional CMS (WordPress-style), URL patterns like `/articles`, `/issues`, `/authors`, `/page/about-namah` |

NAMAH is a **journal-style** publication: each issue is a curated set of *named articles* by *named authors*, with editorial categories. AIM is more devotional: monthly excerpts from Sri Aurobindo and The Mother, organized thematically. The sites must therefore feel kindred but reflect different content models.

---

## 3. Everything NAMAH's Website Does — Exhaustive Inventory

### 3.1 Information architecture

Top navigation (in order):
1. **Home** (logo)
2. **About Us** (resolves to `/page/about-namah`)
3. **Articles** (`/articles`)
4. **Issues** (`/issues`)
5. **Authors** (`/authors`)
6. **Events** (`/events`)
7. **Contact Us** (`/contact-us`)
8. **Subscribe** (links externally to `aurosociety.org/site/signup`)

Secondary navigation surfaces in the sidebar/footer: recent issues, "View All Issues / Articles / Authors / Categories", parent-org links, social.

### 3.2 Homepage

- Large hero featuring one flagship article from the current issue (e.g. *"Man's Capacity for Self-Deception"* by The Mother).
- "Current Issue" panel showing Volume / Issue (e.g. Volume 34 Issue 1).
- Carousel/grid of 5 recent articles — each with thumbnail, title, author, date, category tag, preview text.
- Sidebar with recent issues, recent authors, category links.
- Footer with parent-organization links, social media, copyright.

### 3.3 Articles index (`/articles`)

- Card grid. Each card: featured image, category tag(s), volume/issue number, title, author, publication date, truncated excerpt.
- **Multi-dimensional filtering:**
  - Author dropdown ("All Authors" + per-author selection)
  - Issue dropdown ("All Issues" + per-issue selection)
  - Category dropdown ("All Categories" + per-category selection)
  - **Alphabetical A–Z** filter buttons
- Sidebar panels: "Issues" (with thumbnails), "Authors" (alphabetical), "Categories".

### 3.4 Single article page

- Hero image + title + author + issue.
- Centered epigraph / pull-quote.
- **Reading time estimate** (e.g. "5 minutes").
- Single-column readable body; long-form prose.
- Italicized subheading distinguishing speaker voice.
- "Related Articles" section below with thumbnails.
- Footer publication details and editor's notes.
- **Notable absences:** no comments, no share buttons, no PDF download, no font-size or dark-mode toggles, no apparent in-page search.

### 3.5 Issues index (`/issues`)

- Card grid. Each card: cover thumbnail, "Volume X Issue Y", publication date.
- Cards link to a dedicated issue page (`/issues/volume-34-issue-1`).
- Reverse chronological order; ~8 cards visible per view.
- No explicit pagination controls visible in the excerpt — likely lazy-load or numbered.

### 3.6 Single issue page (`/issues/{slug}`)

- Cover image.
- Volume / Issue / publication date metadata.
- Table of contents — list of articles in the issue with thumbnails, headlines, author attribution, dates, excerpts.
- Sidebar with recent articles and events.
- **Notable absences:** no PDF download or print-purchase CTA visible from the issue page itself.

### 3.7 Authors page (`/authors`)

- Plain alphabetical list (not photo grid).
- Each entry: name, title/role (e.g. "Doctor", "Contributor"), short bio, article count (e.g. "1 article").
- Letter (A–Z) filter to narrow.
- Author names are clickable to a per-author page showing all their articles.

### 3.8 Categories (`/articles/category`)

- Vertical alphabetical list of ~29+ visible categories: *A Leaf from the past, Accidents & catastrophes, Aim of medicine, Alchemy of the soul, Alternative healing, Alternative medicine, Ayurveda, Bipolar Disorder, Body, Cancer, Case studies, Child health, Classical reprint, Communication in healing, Complementary medicine, Consciousness and health, Coronavirus, Dance therapy, Death, Depression, Drama Therapy, …*.
- Plain text links — no counts, no icons, no descriptions.
- Pagination implied ("1234").
- Clicking a category lists all articles tagged with it.

### 3.9 Events (`/events`)

- Currently a placeholder ("Coming Soon. Stay tuned for upcoming events in this category.").
- The architecture exists — Society events, courses, online programs, workshops are intended to live here.

### 3.10 Contact (`/contact-us`)

- Contact person, email, phone, mobile, IST office hours, physical address.
- "Send Us a Message" form (name / email / subject / message up to 5000 chars).
- No submission guidelines or subscription info on this page.

### 3.11 Subscribe

- Subscribe link delegates outward to Sri Aurobindo Society's signup portal (`aurosociety.org/site/signup?var=…`). **Subscriptions are managed by the parent Society, not by NAMAH itself.**

### 3.12 Footer

- About blurb.
- Useful Links: Sri Aurobindo Society, Sri Aurobindo Ashram, Institute For Integral Yoga Psychology, Sri Aurobindo Sadhana Peetham.
- Contact details (Puducherry address, phone, email).
- Social: Facebook, Twitter (X), YouTube.
- Engagement CTAs: Volunteership, Support Us, Subscribe (all link to `aurosociety.org`).
- Copyright "© 2026 NAMAH Journal. All rights reserved."

### 3.13 Visual identity

- Minimalist, scholarly, neutral palette: white / grey / black with image-heavy cards providing the colour.
- Sans-serif body, elegant title lettering for the NAMAH wordmark.
- Photographic backgrounds on featured cards.
- Traditional CMS layout — competent but not particularly modern; not animated; not especially mobile-optimized.

---

## 4. Where AIM Already Surpasses NAMAH

These are existing AIM strengths we must not lose while learning from NAMAH:

| Capability | AIM (today) | NAMAH |
|---|---|---|
| Full-text search across the archive | Yes — PostgreSQL FTS over 384 OCR'd pages with ranked snippets | Not visible — no global search |
| In-app PDF reader | Yes — zoom, fullscreen, page scrubber | No |
| Bookmarks | Yes — Zustand + localStorage | No |
| Cover thumbnail auto-generation | Yes — pdfjs + node-canvas | Manually uploaded |
| Multi-language UI / content | Roadmap: 5–6 Indian languages | English only |
| Browse with faceted filters + live counts | Yes — Year, Month, Magazine, Language, Subjects | Dropdowns only |
| Grid / List view toggle | Yes — sortable list table | No |
| URL-synced filter state | Yes (`?year=…&subject=…&view=list&page=2`) | Partial |
| Native Web Share with cover thumbnail | Yes (`navigator.share({files})`) | No |
| Modern animations | Framer Motion — page transitions, stagger, hover | None |
| Mobile app (planned) | Yes — Expo, offline reading | None |
| Admin panel | Full CRUD + managed topics + OCR + thumbnails | Likely WordPress admin |
| Performance | Next.js 15 App Router, Vercel edge | Traditional CMS |

**Bottom line:** AIM's foundation is more modern, faster, and more search-capable than NAMAH's. We just don't yet match NAMAH's *editorial expressiveness* (article-level pages, named authors, named categories, related content, reading time).

---

## 5. What AIM Should Adopt From NAMAH

These are concrete features, behaviours, and conventions worth borrowing — adapted to AIM's content model.

### 5.1 Article-level web pages — the biggest gap

NAMAH treats each article as a first-class web entity with its own URL, hero, body, author, category. Today AIM treats each issue as an opaque PDF. We should introduce an **"article" abstraction** above the page level:

- An *issue* contains one or more *articles* (likely most issues are one long meditation, but some have multiple discrete pieces).
- Each article has: title, author (most often "The Mother" or "Sri Aurobindo" or "Editorial"), starting page, ending page, topics, optional pull-quote, optional hero image (extracted from the PDF or curated).
- URL pattern: `/article/{magazine-slug}/{year}/{month}/{article-slug}` or `/read/{issue-id}/article/{slug}`.
- Body text: the OCR'd content for those pages, rendered as clean prose (not just searchable in the background — actually displayed).
- The PDF remains downloadable, but **the web is now the primary reading surface**.

This unlocks: shareable per-article links, SEO at article granularity, related articles, author pages, citation, and dramatically better reading on mobile.

**Effort:** large. Requires a new `articles` table, an admin tool to define article boundaries within a PDF (or auto-detect from headings), and a reader component that renders OCR text rather than just displaying the PDF. Feasible to roll out *without* disrupting today's PDF flow — articles become an additive layer.

### 5.2 Author pages

- A new `authors` table: id, name, slug, role (e.g. "Disciple", "Editor", "The Mother", "Sri Aurobindo"), short bio, photo (optional).
- `/authors` index — alphabetical, with article counts.
- `/authors/{slug}` — bio + every article they've authored.
- Most AIM content is by The Mother and Sri Aurobindo, so the author list will be small but meaningful (also surfaces editorial pieces by Society members).

### 5.3 Topic / category landing pages

We already have a `topics` master list and a `?subject=` filter on `/browse`. NAMAH goes further — each category is a destination URL (`/articles/category/ayurveda`). We should:

- Add `/topics` index page (alphabetical, with usage counts — we already compute these).
- Add `/topics/{slug}` page — landing page per topic, listing every issue/article tagged with it, optional editorial intro.
- Cross-link from issue pages and article pages so readers can dive into a theme.

### 5.4 Reading time estimates

- Computed from OCR'd word count of an article: `Math.ceil(wordCount / 200) min`.
- Display on article cards and at the top of the article page.
- Free, no infrastructure needed — we already have OCR text.

### 5.5 Related content

- "Related Issues" / "Related Articles" sections, driven by topic overlap (Jaccard similarity over `topics` arrays) plus same magazine + nearby month.
- Show 3–5 cards at the bottom of every issue and article page.

### 5.6 Issue-page editorial structure

NAMAH's issue page = cover + a real **table of contents** with thumbnails, titles, authors, excerpts. Ours currently shows cover + topics + buttons. Upgrade the issue page to:

- Cover (already there).
- Editorial blurb (short — pulled from the issue's `description`, which we already store).
- **Table of contents** — list of articles inside the issue (once §5.1 lands), each as a clickable card.
- Read in-app / Download PDF / Bookmark / Share buttons (already there).
- Related issues by topic.

### 5.7 "About AIM" page in navigation

Currently there's no About page. Add `/about` — surface the project's mission, parent org links, languages covered, archive scope, editorial credits. This page is reachable from header + footer.

### 5.8 Events section

Reserve `/events` and a stub page now even if empty. The Society runs talks, retreats, courses — the structure should exist so content can be poured in without a new feature build.

### 5.9 Subscribe / mailing list

NAMAH delegates this to the parent Society's signup portal. AIM should do the same in the short term — a "Subscribe" link in the header pointing to the Society's existing mailing-list signup, so readers get notified when a new issue lands. Long term we can run our own list.

### 5.10 Volume / issue numbering convention

NAMAH uses "Volume 34, Issue 1" — a publication-industry convention. AIM today uses "Month-Year". Consider surfacing both:
- Primary label: "April 2026" (what people search for).
- Secondary label: "Volume 36, Issue 4" (what citations and archivists need).
- Computed from earliest known issue date.

### 5.11 Citation block

For researchers and students: every article and issue page should expose a one-click "Cite this" block (APA / MLA / Chicago) that quotes the magazine name, year, month, page range, and stable URL.

### 5.12 Footer parity with the SAS family

Adopt the NAMAH footer structure for cross-linking the Sri Aurobindo Society family of sites:
- Sri Aurobindo Society
- Sri Aurobindo Ashram
- Institute For Integral Yoga Psychology
- Sri Aurobindo Sadhana Peetham
- NAMAH journal (sibling)

This signals lineage and helps SEO across the family.

### 5.13 Volunteer / Support Us links

Add header or footer CTAs linking to the Society's volunteer + donate pages — same destinations NAMAH uses.

---

## 6. Where AIM Should Surpass NAMAH

These are deliberate choices to leapfrog NAMAH and define AIM as the modern flagship of the SAS digital family.

1. **Search, search, search.** NAMAH appears to lack global full-text search. AIM already has it across OCR'd PDF pages. Make it dazzling: instant search-as-you-type, jump-to-page, highlighted snippets, search-within-issue, search-within-author, search-within-topic.
2. **In-app reading experience.** PDF reader with zoom, fullscreen, page scrubber, dark mode, font-size, and *continuous reading mode* (rendered OCR text reflowed for mobile). Add a "Continue reading" rail on the homepage that resumes a reader's last issue and last page.
3. **Multilingual first.** NAMAH is English-only. AIM is multilingual by design — a UI language switcher (English / Hindi / Tamil / Bengali / Marathi), with locale-aware browsing. Hindi, Tamil, Bengali, Marathi indexing for OCR + search.
4. **Mobile app with offline reading.** Already on the roadmap. Download an issue once, read forever on a flight or in a power cut. NAMAH has nothing here.
5. **Bookmarks and a personal library.** Already in place via Zustand + localStorage. Phase 2 adds Google sign-in for cross-device sync.
6. **Beautiful design system.** Gold + flame palette, Playfair Display for headings, Inter for body, smooth Framer Motion transitions, content-first composition. NAMAH is competent but visually dated — AIM is the SAS family's digital flagship.
7. **Performance.** Next.js 15 + Vercel Edge + Supabase Mumbai region — sub-second LCP target. Skeletons over spinners; no `backdrop-blur` or heavy CSS that lags scrolling.
8. **Accessibility.** WCAG AA contrast, keyboard navigation, screen-reader-friendly PDF reader, language tags on multilingual content, font-size controls.
9. **Share with cover image attached** (already shipped via `navigator.share({files})`) — NAMAH has no share buttons at all.
10. **Quote of the day / This Day in AIM.** Surface a luminous excerpt on the homepage and rotating across visits — encourages return visits and feels alive.
11. **Public analytics, opt-in.** Already modeled in `analytics_visibility`. Show "X readers this month" on the homepage if admins enable it — community signal.
12. **Editor's note voice.** Each issue can carry a short editorial intro (we already store `description`); use it as the issue page's lede paragraph above the table of contents.
13. **Annotations and highlights** (Phase 3+). When a user is signed in, allow them to highlight passages in the in-app reader and revisit them in their library. Researchers' dream.
14. **Pronunciation / glossary tooltips** for Sanskrit and integral-yoga terms — hover or tap a term to see its meaning. Educational layer NAMAH does not provide.
15. **"On This Day" historical highlights** (already in the Phase 4 roadmap) — surface the issue published this month in past years.

---

## 7. Visual & Editorial Voice — What We Inherit, What We Express

### Inherit from the SAS family
- The luminous flame imagery and warm gold palette of the AIM logo.
- The scholarly, calm tone of the NAMAH typography.
- The footer cross-links and parent-org branding.

### Express uniquely as AIM
- Cream / off-white backgrounds (#FFFCF5) — *bright like an ashram library*, not the cold white of a journal.
- Gold accents (`gold-*`) and flame accents (`flame-*`) on hover, focus, and active states.
- Playfair Display headings for spiritual gravitas; Inter body for clean readability.
- Subtle Framer Motion micro-interactions (card lift, stagger on grid, smooth page transitions).
- Multilingual typography that respects Devanagari, Tamil, Bengali, Marathi scripts at parity with Latin.
- Photography of bound magazines and ashram light, never stock spirituality clichés.

The site should feel like a **modern temple library**: bright, ordered, hushed, and reverent. Every interaction is small, smooth, and considered.

---

## 8. Concrete Roadmap Additions Suggested by NAMAH

These slot into the existing `ROADMAP.md` phases.

### Phase 1.5 (current — polish + deploy)
- [ ] Add `/about` page in nav and footer.
- [ ] Reorganise footer with parent-org cross-links (NAMAH parity).
- [ ] Add Volunteer / Support / Subscribe links pointing to `aurosociety.org` portals.
- [ ] Add sibling-publication callout linking to NAMAH.
- [ ] Add reading-time estimate on issue cards (computed from existing OCR word counts).

### Phase 2 (enhanced web)
- [ ] **Article abstraction**: schema, admin tool to define article boundaries within a PDF, article-level web pages.
- [ ] **Author abstraction**: schema, `/authors` index, `/authors/{slug}` pages.
- [ ] **Topic landing pages**: `/topics` and `/topics/{slug}`.
- [ ] **Related issues / articles** by topic similarity.
- [ ] **Citation block** on issue and article pages.
- [ ] **Volume / issue numbering** as secondary label.
- [ ] **Newsletter signup** (delegate to SAS portal initially).
- [ ] **Quote of the day / This Day in AIM** on homepage.
- [ ] **Continuous reading mode** — reflowed OCR text for mobile.
- [ ] **Dark mode** + font-size controls in the reader.
- [ ] Audit search to add: search-within-author, search-within-topic, search-within-issue.

### Phase 3 (mobile)
- [ ] All Phase 2 features available on mobile.
- [ ] Offline reading + downloaded library.
- [ ] Push notifications when a new issue is published (Society-managed).

### Phase 4 (editorial richness)
- [ ] Annotations and highlights.
- [ ] Glossary tooltips for spiritual / Sanskrit terms.
- [ ] "On This Day" surface.
- [ ] Events section, populated.
- [ ] Public analytics (opt-in).

---

## 9. Guiding Principles — How We Decide Trade-offs

When a feature decision is unclear, fall back to these:

1. **Content is the hero, UI gets out of the way.** Never let a feature crowd the magazine.
2. **Bright, calm, reverent.** Not flashy, not dark, not cluttered.
3. **Multilingual at parity.** Hindi, Tamil, Bengali, Marathi readers should feel as cared-for as English readers.
4. **Search is sacred.** Anything that improves discoverability of a passage in the archive is high-priority.
5. **Free and accessible forever.** No paywalls, no logins required to read, no JavaScript-required basic reading.
6. **Modern, fast, durable.** Sub-second loads, no scroll lag, runs on a Mumbai 4G connection.
7. **The SAS family looks unified.** Cross-link generously; never compete with NAMAH or Ashram sites — complement them.
8. **Foundation must be spotless.** Per the project's standing quality bar — no shortcuts, no half-finished implementations.

---

## 10. Open Questions for the Boss

These are decisions worth confirming before building Phase 2:

1. Should "articles" inside an issue be human-curated (admin defines boundaries in the PDF) or auto-detected (heuristic on headings)?
2. Are there official author lists from the Society that we can ingest, or do we curate as we go?
3. Should AIM's subscribe/donate flow be entirely delegated to `aurosociety.org`, or do we run a lightweight mailing list ourselves?
4. Is a print-purchase option ever in scope? (NAMAH is print + e-journal — does AIM have a back-issue print store?)
5. What's the right tone for the editorial blurb on each issue page — devotional, curatorial, neutral?
6. Should there be an explicit visual / verbal cross-link to NAMAH on AIM's site (and vice versa), to signal sibling publications?
7. Is the `aimarchive.aurosociety.org` subdomain confirmed, and should we mirror NAMAH's URL conventions (`/articles/`, `/issues/`, `/authors/`) for SEO and family consistency?

---

## 11. Sources

- [NAMAH homepage](https://namahjournal.com/)
- [About NAMAH](https://namahjournal.com/page/about-namah)
- [Articles index](https://namahjournal.com/articles)
- [Issues index](https://namahjournal.com/issues)
- [Authors index](https://namahjournal.com/authors)
- [Categories index](https://namahjournal.com/articles/category)
- [Events](https://namahjournal.com/events)
- [Contact Us](https://namahjournal.com/contact-us)
- [Sri Aurobindo Society (parent)](https://aurosociety.org/)
- [Sri Aurobindo Ashram](https://www.sriaurobindoashram.org/)
