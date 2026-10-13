# Navigation Management System Roadmap

> Historical record, archived 19 September 2026. Status claims and commands below describe the original work; use [the active TODO](../../TO%20DO%20LIST.md) and current operating guides for today's tasks. This record does not authorize replaying migrations or deployments.

## Purpose

Build a dedicated admin Navigation Management system that lets admins control public website navigation without code edits, while preserving AIM Archive's existing flame/gold visual language and preventing broken or misleading links.

This roadmap is the working task list for the feature.

## Implementation Status

Implemented locally:

- Turso navigation migration and default seed data.
- Shared navigation defaults, route registry, validation, repository, and fallback logic.
- Public and protected admin navigation APIs.
- `/admin/navigation` UI with menu selector, ordered link list, destination editor, reset defaults, delete confirmation, and keyboard reorder controls.
- Admin sidebar and dashboard entry for Navigation.
- Public Header/Footer integration with server-loaded navigation props and source defaults as fallback.
- Local smoke database migration through `pnpm.cmd migration:apply:turso -- --local`.

Verification completed:

- `pnpm.cmd --filter @aim-archive/web exec tsc --noEmit --pretty false`
- `pnpm.cmd --filter @aim-archive/web lint`
- `pnpm.cmd --filter @aim-archive/web build`
- Public `/api/navigation` smoke returned `200`.
- Unauthenticated `/admin/navigation` redirects to `/admin/login`.
- Unauthenticated `/api/admin/navigation` returns `401`.

Remaining deployment gate:

- Apply `packages/turso/migrations/00002_navigation_management.sql` to the configured remote Turso database before admin navigation writes can work against production/remote development data. Public pages are safe before that because they fall back to source defaults.

## Current Reality

- Public header navigation is hard-coded in `apps/web/src/components/layout/header.tsx`.
- Public footer navigation is hard-coded in `apps/web/src/components/layout/footer.tsx`.
- Admin sidebar navigation is hard-coded in `apps/web/src/app/admin/(dashboard)/admin-shell.tsx`.
- The current Settings section only stores feedback form URLs through `site_settings`.
- There is no public Pages CMS. The navigation system must not imply admins can create pages that do not exist.

## Product Scope

### In Scope

- Add an admin section at `/admin/navigation`.
- Manage public header links.
- Manage mobile menu links.
- Manage footer link groups.
- Manage link labels, destination type, destination target, order, visibility, and open-in-new-tab behavior.
- Provide destination validation so admins choose from safe known routes or validated external URLs.
- Provide a live preview of header, mobile menu, and footer navigation.
- Provide fallback defaults so the public site never loses core navigation if the database or API fails.

### Later Scope

- Nested header submenus beyond one level.
- Custom page creation and content editing.
- Role-based admin permissions.
- Per-language navigation labels.
- Navigation analytics.
- Scheduled publishing.

### Out of Scope For First Release

- Creating arbitrary frontend pages.
- Replacing Next.js routing.
- Letting admins edit admin sidebar links.
- Letting admins enter unsafe protocols such as `javascript:`.
- Drag-and-drop between unrelated menu locations unless validation is finished first.
- Header dropdowns or header submenus.

## Final Accepted Decisions

These decisions are accepted and should be treated as implementation constraints.

- Header/Footer rendering: use server-loaded navigation passed into Header/Footer props where possible.
- Cache freshness: use short public cache plus explicit revalidation after admin writes.
- Header link cap: allow at most 5 published top-level header links.
- Submenus: no header dropdowns in v1; child links are allowed only for footer-style groups where explicitly supported.
- Issue destinations: default to issue detail pages (`/issue/[id]`), not reader pages.
- Footer magazine links: manually managed, but created through a magazine picker that generates safe Browse URLs.
- Feedback link: Settings owns the actual feedback URL; Navigation may reference it through `link_type = feedback`.
- Admin sidebar: keep admin sidebar hard-coded in v1; only add the new Navigation admin entry manually.
- Public Admin link: keep only the protected footer/system Admin login link; block other public `/admin/*` navigation.
- Rollout: build database, API, and admin UI first; switch public Header/Footer to DB-backed navigation only after QA passes.

## Feature Principles

- Navigation must be hard to break.
- Admins should pick destinations from clear choices instead of guessing URLs.
- The public site must render even if navigation data is unavailable.
- Navigation changes must have a clear freshness policy: either immediate invalidation or a visible delay warning.
- All privileged writes must call `verifyAdmin()`.
- Public navigation must only expose published links.
- The UI must match the current AIM admin theme: white surfaces, gray workspace, flame/gold highlights, Lucide icons, restrained shadows, compact professional density.
- Mobile navigation behavior must remain smooth and predictable.
- Public navigation must not expose arbitrary admin routes, except the intentional footer/system Admin login link.
- Every icon-only admin control must have an accessible label.

## Recommended UX

### Admin Page Layout

Use a three-zone layout:

1. Left rail: navigation locations
   - Header
   - Mobile Menu
   - Footer: Archive
   - Footer: Magazines
   - Footer: About
   - System Links

2. Main panel: ordered links for the selected location
   - Link label
   - Destination summary
   - Status
   - Order controls
   - Edit button
   - Duplicate button
   - Delete button

3. Right panel or drawer: link editor and preview
   - Label
   - Destination type
   - Destination picker
   - Published toggle
   - Open in new tab toggle
   - Preview path
   - Validation messages

### Visual Direction

- Page heading: `Navigation`
- Eyebrow: `Site controls`
- Primary CTA: `New link`
- Secondary CTA: `Reset defaults`
- Use `Navigation`, `Link`, `ExternalLink`, `GripVertical`, `Eye`, `EyeOff`, `Save`, `Undo2`, `Trash2`, `Copy`, and `PanelTop` Lucide icons.
- Use the existing admin shell spacing: `p-6 lg:p-8`.
- Cards should use rounded-xl or rounded-2xl only where the admin already does.
- Avoid the beige/table-heavy style from the reference image.
- Include a compact table/list mode for power editing, but do not make it the only experience.

## Destination Types

First release should support:

- `route`: known built-in public route.
- `magazine`: browse page filtered to one magazine.
- `topic`: browse or search route prefilled with a topic/query.
- `issue`: link to a published issue detail page or reader.
- `external`: validated http(s) URL.
- `feedback`: current feedback form URL from site settings.

Known route options:

- Home: `/`
- Browse: `/browse`
- Search: `/search`
- Bookmarks: `/bookmarks`

Issue destination rules:

- Only published issues should be selectable.
- Embargoed issues should not link to reader pages.
- If an issue becomes draft/unpublished later, the navigation item should be marked invalid in admin and hidden publicly.

External destination rules:

- Only `http:` and `https:` protocols.
- Default to opening in a new tab.
- Show the hostname in previews.

## Proposed Data Model

Add a Turso migration after `packages/turso/migrations/00001_initial_schema.sql`.

### `navigation_menus`

- `id TEXT PRIMARY KEY`
- `key TEXT UNIQUE NOT NULL`
- `label TEXT NOT NULL`
- `location TEXT NOT NULL`
- `description TEXT`
- `is_active INTEGER NOT NULL DEFAULT 1`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- `updated_by TEXT REFERENCES admins(id)`

Expected seeded keys:

- `header`
- `mobile`
- `footer_archive`
- `footer_magazines`
- `footer_about`
- `system`

### `navigation_items`

- `id TEXT PRIMARY KEY`
- `menu_id TEXT NOT NULL REFERENCES navigation_menus(id) ON DELETE CASCADE`
- `parent_id TEXT REFERENCES navigation_items(id) ON DELETE CASCADE`
- `label TEXT NOT NULL`
- `link_type TEXT NOT NULL`
- `href TEXT NOT NULL DEFAULT ''`
- `route_key TEXT`
- `target_id TEXT`
- `params_json TEXT NOT NULL DEFAULT '{}'`
- `icon TEXT`
- `order_index INTEGER NOT NULL DEFAULT 0`
- `is_published INTEGER NOT NULL DEFAULT 1`
- `opens_new_tab INTEGER NOT NULL DEFAULT 0`
- `last_validated_at TEXT`
- `validation_status TEXT NOT NULL DEFAULT 'valid'`
- `validation_message TEXT`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- `updated_by TEXT REFERENCES admins(id)`

Indexes:

- `idx_navigation_items_menu_order` on `(menu_id, order_index)`
- `idx_navigation_items_parent` on `(parent_id)`
- `idx_navigation_items_published` on `(is_published)`

## Default Navigation Seed

Header:

- Home -> `/`
- Browse -> `/browse`
- Search -> `/search`
- Bookmarks -> `/bookmarks`

Mobile:

- Home -> `/`
- Browse -> `/browse`
- Search -> `/search`
- Bookmarks -> `/bookmarks`

Footer Archive:

- Browse All Issues -> `/browse`
- Search Archive -> `/search`
- My Bookmarks -> `/bookmarks`

Footer Magazines:

- All India Magazine -> `/browse?magazine=all-india-magazine`
- Agnishikha -> `/browse?magazine=agnishikha`

Footer About:

- Sri Aurobindo Society -> `https://aurosociety.org`
- AIM Website -> `https://aim.aurosociety.org`

System:

- Admin -> `/admin/login`
- Share feedback -> feedback form URL

## API Plan

### Public API

`GET /api/navigation`

Returns published navigation grouped by location. Must cache at the edge:

- `Cache-Control: public, s-maxage=300, stale-while-revalidate=1800`

Freshness policy:

- Admin writes should call route/tag revalidation where feasible.
- If edge cache invalidation is not implemented in the first pass, the admin UI must clearly state that public navigation changes may take up to 5 minutes to appear.
- Public rendering must still use code defaults if the API, database, or response validation fails.

Response shape:

```ts
interface PublicNavigationResponse {
  menus: Array<{
    key: string;
    label: string;
    location: string;
    items: PublicNavigationItem[];
  }>;
}

interface PublicNavigationItem {
  id: string;
  label: string;
  href: string;
  link_type: string;
  opens_new_tab: boolean;
  children: PublicNavigationItem[];
}
```

### Admin API

All routes must call `verifyAdmin()`.

- `GET /api/admin/navigation`
- `POST /api/admin/navigation/items`
- `PUT /api/admin/navigation/items/[id]`
- `DELETE /api/admin/navigation/items/[id]`
- `POST /api/admin/navigation/reorder`
- `POST /api/admin/navigation/reset-defaults`
- `POST /api/admin/navigation/menus/[key]/reset-defaults`
- `GET /api/admin/navigation/destinations`

`GET /api/admin/navigation/destinations` should provide route, magazine, issue, topic, feedback, and external-link support data for the editor.

Mutation requirements:

- Mutations must return the updated menu snapshot.
- Mutations must normalize `order_index` values after create, delete, and reorder.
- Reorder requests must reject duplicate item IDs.
- Reorder requests must reject cross-menu moves unless the endpoint explicitly supports them.
- Mutations must update `updated_by` and `updated_at`.
- Mutations must trigger the configured navigation freshness policy.

## Operational Requirements

### Rendering Architecture

The implementation must choose one rendering strategy before coding Header/Footer integration:

Accepted first release:

- Load public navigation in server components where possible and pass it to client components as props.
- Keep `Header` and `Footer` interactive where needed, but avoid client-only navigation fetching that causes visible default-to-database link swapping.
- If a page cannot provide navigation props, `Header` and `Footer` must use shared fallback defaults.

Required behavior:

- No layout shift when DB navigation replaces fallback defaults.
- Existing `HeaderSearchDropdown` behavior on Browse and Bookmarks remains intact.
- Existing bookmark count behavior remains intact.
- Existing footer feedback button behavior remains intact.

### Route Registry And Active Matching

Add a shared route registry used by defaults, validation, admin destination picker, and active-link rendering.

Each route registry entry should include:

- `route_key`
- `label`
- `href`
- `description`
- `active_match`: exact, prefix, query-aware, or custom matcher
- `allow_public_navigation`
- `allow_header`
- `allow_footer`
- `allow_mobile`

Required active states:

- `/` matches only home.
- `/browse` matches Browse, including supported query variants.
- `/search` matches Search.
- `/bookmarks` matches Bookmarks.
- `/issue/[id]` should not accidentally highlight Browse unless deliberately configured.
- `/read/[id]` should not accidentally highlight Browse unless deliberately configured.
- External links should not receive active state.

Accepted route behavior:

- Header and footer route matching must be driven by the shared route registry.
- Issue navigation items must generate `/issue/[id]`.
- Reader links are not selectable as issue destinations in v1.
- Public `/admin/*` destinations are blocked except the protected Admin login system link.

### Cache And Invalidation

Navigation writes must choose and document one of these:

- Immediate revalidation using Next cache tags/paths.
- Short edge cache with visible admin delay notice.

Accepted first release:

- Use a short public navigation cache.
- After admin mutations, call revalidation for `/`, `/browse`, `/search`, `/bookmarks`, `/issue/[id]` where practical, and the `/api/navigation` cache path/tag.
- Keep code-level defaults as the final fallback.

### Fallback And Malformed Data Handling

Public navigation rendering must tolerate:

- Missing menu rows.
- Duplicate menu keys.
- Malformed `params_json`.
- Unknown `link_type`.
- Unknown `route_key`.
- Published child with unpublished parent.
- External URL that no longer validates.
- Empty published header.

Required behavior:

- Invalid items are hidden publicly.
- Invalid items remain visible in admin with warning status.
- Missing menus are filled from code defaults.
- Empty header falls back to default header links.
- Duplicate menu keys prefer the latest valid row and log/flag the conflict in admin.

### Concurrency And Editing Safety

First release does not need full real-time collaboration, but it must avoid silent data loss.

- Include `updated_at` in admin payloads.
- If a save updates a stale item, either warn and reload or apply last-write-wins deliberately with a visible post-save refresh.
- Reorder should operate on the latest server snapshot and return the normalized result.

### Rollout And Migration

The rollout must be reversible until public Header/Footer integration is complete.

- Add migration and seed defaults first.
- Build read APIs and admin UI before switching public Header/Footer.
- Keep hard-coded defaults in source until DB-backed navigation has passed QA.
- Document how to apply the Turso migration locally and remotely.
- Seed scripts/migrations must be idempotent.
- Do not remove existing header/footer arrays until fallback defaults exist in shared code.
- Public Header/Footer integration is the second rollout step, not part of the first DB/admin UI checkpoint.

### Accessibility Requirements

- Admin drawer or modal must trap focus and restore focus on close.
- Drag reordering must have keyboard-accessible alternatives such as Move up / Move down buttons.
- Published/draft and valid/invalid states must use text labels, not color alone.
- Icon-only actions must include `aria-label`.
- Preview panes must not be the only way to understand a destination.

## Repository Implementation Plan

### Phase 1: Data And Types

- [ ] Add Turso migration for `navigation_menus` and `navigation_items`.
- [ ] Seed default navigation menus and items.
- [ ] Add TypeScript types in `apps/web/src/lib/navigation.ts`.
- [ ] Add shared route registry and default navigation module.
- [ ] Encode accepted route behavior in the route registry.
- [ ] Add validation schemas in `apps/web/src/lib/validations.ts`.
- [ ] Add repository file `apps/web/src/lib/db/navigation-repository.ts`.
- [ ] Export navigation repository functions from `apps/web/src/lib/db/index.ts`.
- [ ] Add response sanitation helpers for malformed navigation rows.

Acceptance criteria:

- [ ] Migration can be applied locally.
- [ ] Default navigation data exists after migration.
- [ ] Repository can read public grouped navigation.
- [ ] Repository can read admin grouped navigation including drafts.
- [ ] Route registry blocks public navigation to unintended admin routes.
- [ ] Header defaults include no more than 5 top-level links.
- [ ] Seed data is idempotent.

### Phase 2: API

- [ ] Add `apps/web/src/app/api/navigation/route.ts`.
- [ ] Add `apps/web/src/app/api/admin/navigation/route.ts`.
- [ ] Add `apps/web/src/app/api/admin/navigation/items/route.ts`.
- [ ] Add `apps/web/src/app/api/admin/navigation/items/[id]/route.ts`.
- [ ] Add `apps/web/src/app/api/admin/navigation/reorder/route.ts`.
- [ ] Add `apps/web/src/app/api/admin/navigation/reset-defaults/route.ts`.
- [ ] Add per-menu reset endpoint.
- [ ] Add `apps/web/src/app/api/admin/navigation/destinations/route.ts`.
- [ ] Implement cache freshness policy for admin mutations.

Acceptance criteria:

- [ ] Public API returns only published links.
- [ ] Admin API returns drafts and invalid states.
- [ ] Unauthorized admin API requests return `401`.
- [ ] Invalid external URLs return `400`.
- [ ] Reordering rejects duplicate item IDs.
- [ ] Reordering normalizes `order_index`.
- [ ] Mutations return the updated menu snapshot.
- [ ] Mutations update `updated_by` and `updated_at`.

### Phase 3: Admin Navigation Page

- [ ] Add `/admin/navigation` page.
- [ ] Add admin sidebar item with a `Navigation` icon.
- [ ] Build location selector panel.
- [ ] Build ordered link list.
- [ ] Build link editor drawer.
- [ ] Build destination picker.
- [ ] Build live preview for header/footer/mobile.
- [ ] Add reset defaults confirmation.
- [ ] Add per-menu reset defaults action.
- [ ] Add empty state for menus with no links.
- [ ] Add invalid-link warning state.
- [ ] Add dashboard quick action/card for Navigation.
- [ ] Add keyboard reorder controls.
- [ ] Add visible last-updated metadata.
- [ ] Add visible cache delay or freshness messaging.
- [ ] Hide header submenu controls in v1.
- [ ] Provide magazine picker for footer magazine links.
- [ ] Provide issue picker that generates `/issue/[id]` destinations.

Acceptance criteria:

- [ ] Admin can create a link.
- [ ] Admin can edit label, destination, status, and new-tab behavior.
- [ ] Admin can reorder links.
- [ ] Admin can publish/unpublish links.
- [ ] Admin can delete links after confirmation.
- [ ] UI matches existing AIM admin theme.
- [ ] Mobile admin view remains usable.
- [ ] Drawer/modal focus behavior passes keyboard check.
- [ ] Status is readable without relying on color.
- [ ] Admin cannot publish more than 5 top-level header links.

### Phase 4: Public Header And Footer Integration

- [ ] Add public navigation loader with fallback defaults.
- [ ] Implement server-loaded navigation props for Header/Footer where possible.
- [ ] Refactor `Header` to consume public navigation.
- [ ] Preserve bookmark count behavior.
- [ ] Preserve header search dropdown behavior for search-eligible routes.
- [ ] Refactor `Footer` to consume footer navigation groups.
- [ ] Preserve feedback button behavior.
- [ ] Ensure public navigation does not block first paint unnecessarily.

Acceptance criteria:

- [ ] Header renders default links if API/database fails.
- [ ] Footer renders default links if API/database fails.
- [ ] Mobile menu opens and closes smoothly.
- [ ] Active link state still works for built-in routes.
- [ ] Active link state follows route registry match rules.
- [ ] External links open with correct `target` and `rel`.
- [ ] Invalid public navigation data is hidden or replaced by defaults without visual breakage.
- [ ] No client-side default-to-database navigation swap is visible on first paint.

### Phase 5: Validation And QA

- [ ] Run TypeScript check.
- [ ] Run lint.
- [ ] Run production build.
- [ ] Test admin navigation page as unauthenticated user.
- [ ] Test admin navigation page as authenticated admin.
- [ ] Test public homepage header/footer.
- [ ] Test Browse, Search, Bookmarks, Issue, and Reader routes after nav integration.
- [ ] Test mobile viewport header and menu.
- [ ] Test broken database/API fallback behavior.
- [ ] Test external URL sanitation.
- [ ] Test draft issue links are hidden publicly.
- [ ] Test invalid issue links show admin warning.
- [ ] Test unauthorized admin navigation mutations.
- [ ] Test reorder normalization.
- [ ] Test cache freshness policy after save.

Recommended commands:

```powershell
pnpm --filter @aim-archive/web exec tsc --noEmit --pretty false
pnpm --filter @aim-archive/web lint
pnpm --filter @aim-archive/web build
```

## UX Acceptance Checklist

- [ ] The Navigation admin page feels native to the current admin dashboard.
- [ ] No table-only management experience for first-time admins.
- [ ] The main workflow is obvious: pick location, pick link, edit destination, save.
- [ ] Each destination type gives a constrained picker where possible.
- [ ] Dangerous operations use confirmation.
- [ ] Validation errors are inline and specific.
- [ ] Preview updates before saving.
- [ ] Public header and footer do not shift or flash awkwardly.
- [ ] Mobile navigation remains compact and readable.

## Data Integrity Rules

- [ ] `label` is required and capped at 80 characters.
- [ ] `link_type` must be one of the supported destination types.
- [ ] `href` must be generated from selected destination where possible.
- [ ] External URLs must be valid `http(s)` URLs.
- [ ] Published issue links must point to published issues.
- [ ] Draft or invalid navigation items must not render publicly.
- [ ] Public links to `/admin/*` are blocked except the intentional Admin login system link.
- [ ] Header top-level published links are capped at 5 to preserve layout.
- [ ] Child links are allowed only in explicitly supported footer-style menus for first release.
- [ ] Issue destination links generate `/issue/[id]` only in first release.
- [ ] Feedback links reference the Settings-owned URL and do not duplicate the URL in navigation item data.
- [ ] Deleting a parent item deletes or detaches children according to the final implementation decision.
- [ ] Reordering must normalize `order_index` values.
- [ ] `params_json` must parse to an object or the item becomes invalid.

## Fallback Strategy

Use code-level defaults for public navigation. Defaults should live in one shared module so Header, Footer, and tests reference the same source.

Public rendering order:

1. Try database-backed navigation.
2. If unavailable, use code defaults.
3. If a specific menu is missing, fill that menu from defaults.
4. Never render an empty header because of admin data errors.
5. Hide invalid public items, but show them in admin with a warning.
6. If DB data produces no valid header links, render the default header.

## Open Questions

- None blocking after accepted decisions above.
- Revisit after v1 only if a Pages CMS or public account system changes the navigation model.

## Risk Register

- Risk: Admin creates links to non-existent pages.
  - Mitigation: destination picker and route registry.

- Risk: Navigation API failure breaks public site.
  - Mitigation: code-level fallback defaults.

- Risk: Header becomes visually crowded.
  - Mitigation: cap published header links and support mobile-specific menu.

- Risk: Footer becomes unstructured.
  - Mitigation: manage footer groups as separate menus, not one flat list.

- Risk: Scope expands into full CMS.
  - Mitigation: keep custom page creation out of first release.

- Risk: Public navigation changes do not appear when admins expect.
  - Mitigation: implement revalidation or display the cache delay clearly.

- Risk: Client-side navigation fetch causes header/footer layout shifts.
  - Mitigation: prefer server-loaded navigation props or dimension-stable fallbacks.

- Risk: Two admins overwrite each other's navigation changes.
  - Mitigation: use updated timestamps, refresh after save, and return normalized snapshots.

- Risk: Keyboard users cannot reorder links.
  - Mitigation: provide Move up / Move down controls in addition to drag.

## Suggested Implementation Order

1. Migration and seed data.
2. Shared navigation defaults and route registry.
3. Repository read functions.
4. Public API.
5. Admin API read-only endpoint.
6. Admin sidebar link and read-only Navigation page.
7. Destination picker and validation warnings.
8. Create/edit/delete/reorder mutations.
9. Cache freshness policy.
10. Public Header integration.
11. Public Footer integration.
12. QA, build, accessibility, and mobile visual pass.

## Done Definition

- Admins can manage public header, mobile, and footer navigation from `/admin/navigation`.
- Public navigation renders from database-backed configuration.
- Public navigation has safe code defaults.
- Admin destination selection prevents broken links wherever possible.
- The UI matches the existing AIM Archive admin theme.
- Navigation cache/freshness behavior is implemented or clearly shown to admins.
- Invalid navigation data cannot break public Header/Footer rendering.
- Keyboard users can manage and reorder links.
- TypeScript, lint, and production build pass.
- Homepage, Browse, Search, Bookmarks, Issue Detail, Reader, and Admin Dashboard still load.
