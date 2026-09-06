export default function IssueDetailLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading issue details"
      aria-busy="true"
      className="min-h-screen bg-white"
    >
      <div className="h-[65px] border-b border-flame-100 bg-white sm:h-[73px]" />
      <div className="border-b border-gray-100 px-6 py-3 lg:px-8">
        <div className="mx-auto h-4 max-w-5xl animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
      </div>

      <main className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="aspect-[3/4] animate-pulse rounded-2xl bg-flame-50 motion-reduce:animate-none lg:col-span-1" />
          <div className="lg:col-span-2">
            <div className="h-10 w-4/5 animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" />
            <div className="mt-4 h-7 w-3/5 animate-pulse rounded bg-flame-50 motion-reduce:animate-none" />
            <div className="mt-8 space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
              <div className="h-4 w-4/6 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-xl bg-gray-50 motion-reduce:animate-none"
                />
              ))}
            </div>
            <div className="mt-8 h-12 w-44 animate-pulse rounded-xl bg-flame-100 motion-reduce:animate-none" />
          </div>
        </div>
      </main>
      <span className="sr-only">Loading issue details…</span>
    </div>
  );
}
