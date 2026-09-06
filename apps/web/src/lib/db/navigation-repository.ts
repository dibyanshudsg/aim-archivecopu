import type {
  NavigationDestinations,
  NavigationItem,
  NavigationLinkType,
  NavigationMenuKey,
  PublicNavigation,
} from '@/lib/navigation';
import {
  HEADER_NAV_LIMIT,
  NAVIGATION_MENU_DEFINITIONS,
  NAVIGATION_ROUTES,
  buildNavigation,
  defaultPublicNavigation,
  isProtectedAdminHref,
  resolveNavigationHref,
} from '@/lib/navigation';
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings';
import { createId, getDb, nowIso } from './client';
import { AsyncTtlCache } from './cache';
import { readSiteSettingsFromDb } from './site-settings-repository';

const publicNavigationCache = new AsyncTtlCache<PublicNavigation>(60_000);

export interface NavigationItemInput {
  menu_key: NavigationMenuKey;
  label: string;
  link_type: NavigationLinkType;
  route_key?: string | null;
  target_id?: string | null;
  href?: string | null;
  params?: Record<string, string>;
  sort_order?: number;
  is_published?: boolean;
  opens_new_tab?: boolean;
}

export async function getPublicNavigationFromDb(): Promise<PublicNavigation> {
  return publicNavigationCache.get('published', async () => {
    try {
      return buildNavigation(await listNavigationItems(false), false);
    } catch (error) {
      if (isMissingNavigationTable(error)) return defaultPublicNavigation();
      throw error;
    }
  });
}

export async function getAdminNavigationFromDb(): Promise<PublicNavigation> {
  try {
    await ensureNavigationMenus();
    return buildNavigation(await listNavigationItems(true), true);
  } catch (error) {
    if (isMissingNavigationTable(error)) return defaultPublicNavigation();
    throw error;
  }
}

export async function listNavigationDestinationsFromDb(): Promise<NavigationDestinations> {
  const [magazines, issues, topics, settings] = await Promise.all([
    getDb().execute('SELECT id, name, language FROM magazines ORDER BY name ASC'),
    getDb().execute(`
      SELECT id, title, year, month
      FROM issues
      WHERE is_published = 1
        AND pdf_url NOT LIKE '%.supabase.co/%'
      ORDER BY year DESC, month DESC, title ASC
      LIMIT 200
    `),
    getDb().execute(`
      SELECT topic.value AS name, COUNT(DISTINCT i.id) AS count
      FROM issues i
      JOIN json_each(i.topics_json) topic ON true
      WHERE topic.value IS NOT NULL
        AND topic.value != ''
      GROUP BY topic.value
      ORDER BY lower(topic.value) ASC
      LIMIT 200
    `),
    readSiteSettingsFromDb().catch(() => DEFAULT_SITE_SETTINGS),
  ]);

  return {
    routes: NAVIGATION_ROUTES,
    magazines: magazines.rows.map((row) => ({
      id: String(row.id),
      label: String(row.name),
      href: `/browse?magazine=${encodeURIComponent(String(row.id))}`,
      helper: String(row.language ?? ''),
    })),
    issues: issues.rows.map((row) => ({
      id: String(row.id),
      label: String(row.title),
      href: `/issue/${encodeURIComponent(String(row.id))}`,
      helper: `${row.month}/${row.year}`,
    })),
    topics: topics.rows.map((row) => ({
      id: String(row.name),
      label: String(row.name),
      href: `/browse?subject=${encodeURIComponent(String(row.name))}`,
      helper: `${Number(row.count ?? 0)} issues`,
    })),
    feedback: settings.feedback_form_url
      ? {
          id: 'feedback',
          label: 'Share feedback',
          href: settings.feedback_form_url,
          helper: 'Configured in Settings',
        }
      : null,
  };
}

export async function createNavigationItemInDb(input: NavigationItemInput, adminId: string): Promise<NavigationItem> {
  await validateNavigationItemInput(input);
  const now = nowIso();
  const id = createId();
  const sortOrder = input.sort_order ?? (await nextSortOrder(input.menu_key));
  const href = resolveNavigationHref(input);
  const validation = validateNavigationTarget({ ...input, href });

  await getDb().execute({
    sql: `
      INSERT INTO navigation_items (
        id, menu_key, parent_id, label, link_type, route_key, target_id, href, params_json,
        sort_order, is_published, opens_new_tab, validation_status, validation_message,
        last_validated_at, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      input.menu_key,
      input.label.trim(),
      input.link_type,
      input.route_key ?? null,
      input.target_id ?? null,
      href,
      JSON.stringify(input.params ?? {}),
      sortOrder,
      input.is_published === false ? 0 : 1,
      input.opens_new_tab ? 1 : 0,
      validation.status,
      validation.message,
      now,
      adminId,
      adminId,
      now,
      now,
    ],
  });

  return (await getNavigationItemById(id))!;
}

export async function updateNavigationItemInDb(id: string, input: NavigationItemInput, adminId: string): Promise<NavigationItem | null> {
  await validateNavigationItemInput(input, id);
  const existing = await getNavigationItemById(id);
  if (!existing) return null;

  const now = nowIso();
  const href = resolveNavigationHref(input);
  const validation = validateNavigationTarget({ ...input, href });
  await getDb().execute({
    sql: `
      UPDATE navigation_items
      SET menu_key = ?,
          label = ?,
          link_type = ?,
          route_key = ?,
          target_id = ?,
          href = ?,
          params_json = ?,
          sort_order = ?,
          is_published = ?,
          opens_new_tab = ?,
          validation_status = ?,
          validation_message = ?,
          last_validated_at = ?,
          updated_by = ?,
          updated_at = ?
      WHERE id = ?
    `,
    args: [
      input.menu_key,
      input.label.trim(),
      input.link_type,
      input.route_key ?? null,
      input.target_id ?? null,
      href,
      JSON.stringify(input.params ?? {}),
      input.sort_order ?? existing.sort_order,
      input.is_published === false ? 0 : 1,
      input.opens_new_tab ? 1 : 0,
      validation.status,
      validation.message,
      now,
      adminId,
      now,
      id,
    ],
  });

  return getNavigationItemById(id);
}

export async function deleteNavigationItemFromDb(id: string): Promise<boolean> {
  const existing = await getNavigationItemById(id);
  if (!existing) return false;
  await getDb().execute({ sql: 'DELETE FROM navigation_items WHERE id = ?', args: [id] });
  await normalizeSortOrders(existing.menu_key);
  return true;
}

export async function reorderNavigationItemsInDb(menuKey: NavigationMenuKey, itemIds: string[], adminId: string): Promise<PublicNavigation> {
  const current = (await listNavigationItems(true))
    .filter((item) => item.menu_key === menuKey)
    .sort((a, b) => a.sort_order - b.sort_order);
  const currentIds = new Set(current.map((item) => item.id));
  const requestedIds = itemIds.filter((id) => currentIds.has(id));
  const remaining = current.map((item) => item.id).filter((id) => !requestedIds.includes(id));
  const orderedIds = [...requestedIds, ...remaining];
  const now = nowIso();

  await getDb().batch(
    orderedIds.map((id, index) => ({
      sql: 'UPDATE navigation_items SET sort_order = ?, updated_by = ?, updated_at = ? WHERE id = ?',
      args: [index, adminId, now, id],
    })),
    'write',
  );

  return getAdminNavigationFromDb();
}

export async function resetNavigationMenuDefaultsInDb(menuKey: NavigationMenuKey, adminId: string): Promise<PublicNavigation> {
  const defaults = defaultPublicNavigation().menus[menuKey].items;
  const now = nowIso();

  await getDb().batch(
    [
      { sql: 'DELETE FROM navigation_items WHERE menu_key = ?', args: [menuKey] },
      ...defaults.map((item, index) => ({
        sql: `
          INSERT INTO navigation_items (
            id, menu_key, parent_id, label, link_type, route_key, target_id, href, params_json,
            sort_order, is_published, opens_new_tab, validation_status, validation_message,
            last_validated_at, created_by, updated_by, created_at, updated_at
          ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'valid', NULL, ?, ?, ?, ?, ?)
        `,
        args: [
          `${item.id}-${Date.now()}-${index}`,
          item.menu_key,
          item.label,
          item.link_type,
          item.route_key,
          item.target_id,
          item.href,
          JSON.stringify(item.params),
          index,
          item.is_published ? 1 : 0,
          item.opens_new_tab ? 1 : 0,
          now,
          adminId,
          adminId,
          now,
          now,
        ],
      })),
    ],
    'write',
  );

  return getAdminNavigationFromDb();
}

async function listNavigationItems(includeUnpublished: boolean): Promise<NavigationItem[]> {
  const where = includeUnpublished ? '' : 'WHERE is_published = 1';
  const result = await getDb().execute(`
    SELECT *
    FROM navigation_items
    ${where}
    ORDER BY menu_key ASC, parent_id ASC, sort_order ASC, label ASC
  `);

  const items = result.rows.map(rowToNavigationItem);
  if (!includeUnpublished) {
    return items.filter((item) => !isProtectedAdminHref(item.href));
  }
  return items;
}

async function getNavigationItemById(id: string): Promise<NavigationItem | null> {
  const result = await getDb().execute({ sql: 'SELECT * FROM navigation_items WHERE id = ? LIMIT 1', args: [id] });
  return result.rows[0] ? rowToNavigationItem(result.rows[0]) : null;
}

async function validateNavigationItemInput(input: NavigationItemInput, existingId?: string): Promise<void> {
  const label = input.label.trim();
  if (!label) throw new Error('Label is required');
  if (input.menu_key === 'header' && input.is_published !== false) {
    const result = await getDb().execute({
      sql: `
        SELECT COUNT(*) AS count
        FROM navigation_items
        WHERE menu_key = 'header'
          AND is_published = 1
          ${existingId ? 'AND id != ?' : ''}
      `,
      args: existingId ? [existingId] : [],
    });
    const count = Number(result.rows[0]?.count ?? 0);
    if (count >= HEADER_NAV_LIMIT) throw new Error(`Header can publish only ${HEADER_NAV_LIMIT} top-level links`);
  }

  if (input.link_type === 'external') {
    const href = input.href?.trim() ?? '';
    if (!/^https?:\/\//i.test(href)) throw new Error('External links must start with http:// or https://');
  }
  if (input.link_type === 'route' && input.href && isProtectedAdminHref(input.href)) {
    throw new Error('Only the Admin Login route can be linked from public navigation');
  }
}

function validateNavigationTarget(input: NavigationItemInput & { href: string }) {
  if (input.link_type === 'route' && isProtectedAdminHref(input.href)) {
    return { status: 'broken' as const, message: 'Protected admin route is not allowed in public navigation' };
  }
  if (input.link_type === 'feedback' && input.href === '#feedback') {
    return { status: 'warning' as const, message: 'Feedback URL is not configured in Settings' };
  }
  return { status: 'valid' as const, message: null };
}

async function nextSortOrder(menuKey: NavigationMenuKey): Promise<number> {
  const result = await getDb().execute({
    sql: 'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM navigation_items WHERE menu_key = ?',
    args: [menuKey],
  });
  return Number(result.rows[0]?.next_order ?? 0);
}

async function normalizeSortOrders(menuKey: NavigationMenuKey): Promise<void> {
  const items = (await listNavigationItems(true))
    .filter((item) => item.menu_key === menuKey)
    .sort((a, b) => a.sort_order - b.sort_order);
  if (items.length === 0) return;
  await getDb().batch(
    items.map((item, index) => ({
      sql: 'UPDATE navigation_items SET sort_order = ? WHERE id = ?',
      args: [index, item.id],
    })),
    'write',
  );
}

async function ensureNavigationMenus(): Promise<void> {
  const now = nowIso();
  await getDb().batch(
    NAVIGATION_MENU_DEFINITIONS.map((menu) => ({
      sql: `
        INSERT INTO navigation_menus (key, title, description, location, sort_order, is_system, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(key) DO NOTHING
      `,
      args: [menu.key, menu.title, menu.description, menu.location, menu.sort_order, now, now],
    })),
    'write',
  );
}

function rowToNavigationItem(row: Record<string, unknown>): NavigationItem {
  const linkType = String(row.link_type) as NavigationLinkType;
  const routeKey = row.route_key == null ? null : String(row.route_key);
  const targetId = row.target_id == null ? null : String(row.target_id);
  const params = parseParams(row.params_json == null ? '{}' : String(row.params_json));
  const href = resolveNavigationHref({
    link_type: linkType,
    route_key: routeKey,
    target_id: targetId,
    href: row.href == null ? null : String(row.href),
    params,
  });

  return {
    id: String(row.id),
    menu_key: String(row.menu_key) as NavigationMenuKey,
    parent_id: row.parent_id == null ? null : String(row.parent_id),
    label: String(row.label),
    link_type: linkType,
    route_key: routeKey,
    target_id: targetId,
    href,
    params,
    sort_order: Number(row.sort_order ?? 0),
    is_published: Boolean(row.is_published),
    opens_new_tab: Boolean(row.opens_new_tab),
    validation_status: String(row.validation_status ?? 'unchecked') as NavigationItem['validation_status'],
    validation_message: row.validation_message == null ? null : String(row.validation_message),
    last_validated_at: row.last_validated_at == null ? null : String(row.last_validated_at),
    created_at: row.created_at == null ? null : String(row.created_at),
    updated_at: row.updated_at == null ? null : String(row.updated_at),
  };
}

function parseParams(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  } catch {
    return {};
  }
}

function isMissingNavigationTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('navigation_items') || message.includes('navigation_menus');
}
