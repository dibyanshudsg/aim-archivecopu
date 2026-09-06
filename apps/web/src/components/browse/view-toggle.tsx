'use client';

import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  view: 'grid' | 'list';
  onChange: (view: 'grid' | 'list') => void;
  compact?: boolean;
}

export function ViewToggle({ view, onChange, compact = false }: Props) {
  return (
    <div className="inline-flex shrink-0 items-center overflow-hidden rounded-xl border border-gray-200 bg-white">
      {compact && (
        <button
          type="button"
          onClick={() => onChange(view === 'grid' ? 'list' : 'grid')}
          aria-label={view === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          title={view === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-flame-700 transition-colors hover:bg-flame-50 min-[600px]:hidden"
        >
          {view === 'grid' ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
        </button>
      )}
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-label="List view"
        className={cn(
          'h-11 w-11 items-center justify-center rounded-md transition-colors',
          compact ? 'hidden min-[600px]:flex' : 'flex',
          view === 'list'
            ? 'bg-gradient-to-r from-gold-100 to-flame-100 text-flame-700'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
        )}
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('grid')}
        aria-label="Grid view"
        className={cn(
          'h-11 w-11 items-center justify-center rounded-md transition-colors',
          compact ? 'hidden min-[600px]:flex' : 'flex',
          view === 'grid'
            ? 'bg-gradient-to-r from-gold-100 to-flame-100 text-flame-700'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}
