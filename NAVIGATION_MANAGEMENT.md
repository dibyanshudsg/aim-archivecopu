# Navigation management

Updated: 19 September 2026.

Admins manage public links at `/admin/navigation`. Source defaults and validation live in [navigation.ts](apps/web/src/lib/navigation.ts); persistence is in [navigation-repository.ts](apps/web/src/lib/db/navigation-repository.ts). Schema: [migration 00002](packages/turso/migrations/00002_navigation_management.sql).

## Operating rules

- Locations: Header, Mobile Menu, Footer Archive, Footer Magazines and Footer About.
- Edit labels, destinations, publication state, order and new-tab behavior. Use the destination picker for routes, magazines, topics, issues and feedback; external URLs must pass validation.
- Header permits at most five published links. Header dropdowns and arbitrary page creation are outside this feature.
- Issue destinations lead to issue detail. Settings owns the feedback URL; navigation references it.
- Admin sidebar links remain code-managed. Public admin navigation is restricted to the intentional login link.
- Reset defaults replaces the selected menu's customization. The API can reset all menus when no menu key is supplied; check the intended scope before using it.

## Rendering and verification

Header/Footer consume server-loaded navigation with source defaults as fallback. Admin mutations authenticate through `verifyAdmin()` and invalidate public navigation surfaces. A public fallback rendering successfully does not prove database writes work.

For a new database, apply the navigation migration deliberately before enabling writes. Check authorized create/edit/reorder/reset, public desktop/mobile rendering and unauthenticated rejection using disposable entries. Remaining production mutation checks are tracked in [TO DO LIST.md](TO%20DO%20LIST.md).

The [original navigation plan](docs/archive/NAVIGATION_MANAGEMENT_ROADMAP.md) preserves design decisions and local verification history; its deployment gates and unchecked tasks are historical.
