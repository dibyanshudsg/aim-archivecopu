# Search Indexing workspace

## Overview

Scoped implementation record for `/admin/indexing`, `workspace.tsx`, and the nested admin PDF preview. Mode: **Operate**. Admins inspect catalogue coverage, queue eligible work, investigate withheld pages, and follow run history. The approved direction preserves the incumbent admin gold/orange theme, typography, navigation, and component character. This record establishes no global tokens or replacement identity.

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
- Bulk actions explicitly confirm their scope. Index missing and Retry failed operate on up to 100 eligible issues across the catalogue, independent of current filters. Index selected rebuilds the selected issues. Active jobs and unsupported editions are skipped; results report queued and skipped work. Selection persists across pages until cleared or successfully queued.
- Worker status states connected or offline and shows the last heartbeat when recorded. Queued work remains saved while offline. Refresh and automatic updates keep coverage and details current; errors warn that retained data may be stale.
- Dates and times use the explicit `Asia/Kolkata` time zone with the `en-IN` locale so server and browser render the same time. Heartbeat and automatic-retry times include an `IST` label. This time-display behavior preserves the existing layout and styling.
- Coverage and Activity / History are keyboard-operable tabs, with arrow, Home, and End navigation. History records each run separately and distinguishes reconciled rebuild evidence, including attempts that were not recorded.
- Details expose searchable, blank, and withheld pages; evidence; processing stage and native progress; retry information; source-review links; contextual indexing actions; and up to 30 recent runs. Unsupported or unavailable PDFs receive explanatory text. The native dialog opens modally, focuses its close control, and supports Escape. It closes before opening the queue confirmation.
- Withheld-page links open the authenticated admin preview at the requested page. Previous, Next, and a bounded numeric page input navigate the PDF. Loading and rendering states are explicit; PDF load failure offers Retry PDF. The rendered canvas has text and annotation layers disabled. Preview access does not change publication state.
- Inputs have accessible names, controls use visible flame focus outlines, result updates use a polite live region, and failures use alert regions. Disabled actions reflect unavailable work or pending requests. Empty coverage distinguishes no attention needed from no matching issues and points to relevant filters or active work.

## Do's and Don'ts

Indexing is manual-only. The status and GitHub run link are always visible, including before the first run. The last actual manual check appears when recorded; old checks do not become overdue. Queue confirmations and upload guidance explicitly tell the operator to start Run workflow on main. Existing layout and admin theme are preserved.

- Keep catalogue coverage and individual run history distinct.
- Preserve explicit bulk-action scope, evidence qualifications, and withheld-page review instructions.
- Keep issue identity and coverage readable on phones, with details reachable through the title.
- Preserve the existing admin theme and dark text on gradient actions.
- Do not infer deployment, public search freshness, or production counts from screenshots.

Finish-review handoff reports **Ship** for the supplied workspace evidence after corrections. Evidence at the repository root: `.cache/indexing-qa/workspace-desktop.png`, `workspace-phone.png`, `workspace-phone-list.png`, `workspace-details.png`, `workspace-phone-details.png`, `workspace-history.png`, `workspace-preview.png`, and `workspace-preview-phone.png` in that same directory. This is a record of the implemented and reviewed surface; deployment remains outside this record.
