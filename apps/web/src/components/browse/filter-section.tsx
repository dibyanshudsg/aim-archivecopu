'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FilterOption<T extends string | number> {
  value: T;
  label: string;
  count: number;
}

interface FilterSectionProps<T extends string | number> {
  title: string;
  options: FilterOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  initialLimit?: number;
  defaultOpen?: boolean;
}

export function FilterSection<T extends string | number>({
  title,
  options,
  selected,
  onToggle,
  initialLimit = 8,
  defaultOpen = true,
}: FilterSectionProps<T>) {
  const [open, setOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? options : options.slice(0, initialLimit);
  const hasMore = options.length > initialLimit;
  const activeCount = selected.length;

  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-900 transition-colors hover:bg-gold-50/50"
      >
        <span className="flex items-center gap-2">
          {title}
          {activeCount > 0 && (
            <span className="rounded-full bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <ul className="space-y-0.5 pb-3">
              {visible.length === 0 && (
                <li className="px-4 text-xs text-gray-400">No options</li>
              )}
              {visible.map((opt) => {
                const checked = selected.includes(opt.value);
                return (
                  <li key={String(opt.value)}>
                    <label className="mx-2 flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-gold-50">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggle(opt.value)}
                          className="h-4 w-4 shrink-0 rounded border-gray-300 text-gold-500 focus:ring-1 focus:ring-gold-400"
                        />
                        <span
                          className={`truncate ${
                            checked ? 'font-medium text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {opt.label}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-xs tabular-nums ${
                          opt.count === 0 ? 'text-gray-300' : 'text-gray-400'
                        }`}
                      >
                        {opt.count}
                      </span>
                    </label>
                  </li>
                );
              })}
              {hasMore && (
                <li className="px-4 pt-1">
                  <button
                    onClick={() => setShowAll((s) => !s)}
                    className="text-xs font-medium text-gold-600 hover:text-gold-700"
                  >
                    {showAll ? 'Show less' : `Show ${options.length - initialLimit} more`}
                  </button>
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
