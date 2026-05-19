'use client';

import { X } from 'lucide-react';
import type { BrowseFilters, FilterDimension } from '@/lib/use-browse-filters';
import type { BrowseFacets } from '@/lib/public-issues';
import { FilterSection } from './filter-section';

interface Props {
  facets: BrowseFacets;
  filters: BrowseFilters;
  onToggle: (dimension: FilterDimension, value: string | number) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  onClose: () => void;
}

export function FilterPanel({
  facets,
  filters,
  onToggle,
  onClearAll,
  hasActiveFilters,
  onClose,
}: Props) {
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <span className="font-heading text-base font-semibold text-gray-900">Filters</span>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="rounded-md px-2 py-1 bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-xs font-medium text-transparent transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <FilterSection
          title="Year"
          options={facets.years}
          selected={filters.years}
          onToggle={(v) => onToggle('years', v)}
        />
        <FilterSection
          title="Month"
          options={facets.months}
          selected={filters.months}
          onToggle={(v) => onToggle('months', v)}
        />
        <FilterSection
          title="Magazine"
          options={facets.magazines}
          selected={filters.magazines}
          onToggle={(v) => onToggle('magazines', v)}
        />
        <FilterSection
          title="Language"
          options={facets.languages}
          selected={filters.languages}
          onToggle={(v) => onToggle('languages', v)}
        />
        <FilterSection
          title="Subjects"
          options={facets.subjects}
          selected={filters.subjects}
          onToggle={(v) => onToggle('subjects', v)}
        />
      </div>
    </div>
  );
}
