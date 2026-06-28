'use client';

import { X } from 'lucide-react';
import { LANGUAGE_NAMES, MONTH_NAMES, type Language, type MonthIndex } from '@aim-archive/shared';
import type { ApiMagazine } from '@/lib/api';
import type { BrowseFilters, FilterDimension } from '@/lib/use-browse-filters';
import type { AvailabilityFilter } from '@/lib/public-issues';

interface Props {
  filters: BrowseFilters;
  magazines: ApiMagazine[];
  onRemove: (dimension: FilterDimension, value: string | number) => void;
  onRemoveAvailability?: () => void;
  onRemoveQuery?: () => void;
  onClearAll: () => void;
}

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

export function ActiveFilterChips({
  filters,
  magazines,
  onRemove,
  onRemoveAvailability,
  onRemoveQuery,
  onClearAll,
}: Props) {
  const chips: Chip[] = [
    ...(filters.query.length > 0 && onRemoveQuery
      ? [
          {
            key: 'query',
            label: `Search: "${filters.query}"`,
            onRemove: onRemoveQuery,
          },
        ]
      : []),
    ...(filters.availability !== 'read' && onRemoveAvailability
      ? [
          {
            key: 'availability',
            label: `Availability: ${availabilityLabel(filters.availability)}`,
            onRemove: onRemoveAvailability,
          },
        ]
      : []),
    ...filters.years.map<Chip>((y) => ({
      key: `years-${y}`,
      label: `Year: ${y}`,
      onRemove: () => onRemove('years', y),
    })),
    ...filters.months.map<Chip>((m) => ({
      key: `months-${m}`,
      label: `Month: ${MONTH_NAMES[m as MonthIndex]}`,
      onRemove: () => onRemove('months', m),
    })),
    ...filters.magazines.map<Chip>((id) => {
      const mag = magazines.find((m) => matchesMagazineFilter(m, id));
      return {
        key: `magazines-${id}`,
        label: `Magazine: ${mag?.name ?? id}`,
        onRemove: () => onRemove('magazines', id),
      };
    }),
    ...filters.languages.map<Chip>((l) => ({
      key: `languages-${l}`,
      label: `Language: ${LANGUAGE_NAMES[l as Language] ?? l}`,
      onRemove: () => onRemove('languages', l),
    })),
    ...filters.subjects.map<Chip>((s) => ({
      key: `subjects-${s}`,
      label: `Subject: ${s}`,
      onRemove: () => onRemove('subjects', s),
    })),
  ];

  if (chips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={c.onRemove}
          className="group inline-flex items-center gap-1.5 rounded-full border border-flame-200 bg-gradient-to-r from-gold-50 to-flame-50 px-3 py-1 text-xs font-medium text-flame-700 transition-colors hover:border-flame-300 hover:from-gold-100 hover:to-flame-100"
        >
          {c.label}
          <X className="h-3 w-3 text-flame-500 transition-colors group-hover:text-flame-700" />
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

function availabilityLabel(value: AvailabilityFilter): string {
  if (value === 'subscriber') return 'Subscriber editions';
  if (value === 'all') return 'All editions';
  return 'Read now';
}

function matchesMagazineFilter(magazine: ApiMagazine, value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    magazine.id === value ||
    slugify(magazine.name) === normalized ||
    acronym(magazine.name) === normalized
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function acronym(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toLowerCase();
}
