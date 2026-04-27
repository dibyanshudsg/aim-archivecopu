'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { LANGUAGE_NAMES, MONTH_NAMES, type Language, type MonthIndex } from '@aim-archive/shared';
import type { ApiIssue, ApiMagazine } from '@/lib/api';
import { applyFilters, type BrowseFilters, type FilterDimension } from '@/lib/use-browse-filters';
import { FilterSection } from './filter-section';

interface Props {
  issues: ApiIssue[];
  magazines: ApiMagazine[];
  filters: BrowseFilters;
  onToggle: (dimension: FilterDimension, value: string | number) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  onClose: () => void;
}

export function FilterPanel({
  issues,
  magazines,
  filters,
  onToggle,
  onClearAll,
  hasActiveFilters,
  onClose,
}: Props) {
  const yearOptions = useMemo(() => {
    const base = applyFilters(issues, filters, 'years');
    const counts = new Map<number, number>();
    for (const i of base) counts.set(i.year, (counts.get(i.year) || 0) + 1);
    const allYears = new Set<number>([...counts.keys(), ...filters.years]);
    return [...allYears]
      .sort((a, b) => b - a)
      .map((y) => ({ value: y, label: String(y), count: counts.get(y) || 0 }));
  }, [issues, filters]);

  const monthOptions = useMemo(() => {
    const base = applyFilters(issues, filters, 'months');
    const counts = new Map<number, number>();
    for (const i of base) counts.set(i.month, (counts.get(i.month) || 0) + 1);
    const allMonths = new Set<number>([...counts.keys(), ...filters.months]);
    return [...allMonths]
      .sort((a, b) => a - b)
      .map((m) => ({
        value: m,
        label: MONTH_NAMES[m as MonthIndex],
        count: counts.get(m) || 0,
      }));
  }, [issues, filters]);

  const magazineOptions = useMemo(() => {
    const base = applyFilters(issues, filters, 'magazines');
    const counts = new Map<string, number>();
    for (const i of base) counts.set(i.magazine_id, (counts.get(i.magazine_id) || 0) + 1);
    return magazines
      .map((m) => ({ value: m.id, label: m.name, count: counts.get(m.id) || 0 }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [issues, magazines, filters]);

  const languageOptions = useMemo(() => {
    const base = applyFilters(issues, filters, 'languages');
    const counts = new Map<string, number>();
    for (const i of base) {
      const lang = i.magazines.language;
      counts.set(lang, (counts.get(lang) || 0) + 1);
    }
    const langKeys = Object.keys(LANGUAGE_NAMES) as Language[];
    return langKeys
      .filter((k) => counts.has(k) || filters.languages.includes(k))
      .map((k) => ({ value: k as string, label: LANGUAGE_NAMES[k], count: counts.get(k) || 0 }));
  }, [issues, filters]);

  const subjectOptions = useMemo(() => {
    const base = applyFilters(issues, filters, 'subjects');
    const counts = new Map<string, number>();
    for (const i of base) for (const t of i.topics) counts.set(t, (counts.get(t) || 0) + 1);
    const allSubs = new Set<string>([...counts.keys(), ...filters.subjects]);
    return [...allSubs]
      .map((s) => ({ value: s, label: s, count: counts.get(s) || 0 }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [issues, filters]);

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <span className="font-heading text-base font-semibold text-gray-900">Filters</span>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="rounded-md px-2 py-1 text-xs font-medium text-gold-600 transition-colors hover:bg-gold-50 hover:text-gold-700"
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
          options={yearOptions}
          selected={filters.years}
          onToggle={(v) => onToggle('years', v)}
        />
        <FilterSection
          title="Month"
          options={monthOptions}
          selected={filters.months}
          onToggle={(v) => onToggle('months', v)}
        />
        <FilterSection
          title="Magazine"
          options={magazineOptions}
          selected={filters.magazines}
          onToggle={(v) => onToggle('magazines', v)}
        />
        <FilterSection
          title="Language"
          options={languageOptions}
          selected={filters.languages}
          onToggle={(v) => onToggle('languages', v)}
        />
        <FilterSection
          title="Subjects"
          options={subjectOptions}
          selected={filters.subjects}
          onToggle={(v) => onToggle('subjects', v)}
        />
      </div>
    </div>
  );
}
