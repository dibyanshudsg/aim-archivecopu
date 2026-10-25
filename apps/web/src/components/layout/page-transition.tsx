'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrowseLoading } from '@/app/browse/loading';
import { SearchLoading } from '@/app/search/search-loading';
import { BookmarksLoading } from '@/app/bookmarks/bookmarks-loading';
import { HomeLoading } from '@/app/loading';

const loadingPages = {
  '/': HomeLoading,
  '/browse': BrowseLoading,
  '/search': SearchLoading,
  '/bookmarks': BookmarksLoading,
} as const;
type LoadingPath = keyof typeof loadingPages;

/**
 * Fast navigations go directly to content. Slower ones get a loading view
 * after a short delay, while the current page stays visible at click time.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<LoadingPath | null>(null);
  const [showPending, setShowPending] = useState(false);
  useEffect(() => { setPendingPath(null); setShowPending(false); }, [pathname]);
  useEffect(() => {
    if (!pendingPath) return;
    const reveal = window.setTimeout(() => setShowPending(true), 350);
    const timeout = window.setTimeout(() => setPendingPath(null), 15000);
    const clear = () => { setPendingPath(null); setShowPending(false); };
    window.addEventListener('popstate', clear);
    return () => {
      window.clearTimeout(reveal);
      window.clearTimeout(timeout);
      window.removeEventListener('popstate', clear);
    };
  }, [pendingPath]);

  function handleNavigationClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
    const destination = new URL(anchor.href, window.location.href);
    if (destination.origin !== window.location.origin || destination.pathname === pathname) return;
    if (destination.pathname in loadingPages) {
      setShowPending(false);
      setPendingPath(destination.pathname as LoadingPath);
    }
  }

  // Admin routes have their own persistent sidebar shell. Keying the whole
  // app by pathname remounts that shell on every sidebar click, which causes a
  // white flash and repeats admin boot work. Keep admin transitions local.
  if (pathname?.startsWith('/admin')) return <>{children}</>;

  const PendingLoading = pendingPath ? loadingPages[pendingPath] : null;

  return <>
    <div onClickCapture={handleNavigationClick}>
      {children}
    </div>
    {showPending && PendingLoading && pathname !== pendingPath && (
      <div className="route-loading-scroll fixed inset-0 z-[60] overflow-y-auto bg-white" aria-label="Opening page">
        <PendingLoading />
      </div>
    )}
  </>;
}
