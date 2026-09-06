# Search Indexing workspace

## Overview

Scoped implementation record for `/admin/indexing`, `workspace.tsx`, `page-review-editor.tsx`, and the nested admin PDF preview. Mode: **Operate**. Admins inspect catalogue coverage, start eligible work inside Admin, resolve withheld pages, and follow run and review history. The approved direction preserves the incumbent white/gold/flame admin theme, typography, navigation, and component character. This record establishes no global tokens or replacement identity.

## Colors

White surfaces and gray borders sit on the inherited pale admin background. Dark gray headings and quieter gray supporting text establish hierarchy. Primary indexing actions use the existing gold-to-flame gradient with dark gray (`gray-900`) text; preserve that text contrast. Flame accents identify selected tabs, metric filters, hover, focus, and progress. Red means failure, amber means review or insufficient evidence, green means indexed or connected, and neutral badges carry other states. Every state also has a written label.

## Typography

The page heading inherits the heading family at 24px bold. Controls and primary row content use 14px text; metadata uses 12px. Counts use 24px semibold tabular numerals. Issue themes lead, with the full edition title below; when no theme exists, the title leads. Drawer headings use 18px semibold. Preview titles use the heading family at 20px bold.

## Layout

The page flows from title and catalogue-wide actions through worker connectivity, five coverage metrics, a collapsed explanation, view tabs, filters, selection controls, and results. Major regions use 24px vertical spacing. Metrics form two columns on phones, three at the small breakpoint, and five at the extra-large breakpoint. Header actions and filters wrap.

Coverage uses a divided table with selection, issue identity, and page coverage as the durable columns. Covers and the separate detail action hide below the small breakpoint; the issue title still opens details. Last-indexed dates appear at the large breakpoint. The table has a local horizontal-overflow container. Pagination follows the table; history uses divided rows with its own pagination.

The native modal dialog forms a right-hand drawer, full viewport height and up to 36rem wide, occupying the phone width. Header padding is 20px horizontally and 16px vertically; content uses 20px padding and 24px section gaps. The PDF preview is a separate admin route with a return link, issue title, wrapping page controls, and a responsive page canvas capped at 800px wide.

## Elevation & Depth

Ordinary sections rely on borders and spacing. The drawer alone adds a strong shadow and a translucent black modal backdrop. Preserve the restrained admin surface without decorative blur or continuous motion.

## Shapes

Section containers use 12px corners; controls use 8px corners and at least 40px height. Status badges use 6px corners. Table and history entries remain divided rows rather than independent cards.

## Components

- Coverage metrics act as status filters. The initial view is Needs attention. Search, status, magazine, year, and publication filters narrow the catalogue; changing a filter returns to the first page. Search is debounced.
- Start indexing processes missing and queued work, skips completed indexes, and remains distinct from Retry failed and confirmed selected rebuilds. Each run handles up to three issues; remaining work requires another start. Retry and rebuild confirmations explain their catalogue or selected-issue scope, skipped active jobs and unsupported editions, and preservation of verified decisions for unchanged PDFs. Selection persists across pages until cleared or successfully queued.
- Dispatch status is written beside the primary action and distinguishes unavailable configuration, waiting for admission, running, failure, and an unconfirmed request. Start indexing is disabled while configuration is unavailable, data is loading or stale, a run is active, or no eligible work remains. The current deployment has no configured dispatch token in Vercel; this record does not claim live dispatch is ready. Worker connectivity and the last actual manual check remain separate evidence. Queued work stays saved. Refresh and automatic updates keep coverage and details current; errors warn that retained data may be stale.
- Release unconfirmed request appears only for an unknown dispatch outcome and requires confirmation. Its explanation states that only a request without an admitted worker can be released, saved pages and queued issues remain, and a delayed worker for that request exits.
- Dates and times use the explicit `Asia/Kolkata` time zone with the `en-IN` locale so server and browser render the same time. Heartbeat and automatic-retry times include an `IST` label. This time-display behavior preserves the existing layout and styling.
- Coverage and Activity / History are keyboard-operable tabs, with arrow, Home, and End navigation. History records each run separately and distinguishes reconciled rebuild evidence, including attempts that were not recorded.
- Details expose searchable, blank, and withheld pages; evidence; processing stage and native progress; retry information; source-review links; contextual indexing actions; and up to 30 recent runs. Unsupported or unavailable PDFs receive explanatory text. The native dialog opens modally, focuses its close control, and supports Escape. It closes before opening the queue confirmation.
- Withheld-page links open the authenticated admin preview at the requested page. Previous, Next, and a bounded numeric page input navigate the PDF. Loading and rendering states are explicit; PDF load failure offers Retry PDF. The rendered canvas has text and annotation layers disabled. Preview access does not change publication state.
- Each withheld page has an Inspect PDF (new tab) link and a labeled review decision: add verified text to search or keep the page out of text search. Verified text uses a full-width textarea with a 20,000-character limit; the required review note allows 1,000 characters. Intentional exclusion explains that the PDF page stays visible while its text remains outside search and the review flag is resolved. The operator must check that they inspected the page; changing the decision or verified text clears that check. Save remains disabled for missing required input, a pending save, or queued/processing work, with an explanation for active indexing. Failures appear inline as alerts.
- Review submissions identify the PDF URL and source hash so decisions remain tied to the inspected source. Review history records the page, verified-text or intentional-exclusion decision, note, time, and expandable saved text; entries for a replaced source are labeled Previous PDF source. Reviews do not start a full rebuild.
- Inputs have accessible names, controls use visible flame focus outlines, result updates use a polite live region, and failures use alert regions. Disabled actions reflect unavailable work or pending requests. Empty coverage distinguishes no attention needed from no matching issues and points to relevant filters or active work.

## Do's and Don'ts

Indexing is manual-only, with Start indexing inside Admin as the operator action. Status remains visible before the first run; missing credentials must display an unavailable state and disable dispatch. The last actual manual check appears when recorded; old checks do not become overdue. Queue confirmations and upload guidance point to Start indexing. Existing layout and admin theme are preserved.

- Keep catalogue coverage and individual run history distinct.
- Preserve explicit bulk-action scope, evidence qualifications, and withheld-page review instructions.
- Keep issue identity and coverage readable on phones, with details reachable through the title.
- Preserve the existing admin theme and dark text on gradient actions.
- Do not infer deployment, public search freshness, or production counts from screenshots.

Finish-review handoff reports **Ship** for this narrow controls extension, with no material UI defects and detector findings `[]`. Current supplied evidence: `.impeccable/review/desktop.png`, `.impeccable/review/mobile.png`, `.impeccable/review/desktop-review.png`, and `.impeccable/review/mobile-review.png`. Browser checks passed. Lower review controls were covered by source and browser checks but were not all captured in these screenshots; this is not a claim of complete screenshot coverage. Earlier workspace and PDF-preview evidence remains in `.cache/indexing-qa/`. This record documents the implemented and reviewed surface, not successful live dispatch or deployment readiness.
