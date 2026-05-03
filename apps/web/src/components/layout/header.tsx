'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search, BookMarked } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBookmarks } from '@/lib/bookmarks-store';
import { useSearchDropdown } from '@/lib/use-search-dropdown';

const SEARCH_DROPDOWN_ROUTES = new Set(['/browse', '/bookmarks']);

const navLinks = [
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

  return (
    <header className="sticky top-0 z-50 border-b border-flame-100 bg-white/95">
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
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-flame-50 hover:text-flame-700"
            >
              {link.label}
            </Link>
          ))}
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
            className="relative hidden h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-flame-50 hover:text-flame-700 md:flex"
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
            className="rounded-lg p-2 text-gray-600 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-flame-100 bg-white md:hidden"
          >
            <div className="space-y-1 px-6 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-flame-50 hover:text-flame-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
