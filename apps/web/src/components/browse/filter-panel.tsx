'use client';

import { BookOpen, Layers3, LockKeyhole, X } from 'lucide-react';
import type { BrowseFilters, FilterDimension } from '@/lib/use-browse-filters';
import type { AvailabilityFilter, BrowseFacets } from '@/lib/public-issues';
import { FilterSection } from './filter-section';

interface Props {
  facets: BrowseFacets;
  filters: BrowseFilters;
  onToggle: (dimension: FilterDimension, value: string | number) => void;
  onAvailabilityChange?: (availability: AvailabilityFilter) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  onClose: () => void;
}

export function FilterPanel({
  facets,
  filters,
  onToggle,
  onAvailabilityChange,
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
        {onAvailabilityChange && (
          <div className="border-b border-gray-100 px-4 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-gray-500">
              Availability
            </p>
            <div className="grid gap-2">
              {[
                {
                  id: 'read' as const,
                  label: 'Read now',
                  helper: 'Public PDF editions',
                  Icon: BookOpen,
                },
                {
                  id: 'subscriber' as const,
                  label: 'Subscriber editions',
                  helper: 'Visible now, PDF later',
                  Icon: LockKeyhole,
                },
                {
                  id: 'all' as const,
                  label: 'All editions',
                  helper: 'Readable and current',
                  Icon: Layers3,
                },
              ].map(({ id, label, helper, Icon }) => {
                const active = filters.availability === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onAvailabilityChange(id)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                      active
                        ? 'border-flame-200 bg-gradient-to-r from-gold-50 to-flame-50 text-flame-800'
                        : 'border-gray-100 bg-white text-gray-600 hover:border-flame-100 hover:bg-flame-50/40 hover:text-flame-700'
                    }`}
                    aria-pressed={active}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        active ? 'bg-white text-flame-600 shadow-sm' : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs text-gray-500">{helper}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
