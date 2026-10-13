'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Layers3, LockKeyhole, X } from 'lucide-react';
import type { BrowseFilters, FilterDimension } from '@/lib/use-browse-filters';
import type { AvailabilityFilter, BrowseFacets } from '@/lib/public-issues';
import { FilterSection } from './filter-section';

type FilterSectionId = 'years' | 'months' | 'magazines' | 'languages' | 'subjects';
type OpenSections = Partial<Record<FilterSectionId, boolean>>;

const FILTER_SECTION_STORAGE_KEY = 'aim-archive:browse-filter-sections:v1';

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
  const [openSections, setOpenSections] = useState<OpenSections>({});
  const [sectionsLoaded, setSectionsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FILTER_SECTION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as OpenSections;
        setOpenSections({
          years: Boolean(parsed.years),
          months: Boolean(parsed.months),
          magazines: Boolean(parsed.magazines),
          languages: Boolean(parsed.languages),
          subjects: Boolean(parsed.subjects),
        });
      }
    } catch {
      try {
        window.localStorage.removeItem(FILTER_SECTION_STORAGE_KEY);
      } catch {}
    } finally {
      setSectionsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!sectionsLoaded) return;
    try {
      window.localStorage.setItem(FILTER_SECTION_STORAGE_KEY, JSON.stringify(openSections));
    } catch {}
  }, [openSections, sectionsLoaded]);

  const setSectionOpen = (section: FilterSectionId, open: boolean) => {
    setOpenSections((current) => {
      return { ...current, [section]: open };
    });
  };

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <span className="font-heading text-base font-semibold text-gray-900">Filters</span>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="min-h-11 rounded-md px-2 py-1 text-xs font-medium text-flame-800 transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-11 w-11 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
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
          open={openSections.years ?? false}
          onOpenChange={(open) => setSectionOpen('years', open)}
        />
        <FilterSection
          title="Month"
          options={facets.months}
          selected={filters.months}
          onToggle={(v) => onToggle('months', v)}
          open={openSections.months ?? false}
          onOpenChange={(open) => setSectionOpen('months', open)}
        />
        <FilterSection
          title="Magazine"
          options={facets.magazines}
          selected={filters.magazines}
          onToggle={(v) => onToggle('magazines', v)}
          open={openSections.magazines ?? false}
          onOpenChange={(open) => setSectionOpen('magazines', open)}
        />
        <FilterSection
          title="Language"
          options={facets.languages}
          selected={filters.languages}
          onToggle={(v) => onToggle('languages', v)}
          open={openSections.languages ?? false}
          onOpenChange={(open) => setSectionOpen('languages', open)}
        />
        <FilterSection
          title="Subjects"
          options={facets.subjects}
          selected={filters.subjects}
          onToggle={(v) => onToggle('subjects', v)}
          open={openSections.subjects ?? false}
          onOpenChange={(open) => setSectionOpen('subjects', open)}
        />
      </div>
    </div>
  );
}
