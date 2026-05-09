'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, X } from 'lucide-react';
import { useBrowseFilters } from '@/lib/use-browse-filters';
import { useSearchDropdown } from '@/lib/use-search-dropdown';

export function HeaderSearchDropdown() {
  const isOpen = useSearchDropdown((s) => s.isOpen);
  const close = useSearchDropdown((s) => s.close);
  const { filters, setQuery } = useBrowseFilters();

  const inputRef = useRef<HTMLInputElement>(null);

  // Local input state owns the value so the controlled input never drops
  // keystrokes during the URL roundtrip. Every keystroke also writes to the
  // URL — filtering applies instantly because applyFilters is pure-JS over the
  // already-loaded list, and the URL update doesn't reset the input (it's
  // bound to localQuery, not filters.query).
  const [localQuery, setLocalQuery] = useState(filters.query);
  // Sync local ← URL when the URL changes externally (e.g. chip removed).
  useEffect(() => {
    setLocalQuery(filters.query);
  }, [filters.query]);

  // Auto-focus the input on open + close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, close]);

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="search-bar"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden border-b border-flame-100 bg-white"
        >
          <div className="mx-auto max-w-7xl px-6 py-5 lg:px-8">
            <div className="relative">
              <div className="flex items-center gap-3">
                <SearchIcon className="h-5 w-5 shrink-0 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={localQuery}
                  onChange={(e) => {
                    setLocalQuery(e.target.value);
                    setQuery(e.target.value);
                  }}
                  placeholder="Search issues, topics, magazines…"
                  // Suppress the global flame focus ring — the animated gold
                  // underline below is this input's focus indicator. The
                  // global rule lives in `@layer base`, so utility-layer
                  // classes like these win the cascade.
                  className="w-full bg-transparent py-2 text-left text-base font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus-visible:shadow-none focus-visible:outline-none sm:text-lg"
                />
                {localQuery ? (
                  <button
                    onClick={() => {
                      setLocalQuery('');
                      setQuery('');
                    }}
                    aria-label="Clear search text"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={close}
                    aria-label="Close search"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {/* Static gray baseline */}
              <div className="absolute right-0 bottom-0 left-0 h-px bg-gray-200" />
              {/* Animated gold line — grows from center on open */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                exit={{ scaleX: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
                style={{ originX: 0.5 }}
                className="absolute right-0 bottom-0 left-0 h-px bg-gradient-to-r from-gold-500 to-flame-500"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
