'use client';

import { X } from 'lucide-react';
import { LANGUAGE_NAMES, MONTH_NAMES, type Language, type MonthIndex } from '@aim-archive/shared';
import type { ApiMagazine } from '@/lib/api';
import type { BrowseFilters, FilterDimension } from '@/lib/use-browse-filters';

interface Props {
  filters: BrowseFilters;
  magazines: ApiMagazine[];
  onRemove: (dimension: FilterDimension, value: string | number) => void;
  onClearAll: () => void;
}

interface Chip {
  dimension: FilterDimension;
  value: string | number;
  label: string;
}

export function ActiveFilterChips({ filters, magazines, onRemove, onClearAll }: Props) {
  const chips: Chip[] = [
    ...filters.years.map<Chip>((y) => ({ dimension: 'years', value: y, label: `Year: ${y}` })),
    ...filters.months.map<Chip>((m) => ({
      dimension: 'months',
      value: m,
      label: `Month: ${MONTH_NAMES[m as MonthIndex]}`,
    })),
    ...filters.magazines.map<Chip>((id) => {
      const mag = magazines.find((m) => m.id === id);
      return { dimension: 'magazines', value: id, label: `Magazine: ${mag?.name ?? id}` };
    }),
    ...filters.languages.map<Chip>((l) => ({
      dimension: 'languages',
      value: l,
      label: `Language: ${LANGUAGE_NAMES[l as Language] ?? l}`,
    })),
    ...filters.subjects.map<Chip>((s) => ({
      dimension: 'subjects',
      value: s,
      label: `Subject: ${s}`,
    })),
  ];

  if (chips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={`${c.dimension}-${c.value}`}
          onClick={() => onRemove(c.dimension, c.value)}
          className="group inline-flex items-center gap-1.5 rounded-full border border-gold-200 bg-gold-50 px-3 py-1 text-xs font-medium text-gold-700 transition-colors hover:border-gold-300 hover:bg-gold-100"
        >
          {c.label}
          <X className="h-3 w-3 text-gold-500 transition-colors group-hover:text-gold-700" />
        </button>
      ))}
      <button
        onClick={onClearAll}
        className="ml-1 text-xs font-medium text-gray-500 hover:text-gray-700"
      >
        Clear all
      </button>
    </div>
  );
}
