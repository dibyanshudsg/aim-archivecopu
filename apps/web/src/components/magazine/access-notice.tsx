import Link from 'next/link';
import { BookOpen, Lock } from 'lucide-react';

export function AccessNotice({ liftLabel, magazineId, refreshing = false }: {
  liftLabel: string | null;
  magazineId?: string;
  refreshing?: boolean;
}) {
  const params = new URLSearchParams({ availability: 'read' });
  if (magazineId) params.set('magazine', magazineId);
  return (
    <div className="mt-6 rounded-xl border border-flame-200 bg-flame-50/60 p-5 text-left">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
        <Lock className="h-5 w-5 shrink-0 text-flame-700" />
        {liftLabel ? `Public reading opens in ${liftLabel}` : 'Public reading is not yet available'}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">
        Recent editions are reserved for print circulation. Each edition enters the free public archive five years after publication.
      </p>
      <Link href={`/browse?${params}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-flame-700 px-4 py-2 text-sm font-semibold text-white hover:bg-flame-800 focus-visible:ring-2 focus-visible:ring-flame-500 focus-visible:ring-offset-2">
        <BookOpen className="h-4 w-4" /> Read available editions
      </Link>
      {refreshing && <p role="status" className="mt-3 text-sm text-flame-800">Checking reading access…</p>}
    </div>
  );
}
