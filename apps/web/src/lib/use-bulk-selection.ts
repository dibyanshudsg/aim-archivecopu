'use client';

import { create } from 'zustand';

interface BulkSelectionState {
  /** When true, cards/rows show selection checkboxes and clicks toggle
   *  selection instead of navigating to the reader. */
  enabled: boolean;
  selectedIds: Set<string>;
  enable: () => void;
  /** Disable selection mode and clear the current selection. */
  disable: () => void;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
}

export const useBulkSelection = create<BulkSelectionState>((set) => ({
  enabled: false,
  selectedIds: new Set(),
  enable: () => set({ enabled: true }),
  disable: () => set({ enabled: false, selectedIds: new Set() }),
  toggle: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clear: () => set({ selectedIds: new Set() }),
}));
