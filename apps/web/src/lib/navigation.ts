export const HEADER_NAV_LIMIT = 5;

export type NavigationMenuKey = 'header' | 'mobile' | 'footer_archive' | 'footer_magazines' | 'footer_about';
export type NavigationLocation = 'header' | 'mobile' | 'footer';
export type NavigationLinkType = 'route' | 'magazine' | 'topic' | 'issue' | 'external' | 'feedback';
export type NavigationValidationStatus = 'unchecked' | 'valid' | 'warning' | 'broken';

export interface NavigationRouteOption {
  key: string;
  label: string;
  href: string;
  system?: boolean;
}

export interface NavigationItem {
  id: string;
  menu_key: NavigationMenuKey;
  parent_id: string | null;
  label: string;
  link_type: NavigationLinkType;
  route_key: string | null;
  target_id: string | null;
  href: string;
  params: Record<string, string>;
  sort_order: number;
  is_published: boolean;
  opens_new_tab: boolean;
  validation_status: NavigationValidationStatus;
  validation_message: string | null;
  last_validated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface NavigationMenu {
  key: NavigationMenuKey;
  title: string;
  description: string;
  location: NavigationLocation;
  sort_order: number;
  items: NavigationItem[];
}

export interface PublicNavigation {
  menus: Record<NavigationMenuKey, NavigationMenu>;
}

export interface NavigationDestinationOption {
  id: string;
  label: string;
  href: string;
  helper?: string;
}

export interface NavigationDestinations {
  routes: NavigationRouteOption[];
  magazines: NavigationDestinationOption[];
  issues: NavigationDestinationOption[];
  topics: NavigationDestinationOption[];
  feedback: NavigationDestinationOption | null;
}

export const NAVIGATION_MENU_DEFINITIONS: Array<Omit<NavigationMenu, 'items'>> = [
  {
    key: 'header',
    title: 'Header',
    description: 'Primary desktop navigation. Keep this focused.',
    location: 'header',
    sort_order: 0,
  },
  {
    key: 'mobile',
    title: 'Mobile Menu',
    description: 'Phone menu shown behind the hamburger button.',
    location: 'mobile',
    sort_order: 1,
  },
  {
    key: 'footer_archive',
    title: 'Footer - Archive',
    description: 'Archive discovery links in the footer.',
    location: 'footer',
    sort_order: 2,
  },
  {
    key: 'footer_magazines',
    title: 'Footer - Magazines',
    description: 'Magazine-specific footer links.',
    location: 'footer',
    sort_order: 3,
  },
  {
    key: 'footer_about',
    title: 'Footer - About',
    description: 'External and administrative footer links.',
    location: 'footer',
    sort_order: 4,
  },
];

export const NAVIGATION_ROUTES: NavigationRouteOption[] = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'browse', label: 'Browse', href: '/browse' },
  { key: 'search', label: 'Search', href: '/search' },
  { key: 'bookmarks', label: 'Bookmarks', href: '/bookmarks' },
  { key: 'admin_login', label: 'Admin Login', href: '/admin/login', system: true },
];

const DEFAULT_ITEMS: Array<Omit<NavigationItem, 'created_at' | 'updated_at' | 'last_validated_at'>> = [
  item('nav-header-home', 'header', 'Home', 'route', '/', 0, { route_key: 'home' }),
  item('nav-header-browse', 'header', 'Browse', 'route', '/browse', 1, { route_key: 'browse' }),
  item('nav-header-search', 'header', 'Search', 'route', '/search', 2, { route_key: 'search' }),
  item('nav-header-bookmarks', 'header', 'Bookmarks', 'route', '/bookmarks', 3, { route_key: 'bookmarks' }),
  item('nav-mobile-home', 'mobile', 'Home', 'route', '/', 0, { route_key: 'home' }),
  item('nav-mobile-browse', 'mobile', 'Browse', 'route', '/browse', 1, { route_key: 'browse' }),
  item('nav-mobile-search', 'mobile', 'Search', 'route', '/search', 2, { route_key: 'search' }),
  item('nav-mobile-bookmarks', 'mobile', 'Bookmarks', 'route', '/bookmarks', 3, { route_key: 'bookmarks' }),
  item('nav-footer-archive-browse', 'footer_archive', 'Browse All Issues', 'route', '/browse', 0, { route_key: 'browse' }),
  item('nav-footer-archive-search', 'footer_archive', 'Search Archive', 'route', '/search', 1, { route_key: 'search' }),
  item('nav-footer-archive-bookmarks', 'footer_archive', 'My Bookmarks', 'route', '/bookmarks', 2, { route_key: 'bookmarks' }),
  item('nav-footer-magazines-aim', 'footer_magazines', 'All India Magazine', 'route', '/browse?magazine=all-india-magazine', 0),
  item('nav-footer-magazines-agnishikha', 'footer_magazines', 'Agnishikha', 'route', '/browse?magazine=agnishikha', 1),
  item('nav-footer-about-sas', 'footer_about', 'Sri Aurobindo Society', 'external', 'https://aurosociety.org', 0, { opens_new_tab: true }),
  item('nav-footer-about-aim', 'footer_about', 'AIM Website', 'external', 'https://aim.aurosociety.org', 1, { opens_new_tab: true }),
];

export function defaultPublicNavigation(): PublicNavigation {
  return buildNavigation(DEFAULT_ITEMS.map((entry) => ({ ...entry, created_at: null, updated_at: null, last_validated_at: null })), false);
}

export function buildNavigation(items: NavigationItem[], includeUnpublished: boolean): PublicNavigation {
  const menuEntries = NAVIGATION_MENU_DEFINITIONS.map((menu) => {
    const menuItems = items
      .filter((entry) => entry.menu_key === menu.key && (includeUnpublished || entry.is_published))
      .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));
    const cappedItems = menu.key === 'header' && !includeUnpublished ? menuItems.slice(0, HEADER_NAV_LIMIT) : menuItems;
    return [menu.key, { ...menu, items: cappedItems }] as const;
  });

  return { menus: Object.fromEntries(menuEntries) as Record<NavigationMenuKey, NavigationMenu> };
}

export function resolveNavigationHref(input: {
  link_type: NavigationLinkType;
  route_key?: string | null;
  target_id?: string | null;
  href?: string | null;
  params?: Record<string, string> | null;
}): string {
  if (input.link_type === 'route') {
    const routeHref = input.route_key ? NAVIGATION_ROUTES.find((route) => route.key === input.route_key)?.href : null;
    return routeHref ?? normalizeInternalHref(input.href) ?? '/';
  }
  if (input.link_type === 'magazine') return input.target_id ? `/browse?magazine=${encodeURIComponent(input.target_id)}` : '/browse';
  if (input.link_type === 'topic') {
    const topic = input.target_id ?? input.params?.topic ?? '';
    return topic ? `/browse?subject=${encodeURIComponent(topic)}` : '/browse';
  }
  if (input.link_type === 'issue') return input.target_id ? `/issue/${encodeURIComponent(input.target_id)}` : '/browse';
  if (input.link_type === 'feedback') return input.href?.trim() || '#feedback';
  return input.href?.trim() || '/';
}

export function isExternalNavigationHref(href: string): boolean {
  return /^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
}

export function isNavigationHrefActive(href: string, pathname: string | null): boolean {
  if (!pathname || isExternalNavigationHref(href)) return false;
  const pathOnly = href.split('?')[0] || '/';
  if (pathOnly === '/') return pathname === '/';
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

export function isProtectedAdminHref(href: string): boolean {
  const path = href.split('?')[0] || href;
  return path.startsWith('/admin') && path !== '/admin/login';
}

export function getNavigationRoute(routeKey: string | null | undefined): NavigationRouteOption | null {
  return routeKey ? (NAVIGATION_ROUTES.find((route) => route.key === routeKey) ?? null) : null;
}

function normalizeInternalHref(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/')) return trimmed;
  return null;
}

function item(
  id: string,
  menu_key: NavigationMenuKey,
  label: string,
  link_type: NavigationLinkType,
  href: string,
  sort_order: number,
  overrides: Partial<Omit<NavigationItem, 'id' | 'menu_key' | 'label' | 'link_type' | 'href' | 'sort_order' | 'created_at' | 'updated_at' | 'last_validated_at'>> = {},
): Omit<NavigationItem, 'created_at' | 'updated_at' | 'last_validated_at'> {
  return {
    id,
    menu_key,
    parent_id: null,
    label,
    link_type,
    route_key: null,
    target_id: null,
    href,
    params: {},
    sort_order,
    is_published: true,
    opens_new_tab: false,
    validation_status: 'valid',
    validation_message: null,
    ...overrides,
  };
}
