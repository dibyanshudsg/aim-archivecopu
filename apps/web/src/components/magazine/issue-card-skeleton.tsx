export function IssueCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm" aria-hidden="true">
      <div className="archive-skeleton-wave relative aspect-[3/4] bg-flame-50" />
      <div className="space-y-2 p-3.5">
        <div className="archive-skeleton-wave relative h-3.5 w-3/4 rounded bg-flame-50" />
        <div className="archive-skeleton-wave relative h-3 w-full rounded bg-flame-50" />
        <div className="archive-skeleton-wave relative h-3 w-1/2 rounded bg-flame-50" />
      </div>
    </div>
  );
}
