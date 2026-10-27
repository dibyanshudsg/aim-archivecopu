'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AdminOption = { value: string; label: string; helper?: string; disabled?: boolean };

export function AdminOptionMenu({ icon: Icon, label, title, description, value, options, onChange, disabled = false, align = 'start', compact = false }: {
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  value: string;
  options: AdminOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  align?: 'start' | 'end';
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menuRef.current?.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')?.focus();
      }
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return <div ref={menuRef} className={cn('relative min-w-0', open && 'z-30')}>
    <button type="button" disabled={disabled} aria-haspopup="menu" aria-expanded={open} aria-label={`${label}: ${activeOption?.label ?? 'Choose an issue'}`} onClick={() => setOpen((current) => !current)} className={cn('flex w-full items-center justify-between gap-3 rounded-xl border px-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-600 disabled:cursor-not-allowed disabled:opacity-50', compact ? 'min-h-9' : 'min-h-12', open ? 'border-flame-300 bg-white ring-2 ring-flame-100' : 'border-gray-200 bg-gray-50/60 hover:border-flame-200 hover:bg-flame-50/30')}>
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-flame-600 ring-1 ring-flame-100"><Icon className="h-3.5 w-3.5" aria-hidden="true" /></span>
        <span className="min-w-0"><span className="block text-[10px] font-semibold tracking-wide text-gray-400 uppercase">{label}</span><span className="block truncate text-sm font-semibold text-gray-900">{activeOption?.label ?? label}</span></span>
      </span>
      <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform', open && 'rotate-180 text-flame-600')} aria-hidden="true" />
    </button>
    {open && <div role="menu" aria-label={title} className={cn('absolute z-40 mt-2 w-full min-w-[min(300px,calc(100vw-48px))] overflow-hidden rounded-2xl border border-flame-100 bg-white shadow-[0_20px_60px_rgba(120,84,28,0.16)] ring-1 ring-white', align === 'end' ? 'right-0' : 'left-0')}>
      <div className="border-b border-gray-100 bg-gradient-to-r from-gold-50/80 to-flame-50/70 px-4 py-3"><div className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Icon className="h-4 w-4 text-flame-600" aria-hidden="true" />{title}</div><p className="mt-0.5 text-xs text-gray-500">{description}</p></div>
      <div className="max-h-[min(360px,calc(100vh-220px))] overflow-y-auto p-1.5">{options.map((option) => {
        const active = option.value === value;
        return <button key={option.value} type="button" role="menuitemradio" aria-checked={active} disabled={option.disabled} onClick={() => { onChange(option.value); setOpen(false); }} className={cn('group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-flame-600', option.disabled ? 'cursor-not-allowed text-gray-400' : active ? 'bg-flame-50 text-flame-800' : 'text-gray-700 hover:bg-gray-50')}>
          <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1', active ? 'bg-white text-flame-600 ring-flame-200' : 'bg-gray-50 text-gray-300 ring-gray-100 group-hover:text-flame-500')}><Check className={cn('h-4 w-4', !active && 'opacity-0')} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{option.label}</span>{option.helper && <span className="block text-xs text-gray-500">{option.helper}</span>}</span>
        </button>;
      })}</div>
    </div>}
  </div>;
}
