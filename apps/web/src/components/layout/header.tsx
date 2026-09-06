'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Search, BookMarked } from 'lucide-react';
import { ContinueReadingFab } from './continue-reading-fab';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useBookmarks } from '@/lib/bookmarks-store';
import {
  defaultPublicNavigation,
  isExternalNavigationHref,
  isNavigationHrefActive,
  type NavigationItem,
  type PublicNavigation,
} from '@/lib/navigation';
import { useSearchDropdown } from '@/lib/use-search-dropdown';
import { fetchBookmarkedIssues } from '@/lib/api';
import { cn } from '@/lib/utils';

const SEARCH_DROPDOWN_ROUTES = new Set(['/browse', '/bookmarks']);

const DEV_PUBLIC_WARM_TARGETS = [
  '/browse',
  '/search',
  '/bookmarks',
  '/api/issues?page=1&page_size=24',
  '/api/magazines',
  '/api/site-settings',
];
const DEV_BROWSE_ROUTE_WARM_TARGETS = ['/search', '/bookmarks'];

export function Header({
  navigation,
  contextualControls,
  contextualControlsVisible = false,
}: {
  navigation?: PublicNavigation;
  contextualControls?: React.ReactNode;
  contextualControlsVisible?: boolean;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const bookmarkedIds = useBookmarks((s) => s.bookmarkedIds);
  const bookmarkCount = bookmarkedIds.length;
  const pathname = usePathname();
  const dropdownIsOpen = useSearchDropdown((s) => s.isOpen);
  const toggleDropdown = useSearchDropdown((s) => s.toggle);
  const showDropdownTrigger = SEARCH_DROPDOWN_ROUTES.has(pathname ?? '');
  const headerRef = useRef<HTMLElement>(null);
  const publicNavigation = useMemo(() => navigation ?? defaultPublicNavigation(), [navigation]);
  const headerLinks = publicNavigation.menus.header.items;
  const mobileLinks = publicNavigation.menus.mobile.items.length > 0 ? publicNavigation.menus.mobile.items : headerLinks;

  /* Click-outside + Escape — closes the mobile menu when the user taps any
     content below the header or hits Esc on a hardware keyboard. The header
     itself is excluded so taps on the hamburger toggle still work. */
  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handlePointer(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (!target || !headerRef.current) return;
      if (!headerRef.current.contains(target)) setMobileMenuOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    }

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [mobileMenuOpen]);

  /* Auto-close the mobile menu whenever the route changes — covers the case
     where a user taps a link and the new page mounts without us also having
     to reach into each <Link>'s onClick. */
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (contextualControlsVisible) setMobileMenuOpen(false);
  }, [contextualControlsVisible]);

  useEffect(() => {
    if (pathname !== '/browse' || bookmarkedIds.length === 0) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;

    const timeoutId = window.setTimeout(() => {
      fetchBookmarkedIssues(bookmarkedIds).catch(() => {
        /* best-effort warm cache */
      });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [bookmarkedIds, pathname]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      if (pathname === '/browse') {
        await Promise.allSettled(
          DEV_BROWSE_ROUTE_WARM_TARGETS.map(async (target) => {
            if (cancelled) return;
            router.prefetch(target);
            try {
              // Next disables automatic Link prefetching in development. Fetch
              // the now-lightweight route shells so the first click does not
              // pay the compile cost while the user waits.
              await fetch(target, { cache: 'force-cache' });
            } catch {
              /* local-only convenience */
            }
          }),
        );
        return;
      }

      if (pathname !== '/') return;
      for (const href of [...headerLinks, ...mobileLinks].map((link) => link.href)) {
        if (!isExternalNavigationHref(href)) router.prefetch(href);
      }

      for (const target of DEV_PUBLIC_WARM_TARGETS) {
        if (cancelled) return;
        try {
          await fetch(target, { cache: 'force-cache' });
        } catch {
          // Local-only convenience; the visible route still handles failures.
        }
      }
    }, pathname === '/browse' ? 0 : 800);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [router, headerLinks, mobileLinks, pathname]);

  /** Active state — matches exact path or any sub-route (e.g. /browse/[id]
   *  highlights the Browse link too). The home link ("/") is exact-match
   *  only — otherwise it would match every route. */
  function isLinkActive(href: string): boolean {
    return isNavigationHrefActive(href, pathname);
  }

  function prefetchRoute(href: string) {
    if (!isExternalNavigationHref(href)) router.prefetch(href);
  }

  return (
    <header
      ref={headerRef}
      data-site-header
      className="relative sticky top-0 z-50 border-b border-flame-100 bg-white shadow-sm"
    >
      <nav
        className={cn(
          'mx-auto flex max-w-7xl items-center',
          contextualControlsVisible
            ? 'gap-0.5 px-1 py-2 transition-[gap,padding] duration-200 ease-out min-[600px]:gap-2 min-[600px]:px-3 sm:px-4 sm:py-3 md:gap-3 md:px-6 md:py-4 lg:px-8 motion-reduce:transition-none'
            : 'gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8',
        )}
      >
        {/* Logo */}
        <motion.div
          layout="position"
          transition={{ layout: { duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] } }}
          className="shrink-0"
        >
          <Link
            href="/"
            className={cn(
              'flex items-center',
              contextualControlsVisible ? 'gap-1 min-[600px]:gap-3' : 'gap-3',
            )}
          >
            <Image
              src="/logo.png"
              alt="AIM Archive"
              width={40}
              height={40}
              className={cn(
                'rounded-lg object-cover transition-[width,height] duration-200 ease-out motion-reduce:transition-none',
                contextualControlsVisible
                  ? 'h-9 w-9 min-[600px]:h-10 min-[600px]:w-10'
                  : 'h-10 w-10',
              )}
            />
            <div
              className={cn(
                contextualControlsVisible &&
                  'hidden max-w-16 overflow-hidden min-[390px]:block min-[600px]:max-w-none min-[600px]:overflow-visible',
              )}
            >
              <span
                className={cn(
                  'font-heading font-bold whitespace-nowrap text-gray-900 transition-[font-size] duration-200 ease-out motion-reduce:transition-none',
                  contextualControlsVisible
                    ? 'block text-[10px] tracking-[-0.02em] min-[600px]:text-xl min-[600px]:tracking-normal'
                    : 'text-xl',
                )}
              >
                AIM Archive
              </span>
              <AnimatePresence initial={false}>
                {!contextualControlsVisible && (
                  <motion.span
                    initial={reduceMotion ? false : { opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
                    transition={{ duration: reduceMotion ? 0 : 0.16 }}
                    className="hidden text-xs text-gray-500 sm:block"
                  >
                    Sri Aurobindo Society
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </Link>
        </motion.div>

        {/* The centre slot becomes a contextual toolbar on long Browse pages. */}
        <motion.div
          layout="position"
          transition={{ layout: { duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] } }}
          className={cn(
            'min-w-0 flex-1 items-center justify-end',
            contextualControlsVisible ? 'flex' : 'hidden md:flex',
          )}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {contextualControlsVisible && contextualControls ? (
              <motion.div
                key="contextual-controls"
                initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
                transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-w-0 flex-1 justify-end"
              >
                {contextualControls}
              </motion.div>
            ) : (
              <motion.div
                key="desktop-navigation"
                initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
                transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-1"
              >
                {headerLinks.map((link) => {
                  const active = isLinkActive(link.href);
                  return (
                    <NavigationAnchor
                      key={link.id}
                      item={link}
                      onMouseEnter={() => prefetchRoute(link.href)}
                      onFocus={() => prefetchRoute(link.href)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-gradient-to-r from-gold-100 to-flame-100 text-flame-700'
                          : 'text-gray-600 hover:bg-flame-50 hover:text-flame-700',
                      )}
                    >
                      {link.label}
                    </NavigationAnchor>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Actions cluster — search icon shows on every viewport (when on a
            search-eligible route); bookmarks icon is desktop-only; the
            hamburger menu replaces those nav links on mobile. */}
        <motion.div
          layout="position"
          transition={{ layout: { duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] } }}
          className={cn(
            'ml-auto shrink-0 items-center gap-1 md:ml-0 md:flex md:gap-2',
            contextualControlsVisible ? 'flex gap-0.5 min-[600px]:gap-2' : 'flex',
          )}
        >
          {showDropdownTrigger && (
            <button
              type="button"
              onClick={toggleDropdown}
              aria-label={dropdownIsOpen ? 'Close search' : 'Open search'}
              aria-expanded={dropdownIsOpen}
              className={`flex shrink-0 items-center justify-center transition-colors ${
                contextualControlsVisible
                  ? 'h-11 w-11 rounded-xl border border-flame-200 bg-white text-flame-700 shadow-sm hover:border-flame-300 hover:bg-flame-50 focus-visible:ring-2 focus-visible:ring-flame-300 focus-visible:ring-offset-2'
                  : 'h-10 w-10 rounded-lg'
              } ${
                dropdownIsOpen
                  ? 'bg-gradient-to-r from-gold-100 to-flame-100 text-flame-700'
                  : contextualControlsVisible
                    ? ''
                    : 'text-gray-500 hover:bg-flame-50 hover:text-flame-700'
              }`}
            >
              <Search className="h-5 w-5" />
            </button>
          )}
          <ContinueReadingFab inline />
          <Link
            href="/bookmarks"
            onMouseEnter={() => prefetchRoute('/bookmarks')}
            onFocus={() => prefetchRoute('/bookmarks')}
            aria-current={isLinkActive('/bookmarks') ? 'page' : undefined}
            className={cn(
              'relative hidden shrink-0 items-center justify-center transition-colors md:flex',
              contextualControlsVisible
                ? 'h-11 w-11 rounded-xl border border-flame-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-flame-300 focus-visible:ring-offset-2'
                : 'h-10 w-10 rounded-lg',
              isLinkActive('/bookmarks')
                ? 'bg-gradient-to-r from-gold-100 to-flame-100 text-flame-700'
                : contextualControlsVisible
                  ? 'text-flame-700 hover:border-flame-300 hover:bg-flame-50'
                  : 'text-gray-500 hover:bg-flame-50 hover:text-flame-700',
            )}
            aria-label={`Bookmarks${bookmarkCount > 0 ? ` (${bookmarkCount})` : ''}`}
          >
            <BookMarked className="h-5 w-5" />
            <AnimatePresence>
              {bookmarkCount > 0 && (
                <motion.span
                  key={bookmarkCount}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', damping: 18, stiffness: 380 }}
                  className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-gold-500 to-flame-500 px-1 text-[10px] font-bold text-white shadow-sm"
                >
                  {bookmarkCount > 99 ? '99+' : bookmarkCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <motion.div layout="position" className="shrink-0 md:hidden">
                <button
                  type="button"
                  className={cn(
                    'relative shrink-0 transition-colors',
                    contextualControlsVisible
                      ? 'h-11 w-11 rounded-xl border border-flame-200 bg-white text-flame-700 shadow-sm hover:border-flame-300 hover:bg-flame-50 focus-visible:ring-2 focus-visible:ring-flame-300 focus-visible:ring-offset-2'
                      : 'h-10 w-10 rounded-lg text-gray-600',
                  )}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={mobileMenuOpen}
                >
            {/* Three-line hamburger that morphs into an X. The top + bottom
                bars rotate ±45° while sliding to the vertical centre; the
                middle bar fades out. The mirrored animation runs in reverse
                when toggling closed. Width 22px / gap 6px gives a balanced
                icon at 40×40 button size. */}
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="relative h-[18px] w-[22px]">
                <motion.span
                  className="absolute left-0 right-0 h-[2px] origin-center rounded-full bg-current"
                  initial={false}
                  animate={
                    mobileMenuOpen
                      ? { top: '50%', y: '-50%', rotate: 45 }
                      : { top: 0, y: 0, rotate: 0 }
                  }
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.span
                  className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 rounded-full bg-current"
                  initial={false}
                  animate={{ opacity: mobileMenuOpen ? 0 : 1, scaleX: mobileMenuOpen ? 0.4 : 1 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                />
                <motion.span
                  className="absolute left-0 right-0 h-[2px] origin-center rounded-full bg-current"
                  initial={false}
                  animate={
                    mobileMenuOpen
                      ? { bottom: '50%', y: '50%', rotate: -45 }
                      : { bottom: 0, y: 0, rotate: 0 }
                  }
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            </span>
                </button>
          </motion.div>
        </motion.div>
      </nav>

      {/* Mobile Menu — absolute-positioned overlay below the header so we can
          animate with GPU-only transforms (translateY + opacity). Animating
          `height: auto` triggers a layout recalc every frame and is visibly
          janky on mid-range Android phones; transforms run on the compositor
          thread and stay buttery. The trade-off is the menu now overlays
          page content instead of pushing it down — which is the standard
          pattern for native-app-style mobile menus anyway. */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: 'transform, opacity' }}
            className="absolute left-0 right-0 top-full origin-top border-t border-flame-100 bg-white shadow-lg md:hidden"
          >
            <div className="space-y-1 px-6 py-4">
              {mobileLinks.map((link) => {
                const active = isLinkActive(link.href);
                return (
                  <NavigationAnchor
                    key={link.id}
                    item={link}
                    onMouseEnter={() => prefetchRoute(link.href)}
                    onFocus={() => prefetchRoute(link.href)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'block rounded-lg px-4 py-3 text-base font-medium transition-colors',
                      active
                        ? 'bg-gradient-to-r from-gold-100 to-flame-100 text-flame-700'
                        : 'text-gray-700 hover:bg-flame-50 hover:text-flame-700',
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </NavigationAnchor>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function NavigationAnchor({
  item,
  children,
  className,
  onClick,
  onMouseEnter,
  onFocus,
  'aria-current': ariaCurrent,
}: {
  item: NavigationItem;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
  'aria-current'?: 'page';
}) {
  const external = isExternalNavigationHref(item.href) || item.opens_new_tab;
  if (external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onFocus={onFocus}
        aria-current={ariaCurrent}
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      aria-current={ariaCurrent}
      className={className}
    >
      {children}
    </Link>
  );
}
