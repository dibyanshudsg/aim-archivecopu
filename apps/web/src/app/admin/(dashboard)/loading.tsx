export default function AdminPageLoading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading admin page">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-8 w-44 animate-pulse rounded-lg bg-gray-100" />
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
        <div className="mt-6 h-12 w-full animate-pulse rounded-xl bg-gray-50" />
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="h-5 w-52 animate-pulse rounded bg-gray-100" />
        <div className="mt-6 space-y-4">
          <div className="h-12 animate-pulse rounded-lg bg-gray-50" />
          <div className="h-12 animate-pulse rounded-lg bg-gray-50" />
          <div className="h-12 animate-pulse rounded-lg bg-gray-50" />
        </div>
      </div>
      <span className="sr-only">Loading admin page</span>
    </div>
  );
}
