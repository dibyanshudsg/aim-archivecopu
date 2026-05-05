'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookMarked } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBookmarks } from '@/lib/bookmarks-store';
import { useSearchDropdown } from '@/lib/use-search-dropdown';
import { cn } from '@/lib/utils';

const SEARCH_DROPDOWN_ROUTES = new Set(['/browse', '/bookmarks']);

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/browse', label: 'Browse' },
  { href: '/search', label: 'Search' },
  { href: '/bookmarks', label: 'Bookmarks' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const bookmarkCount = useBookmarks((s) => s.bookmarkedIds.length);
  const pathname = usePathname();
  const dropdownIsOpen = useSearchDropdown((s) => s.isOpen);
  const toggleDropdown = useSearchDropdown((s) => s.toggle);
  const showDropdownTrigger = SEARCH_DROPDOWN_ROUTES.has(pathname ?? '');
  const headerRef = useRef<HTMLElement>(null);

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

  /** Active state — matches exact path or any sub-route (e.g. /browse/[id]
   *  highlights the Browse link too). The home link ("/") is exact-match
   *  only — otherwise it would match every route. */
  function isLinkActive(href: string): boolean {
    if (!pathname) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-flame-100 bg-white/95"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="AIM Archive" width={40} height={40} className="rounded-lg object-cover" />
          <div>
            <span className="font-heading text-xl font-bold text-gray-900">AIM Archive</span>
            <span className="hidden text-xs text-gray-500 sm:block">Sri Aurobindo Society</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-gradient-to-r from-gold-100 to-flame-100 text-flame-700'
                    : 'text-gray-600 hover:bg-flame-50 hover:text-flame-700',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Actions cluster — search icon shows on every viewport (when on a
            search-eligible route); bookmarks icon is desktop-only; the
            hamburger menu replaces those nav links on mobile. */}
        <div className="flex items-center gap-1 md:gap-2">
          {showDropdownTrigger && (
            <button
              type="button"
              onClick={toggleDropdown}
              aria-label={dropdownIsOpen ? 'Close search' : 'Open search'}
              aria-expanded={dropdownIsOpen}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                dropdownIsOpen
                  ? 'bg-gradient-to-r from-gold-100 to-flame-100 text-flame-700'
                  : 'text-gray-500 hover:bg-flame-50 hover:text-flame-700'
              }`}
            >
              <Search className="h-5 w-5" />
            </button>
          )}
          <Link
            href="/bookmarks"
            aria-current={isLinkActive('/bookmarks') ? 'page' : undefined}
            className={cn(
              'relative hidden h-10 w-10 items-center justify-center rounded-lg transition-colors md:flex',
              isLinkActive('/bookmarks')
                ? 'bg-gradient-to-r from-gold-100 to-flame-100 text-flame-700'
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
          <button
            type="button"
            className="relative h-10 w-10 rounded-lg text-gray-600 md:hidden"
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
        </div>
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
              {navLinks.map((link) => {
                const active = isLinkActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
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
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
