'use client';

import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  view: 'grid' | 'list';
  onChange: (view: 'grid' | 'list') => void;
}

export function ViewToggle({ view, onChange }: Props) {
  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
      <button
        onClick={() => onChange('list')}
        aria-label="List view"
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
          view === 'list'
            ? 'bg-gold-100 text-gold-700'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
        )}
      >
        <List className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange('grid')}
        aria-label="Grid view"
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
          view === 'grid'
            ? 'bg-gold-100 text-gold-700'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}
