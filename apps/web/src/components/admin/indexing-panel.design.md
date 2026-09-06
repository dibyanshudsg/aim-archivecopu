# Search indexing shortcut

## Overview

Scoped implementation record for `indexing-panel.tsx` on the admin issues surface. Mode: **Operate**. The former expandable jobs panel is now a compact summary and link to `/admin/indexing`. Global colors, typography, and component character remain inherited from the incumbent admin UI. Operational details are documented in `apps/web/src/app/admin/(dashboard)/indexing/workspace.design.md`.

## Colors

The shortcut uses a white surface, gray border, dark gray heading, and quieter gray summary and link text. A pale flame background marks link hover; a flame outline marks keyboard focus. Counts remain written text rather than colored status indicators.

## Typography

The heading is semibold in the inherited body font. Summary and link use 14px text, with medium weight on the link.

## Layout

The title and summary sit together opposite “Open Search Indexing.” The flex row wraps with 12px gaps when space is constrained. Padding is 16px on all viewport sizes; the summary sits 4px below the heading. There is no expanded section.

## Elevation & Depth

The border defines the shortcut. It adds no shadow or layered visual effect.

## Shapes

The container has 12px corners. The bordered navigation link has 8px corners, 16px horizontal padding, and a minimum height of 40px.

## Components

- Summary: starts with “View coverage, missing editions, and indexing activity.” A successful catalogue request replaces it with need-indexing, failed, and need-page-review counts.
- Loading and failure: the explanatory fallback remains visible if the request is pending or fails. This shortcut has no separate error alert or refresh action.
- Navigation: “Open Search Indexing” links to the dedicated workspace, where filtering, job progress, retries, source review, and history now live.
- Accessibility: the section is named “Search indexing”; its navigation link has a textual name and visible keyboard focus.

## Do's and Don'ts

- Preserve the compact summary and direct workspace link.
- Keep the link usable when summary data cannot load.
- Inherit global admin styling when extending this panel.
- Do not restore duplicate job controls inside the shortcut.

This record is grounded in the current shortcut source. The previous expandable-panel fixture screenshots describe the retired implementation and are not evidence for this shortcut. See the workspace record for the dedicated surface's finish-review evidence; no deployment claim is made here.
