'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  current: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ current, total, onChange }: Props) {
  if (total <= 1) return null;

  const items = computePageItems(current, total);

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-center gap-1.5"
    >
      <PageButton
        ariaLabel="Previous page"
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </PageButton>

      {items.map((item, idx) =>
        item === 'ellipsis' ? (
          <span
            key={`e-${idx}`}
            aria-hidden
            className="flex h-9 w-9 items-center justify-center text-sm text-gray-400 select-none"
          >
            …
          </span>
        ) : (
          <PageNumber
            key={item}
            page={item}
            active={item === current}
            onClick={() => onChange(item)}
          />
        ),
      )}

      <PageButton
        ariaLabel="Next page"
        disabled={current === total}
        onClick={() => onChange(current + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </PageButton>
    </nav>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <motion.button
      whileTap={!disabled ? { scale: 0.92 } : undefined}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg border text-gray-600 transition-colors',
        disabled
          ? 'cursor-not-allowed border-gray-100 bg-white text-gray-300'
          : 'border-gray-200 bg-white hover:border-gold-300 hover:bg-gold-50 hover:text-gold-700',
      )}
    >
      {children}
    </motion.button>
  );
}

function PageNumber({
  page,
  active,
  onClick,
}: {
  page: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={`Page ${page}`}
      className={cn(
        'relative flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium tabular-nums transition-colors',
        active
          ? 'bg-gold-500 text-white shadow-sm shadow-gold-500/20'
          : 'border border-gray-200 bg-white text-gray-700 hover:border-gold-300 hover:bg-gold-50 hover:text-gold-700',
      )}
    >
      {page}
    </motion.button>
  );
}

/**
 * Build the page item list with ellipsis truncation.
 * Always shows: first, last, current, current±1.
 */
function computePageItems(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const items: Array<number | 'ellipsis'> = [1];
  if (current > 3) items.push('ellipsis');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) items.push(i);

  if (current < total - 2) items.push('ellipsis');
  items.push(total);
  return items;
}
