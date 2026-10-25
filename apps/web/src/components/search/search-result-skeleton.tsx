export function SearchResultSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5" aria-hidden="true">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="archive-skeleton-wave relative h-20 w-[60px] shrink-0 rounded-md bg-flame-50" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="archive-skeleton-wave relative h-4 w-3/4 rounded bg-flame-50" />
          <div className="archive-skeleton-wave relative h-3 w-1/3 rounded bg-flame-50" />
          <div className="archive-skeleton-wave relative h-3 w-full rounded bg-flame-50" />
          <div className="archive-skeleton-wave relative h-3 w-5/6 rounded bg-flame-50" />
        </div>
        <div className="archive-skeleton-wave relative hidden h-11 w-16 shrink-0 rounded-lg bg-flame-50 sm:block" />
      </div>
    </div>
  );
}
