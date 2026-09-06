-- AIM Archive: website navigation management
-- Data-driven public header/mobile/footer menus managed from the admin panel.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS navigation_menus (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL CHECK (location IN ('header', 'mobile', 'footer')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_system INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS navigation_items (
  id TEXT PRIMARY KEY,
  menu_key TEXT NOT NULL REFERENCES navigation_menus(key) ON DELETE CASCADE,
  parent_id TEXT REFERENCES navigation_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('route', 'magazine', 'topic', 'issue', 'external', 'feedback')),
  route_key TEXT,
  target_id TEXT,
  href TEXT,
  params_json TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  opens_new_tab INTEGER NOT NULL DEFAULT 0,
  validation_status TEXT NOT NULL DEFAULT 'unchecked' CHECK (validation_status IN ('unchecked', 'valid', 'warning', 'broken')),
  validation_message TEXT,
  last_validated_at TEXT,
  created_by TEXT REFERENCES admins(id),
  updated_by TEXT REFERENCES admins(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_navigation_items_menu_order ON navigation_items(menu_key, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_navigation_items_published ON navigation_items(is_published);
CREATE INDEX IF NOT EXISTS idx_navigation_items_link_type ON navigation_items(link_type);
CREATE INDEX IF NOT EXISTS idx_navigation_items_target ON navigation_items(target_id);

INSERT INTO navigation_menus (key, title, description, location, sort_order, is_system, created_at, updated_at)
VALUES
  ('header', 'Header', 'Primary desktop navigation. Keep this focused.', 'header', 0, 1, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),
  ('mobile', 'Mobile Menu', 'Phone menu shown behind the hamburger button.', 'mobile', 1, 1, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),
  ('footer_archive', 'Footer - Archive', 'Archive discovery links in the footer.', 'footer', 2, 1, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),
  ('footer_magazines', 'Footer - Magazines', 'Magazine-specific footer links.', 'footer', 3, 1, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),
  ('footer_about', 'Footer - About', 'External and administrative footer links.', 'footer', 4, 1, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z')
ON CONFLICT(key) DO NOTHING;

INSERT INTO navigation_items (
  id, menu_key, parent_id, label, link_type, route_key, target_id, href, params_json,
  sort_order, is_published, opens_new_tab, validation_status, validation_message,
  last_validated_at, created_by, updated_by, created_at, updated_at
)
VALUES
  ('nav-header-home', 'header', NULL, 'Home', 'route', 'home', NULL, '/', '{}', 0, 1, 0, 'valid', NULL, '2026-07-05T00:00:00.000Z', NULL, NULL, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),
  ('nav-header-browse', 'header', NULL, 'Browse', 'route', 'browse', NULL, '/browse', '{}', 1, 1, 0, 'valid', NULL, '2026-07-05T00:00:00.000Z', NULL, NULL, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),
  ('nav-header-search', 'header', NULL, 'Search', 'route', 'search', NULL, '/search', '{}', 2, 1, 0, 'valid', NULL, '2026-07-05T00:00:00.000Z', NULL, NULL, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),
  ('nav-header-bookmarks', 'header', NULL, 'Bookmarks', 'route', 'bookmarks', NULL, '/bookmarks', '{}', 3, 1, 0, 'valid', NULL, '2026-07-05T00:00:00.000Z', NULL, NULL, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),

  ('nav-mobile-home', 'mobile', NULL, 'Home', 'route', 'home', NULL, '/', '{}', 0, 1, 0, 'valid', NULL, '2026-07-05T00:00:00.000Z', NULL, NULL, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),
  ('nav-mobile-browse', 'mobile', NULL, 'Browse', 'route', 'browse', NULL, '/browse', '{}', 1, 1, 0, 'valid', NULL, '2026-07-05T00:00:00.000Z', NULL, NULL, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),
  ('nav-mobile-search', 'mobile', NULL, 'Search', 'route', 'search', NULL, '/search', '{}', 2, 1, 0, 'valid', NULL, '2026-07-05T00:00:00.000Z', NULL, NULL, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),
  ('nav-mobile-bookmarks', 'mobile', NULL, 'Bookmarks', 'route', 'bookmarks', NULL, '/bookmarks', '{}', 3, 1, 0, 'valid', NULL, '2026-07-05T00:00:00.000Z', NULL, NULL, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),

  ('nav-footer-archive-browse', 'footer_archive', NULL, 'Browse All Issues', 'route', 'browse', NULL, '/browse', '{}', 0, 1, 0, 'valid', NULL, '2026-07-05T00:00:00.000Z', NULL, NULL, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),
  ('nav-footer-archive-search', 'footer_archive', NULL, 'Search Archive', 'route', 'search', NULL, '/search', '{}', 1, 1, 0, 'valid', NULL, '2026-07-05T00:00:00.000Z', NULL, NULL, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),
  ('nav-footer-archive-bookmarks', 'footer_archive', NULL, 'My Bookmarks', 'route', 'bookmarks', NULL, '/bookmarks', '{}', 2, 1, 0, 'valid', NULL, '2026-07-05T00:00:00.000Z', NULL, NULL, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),

  ('nav-footer-magazines-aim', 'footer_magazines', NULL, 'All India Magazine', 'route', NULL, NULL, '/browse?magazine=all-india-magazine', '{}', 0, 1, 0, 'valid', NULL, '2026-07-05T00:00:00.000Z', NULL, NULL, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),
  ('nav-footer-magazines-agnishikha', 'footer_magazines', NULL, 'Agnishikha', 'route', NULL, NULL, '/browse?magazine=agnishikha', '{}', 1, 1, 0, 'valid', NULL, '2026-07-05T00:00:00.000Z', NULL, NULL, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),

  ('nav-footer-about-sas', 'footer_about', NULL, 'Sri Aurobindo Society', 'external', NULL, NULL, 'https://aurosociety.org', '{}', 0, 1, 1, 'valid', NULL, '2026-07-05T00:00:00.000Z', NULL, NULL, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),
  ('nav-footer-about-aim', 'footer_about', NULL, 'AIM Website', 'external', NULL, NULL, 'https://aim.aurosociety.org', '{}', 1, 1, 1, 'valid', NULL, '2026-07-05T00:00:00.000Z', NULL, NULL, '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z')
ON CONFLICT(id) DO NOTHING;
