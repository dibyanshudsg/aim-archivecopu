import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BookmarksState {
  bookmarkedIds: string[];
  toggle: (issueId: string) => void;
  isBookmarked: (issueId: string) => boolean;
  clear: () => void;
}

export const useBookmarks = create<BookmarksState>()(
  persist(
    (set, get) => ({
      bookmarkedIds: [],
      toggle: (issueId) => {
        const current = get().bookmarkedIds;
        if (current.includes(issueId)) {
          set({ bookmarkedIds: current.filter((id) => id !== issueId) });
        } else {
          set({ bookmarkedIds: [...current, issueId] });
        }
      },
      isBookmarked: (issueId) => get().bookmarkedIds.includes(issueId),
      clear: () => set({ bookmarkedIds: [] }),
    }),
    { name: 'aim-archive-bookmarks' },
  ),
);
