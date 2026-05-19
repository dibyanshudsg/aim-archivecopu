'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUI } from '@/components/ui/toast';

export interface ManagedTopic {
  name: string;
  count: number;
}

interface TagsInputProps {
  /** Topics applied to the current issue */
  value: string[];
  /** Updates the current issue's topics */
  onChange: (next: string[]) => void;
  /** Master list of every topic across the archive, with usage counts */
  allTopics: ManagedTopic[];
  /** Called after a global rename or delete so the parent can refetch */
  onTopicsRefetch: () => void;
  placeholder?: string;
  className?: string;
}

/**
 * Inline tag picker with full master-list CRUD.
 * - Click the field to open a managed dropdown of every topic
 * - Click any row to toggle it on/off the current issue
 * - Type in the search box to filter; if no exact match exists, an
 *   "Add 'X'" row appears at the bottom that creates the topic and
 *   applies it to the current issue immediately
 * - Pencil renames the topic across every issue (server-side)
 * - Trash deletes it from every issue (with confirmation)
 */
export function TagsInput({
  value,
  onChange,
  allTopics,
  onTopicsRefetch,
  placeholder = 'Click to manage topics',
  className,
}: TagsInputProps) {
  const { toast, confirm } = useUI();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [pending, setPending] = useState<string | null>(null); // name being renamed/deleted
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [maxHeight, setMaxHeight] = useState(360);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  const sortedValue = useMemo(
    () => [...value].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [value],
  );

  const lowerValueSet = useMemo(
    () => new Set(value.map((v) => v.toLowerCase())),
    [value],
  );

  // Merge any topic applied to the current issue that isn't yet in the
  // master list (e.g. just-created locally) so it shows in the dropdown
  // immediately. Marked with count: 0 since it hasn't been persisted yet.
  const mergedTopics = useMemo(() => {
    const known = new Set(allTopics.map((t) => t.name.toLowerCase()));
    const extras: ManagedTopic[] = value
      .filter((v) => !known.has(v.toLowerCase()))
      .map((name) => ({ name, count: 0 }));
    return [...allTopics, ...extras].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }, [allTopics, value]);

  const filteredTopics = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return mergedTopics;
    return mergedTopics.filter((t) => t.name.toLowerCase().includes(q));
  }, [mergedTopics, filter]);

  const exactMatchExists = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return mergedTopics.some((t) => t.name.toLowerCase() === q);
  }, [mergedTopics, filter]);

  function toggleTopic(name: string) {
    const next = lowerValueSet.has(name.toLowerCase())
      ? value.filter((v) => v.toLowerCase() !== name.toLowerCase())
      : [...value, name];
    next.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    onChange(next);
  }

  function createAndApply(rawName?: string) {
    const source = rawName ?? filter;
    const name = source.trim().slice(0, 100);
    if (!name) return;
    const lower = name.toLowerCase();
    if (value.some((v) => v.toLowerCase() === lower)) {
      // Already applied — just clear the filter and bail
      setFilter('');
      filterRef.current?.focus();
      return;
    }
    const next = [...value, name].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
    onChange(next);
    setFilter('');
    setTimeout(() => filterRef.current?.focus(), 0);
  }

  async function commitRename(from: string) {
    const to = editValue.trim();
    if (!to || to === from) {
      setEditing(null);
      return;
    }
    setPending(from);
    try {
      const res = await fetch('/api/admin/topics/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to }),
      });
      if (!res.ok) throw new Error('Rename failed');
      // Mirror the change locally on the current issue if it had this topic
      if (lowerValueSet.has(from.toLowerCase())) {
        const next = value.map((v) => (v === from ? to : v));
        const deduped = [...new Set(next)];
        deduped.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        onChange(deduped);
      }
      onTopicsRefetch();
    } catch (err) {
      console.error(err);
      toast.error('Could not rename topic. Please try again.');
    } finally {
      setEditing(null);
      setPending(null);
    }
  }

  async function deleteTopic(name: string, count: number) {
    const confirmed = await confirm({
      title: 'Delete topic',
      message:
        count > 0
          ? `Delete "${name}"? It is used in ${count} issue${count === 1 ? '' : 's'} and will be removed from all of them.`
          : `Delete "${name}"?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    setPending(name);
    try {
      const res = await fetch('/api/admin/topics', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Delete failed');
      // Remove locally from current issue if applied
      if (lowerValueSet.has(name.toLowerCase())) {
        onChange(value.filter((v) => v.toLowerCase() !== name.toLowerCase()));
      }
      onTopicsRefetch();
    } catch (err) {
      console.error(err);
      toast.error('Could not delete topic. Please try again.');
    } finally {
      setPending(null);
    }
  }

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Focus filter input when opening
  useEffect(() => {
    if (open) setTimeout(() => filterRef.current?.focus(), 50);
  }, [open]);

  // Viewport-aware placement: open above the trigger when there isn't
  // enough room below, and cap the dropdown height to the available space.
  useEffect(() => {
    if (!open) return;
    function recalc() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const margin = 16;
      const desired = 420; // ideal max height
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      if (spaceBelow >= 280 || spaceBelow >= spaceAbove) {
        setPlacement('bottom');
        setMaxHeight(Math.max(220, Math.min(desired, spaceBelow)));
      } else {
        setPlacement('top');
        setMaxHeight(Math.max(220, Math.min(desired, spaceAbove)));
      }
    }
    recalc();
    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', recalc, true);
    return () => {
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc, true);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Pill display + open trigger.
          Using a div + role="combobox" instead of <button> so the X
          buttons inside the pills aren't nested inside another button. */}
      <div
        ref={triggerRef}
        role="combobox"
        tabIndex={0}
        aria-expanded={open}
        aria-controls="tags-input-listbox"
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className={cn(
          'flex w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-xl border bg-white px-2.5 py-2 text-left text-sm transition-colors',
          open
            ? 'border-flame-300 ring-2 ring-flame-100'
            : 'border-gray-200 hover:border-flame-300',
        )}
      >
        {sortedValue.length === 0 ? (
          <span className="px-1 text-gray-400">{placeholder}</span>
        ) : (
          sortedValue.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-gold-50 to-flame-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-flame-700"
              onClick={(e) => e.stopPropagation()}
            >
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTopic(tag);
                }}
                aria-label={`Remove ${tag}`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-flame-500 transition-colors hover:bg-flame-100 hover:text-flame-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 text-gray-400 transition-transform',
            open && 'rotate-180',
          )}
        />
      </div>

      {/* Managed dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: placement === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: placement === 'top' ? 4 : -4 }}
            transition={{ duration: 0.15 }}
            style={{ maxHeight }}
            className={cn(
              'absolute left-0 right-0 z-30 flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl',
              placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
            )}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                ref={filterRef}
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!exactMatchExists) createAndApply();
                  } else if (e.key === 'Escape') {
                    setOpen(false);
                  }
                }}
                placeholder="Search or type a new topic, then press Enter"
                className="flex-1 border-0 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0"
              />
              {filter && (
                <button
                  type="button"
                  onClick={() => setFilter('')}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Clear filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Persistent Add affordance — always visible. Adapts to the
                filter state so the action is obvious whether you've typed or not. */}
            {(() => {
              const trimmed = filter.trim();
              const alreadyExists = exactMatchExists && trimmed.length > 0;
              const empty = trimmed.length === 0;
              const disabled = alreadyExists;

              return (
                <button
                  type="button"
                  disabled={disabled}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (empty) {
                      filterRef.current?.focus();
                    } else if (!alreadyExists) {
                      createAndApply();
                    }
                  }}
                  className={cn(
                    'flex shrink-0 items-center gap-2 border-b px-4 py-2.5 text-left text-sm transition-colors',
                    alreadyExists
                      ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400'
                      : 'border-flame-100 bg-gradient-to-r from-gold-50/70 to-flame-50/70 text-flame-700 hover:from-gold-100/70 hover:to-flame-100/70',
                  )}
                >
                  <Plus className="h-4 w-4" />
                  <span>
                    {empty
                      ? 'Add new topic'
                      : alreadyExists
                        ? <>{`"${trimmed}"`} already exists</>
                        : <>Add <span className="font-semibold">{`"${trimmed}"`}</span> as a new topic</>}
                  </span>
                  {!empty && !alreadyExists && (
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-flame-500">
                      Enter
                    </span>
                  )}
                </button>
              );
            })()}

            <ul id="tags-input-listbox" role="listbox" className="flex-1 overflow-y-auto overscroll-contain py-1">
              {filteredTopics.length === 0 && exactMatchExists && (
                <li className="px-4 py-3 text-center text-xs text-gray-400">
                  No topics yet. Type a name and press Enter to add one.
                </li>
              )}

              {filteredTopics.map((topic) => {
                const selected = lowerValueSet.has(topic.name.toLowerCase());
                const isEditing = editing === topic.name;
                const isPending = pending === topic.name;
                return (
                  <li
                    key={topic.name}
                    className={cn(
                      'group relative flex items-center gap-2 px-2 py-1.5 transition-colors',
                      selected && !isEditing && 'bg-gradient-to-r from-gold-50/70 to-flame-50/70',
                      isPending && 'opacity-50',
                    )}
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitRename(topic.name);
                          } else if (e.key === 'Escape') {
                            setEditing(null);
                          }
                        }}
                        onBlur={() => commitRename(topic.name)}
                        className="flex-1 rounded-md border border-flame-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-flame-100"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleTopic(topic.name)}
                        disabled={isPending}
                        className="flex flex-1 items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-flame-50"
                      >
                        <span
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                            selected
                              ? 'border-flame-500 bg-gradient-to-r from-gold-500 to-flame-500 text-white'
                              : 'border-gray-300 bg-white',
                          )}
                          aria-hidden
                        >
                          {selected && (
                            <svg viewBox="0 0 12 12" className="h-3 w-3 fill-none stroke-current stroke-2">
                              <path d="M2 6.5l2.5 2.5L10 3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className={cn('flex-1 truncate', selected && 'font-medium text-gray-900')}>
                          {topic.name}
                        </span>
                        <span className="text-[11px] tabular-nums text-gray-400">
                          {topic.count}
                        </span>
                      </button>
                    )}

                    {!isEditing && (
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditValue(topic.name);
                            setEditing(topic.name);
                          }}
                          disabled={isPending}
                          aria-label={`Rename ${topic.name}`}
                          title="Rename across all issues"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-flame-50 hover:text-flame-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTopic(topic.name, topic.count);
                          }}
                          disabled={isPending}
                          aria-label={`Delete ${topic.name}`}
                          title="Delete from all issues"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}

            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
