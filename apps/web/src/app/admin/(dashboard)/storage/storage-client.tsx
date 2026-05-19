'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Link2,
  Loader2,
  RefreshCw,
  Trash2,
  Unlink,
} from 'lucide-react';
import { useUI } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import type { AdminStorageData, R2Object } from '@/lib/admin-data';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function fileIcon(key: string) {
  if (/\.(jpe?g|png|webp|gif)$/i.test(key)) return ImageIcon;
  return FileText;
}

export function StorageClient({
  initialData,
  initialError = '',
}: {
  initialData: AdminStorageData | null;
  initialError?: string;
}) {
  const ui = useUI();
  const [data, setData] = useState<AdminStorageData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const r = await fetch('/api/admin/storage');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = (await r.json()) as AdminStorageData;
      setData(d);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load storage';
      setError(message);
      ui.toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ui.toast]);

  const grouped = useMemo(() => {
    if (!data) return new Map<string, R2Object[]>();
    const map = new Map<string, R2Object[]>();
    for (const obj of data.r2.objects) {
      const prefix = obj.key.includes('/') ? obj.key.split('/')[0] : '(root)';
      if (!map.has(prefix)) map.set(prefix, []);
      map.get(prefix)!.push(obj);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.key.localeCompare(b.key));
    }
    return new Map([...map.entries()].sort());
  }, [data]);

  async function handleDelete(obj: R2Object) {
    const fileName = obj.key.split('/').pop() ?? obj.key;
    const linkInfo = obj.linkedIssue
      ? `\n\nThis file is currently linked to the issue "${obj.linkedIssue.title}" as its ${obj.linkedIssue.field === 'pdf_url' ? 'PDF (the issue will become unreadable until you re-upload it)' : 'cover image (the cover will be cleared automatically)'}.`
      : '';

    const ok = await ui.confirm({
      title: 'Delete file from R2?',
      message: `${fileName}\n\nSize: ${formatBytes(obj.size)}${linkInfo}\n\nThis cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true,
    });
    if (!ok) return;

    setDeletingKey(obj.key);
    try {
      const r = await fetch('/api/admin/storage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: obj.key }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      ui.toast.success(`Deleted ${fileName}`);
      await load(true);
    } catch (err) {
      ui.toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-flame-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Failed to load storage data.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Storage</h1>
          <p className="mt-1 text-sm text-gray-500">
            Files in Cloudflare R2 and any issues still served from legacy Supabase Storage.
          </p>
        </div>
        <button
          onClick={() => load()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<HardDrive className="h-5 w-5 text-flame-600" />}
          label="R2 objects"
          value={data.r2.objectCount.toLocaleString()}
          subtle={formatBytes(data.r2.totalBytes)}
        />
        <StatCard
          icon={<Link2 className="h-5 w-5 text-emerald-600" />}
          label="Linked"
          value={data.r2.linkedCount.toLocaleString()}
          subtle="referenced by an issue"
        />
        <StatCard
          icon={<Unlink className="h-5 w-5 text-amber-600" />}
          label="Orphans"
          value={data.r2.orphanCount.toLocaleString()}
          subtle="not referenced anywhere"
          highlight={data.r2.orphanCount > 0}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-blue-600" />}
          label="Supabase legacy"
          value={data.supabaseLegacy.issueCount.toLocaleString()}
          subtle="issues awaiting migration"
        />
      </div>

      {/* R2 objects */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <header className="border-b border-gray-100 px-5 py-3">
          <h2 className="font-heading text-sm font-semibold text-gray-900">
            Cloudflare R2 · {data.r2.objectCount} object{data.r2.objectCount === 1 ? '' : 's'}
          </h2>
        </header>

        {data.r2.objects.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">
            The R2 bucket is empty.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {[...grouped.entries()].map(([prefix, items]) => (
              <div key={prefix}>
                <div className="bg-gray-50/70 px-5 py-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
                  {prefix}/
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {items.map((obj) => {
                      const Icon = fileIcon(obj.key);
                      const fileName = obj.key.includes('/')
                        ? obj.key.slice(prefix.length + 1)
                        : obj.key;
                      const linked = obj.linkedIssue;
                      const isPdf = linked?.field === 'pdf_url';
                      return (
                        <tr key={obj.key} className="hover:bg-gray-50/50">
                          <td className="w-10 py-3 pl-5">
                            <Icon className="h-4 w-4 text-gray-400" />
                          </td>
                          <td className="py-3">
                            <a
                              href={obj.publicUrl}
                              target="_blank"
                              rel="noopener"
                              className="font-medium text-gray-900 hover:text-flame-600"
                              title="Open in new tab"
                            >
                              {fileName}
                            </a>
                          </td>
                          <td className="py-3 text-right text-gray-500 tabular-nums">
                            {formatBytes(obj.size)}
                          </td>
                          <td className="hidden py-3 pl-4 text-right text-gray-500 tabular-nums md:table-cell">
                            {formatDate(obj.lastModified)}
                          </td>
                          <td className="py-3 pl-4">
                            {linked ? (
                              <Link
                                href={`/admin/issues#${linked.id}`}
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                                  isPdf
                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                                    : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
                                )}
                                title={`Linked to "${linked.title}" via ${linked.field}`}
                              >
                                <Link2 className="h-3 w-3" />
                                {isPdf ? 'PDF' : 'Cover'}
                              </Link>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                                <Unlink className="h-3 w-3" />
                                Orphan
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-5 pl-4">
                            <div className="flex items-center justify-end gap-1">
                              <a
                                href={obj.publicUrl}
                                target="_blank"
                                rel="noopener"
                                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                title="Open public URL"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                              <button
                                onClick={() => handleDelete(obj)}
                                disabled={deletingKey === obj.key}
                                className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                title="Delete from R2"
                              >
                                {deletingKey === obj.key ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Legacy Supabase issues */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <header className="border-b border-gray-100 px-5 py-3">
          <h2 className="font-heading text-sm font-semibold text-gray-900">
            Supabase legacy · {data.supabaseLegacy.issueCount} issue
            {data.supabaseLegacy.issueCount === 1 ? '' : 's'}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            These issues still serve files from the old Supabase Storage bucket. The Phase 3
            migration script will move them to R2.
          </p>
        </header>

        {data.supabaseLegacy.issues.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">
            ✓ Every issue is on R2. Migration is complete.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-xs tracking-wide text-gray-500 uppercase">
                <th className="py-2 pl-5 text-left font-medium">Issue</th>
                <th className="py-2 text-left font-medium">PDF</th>
                <th className="py-2 text-left font-medium">Cover</th>
                <th className="py-2 pr-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.supabaseLegacy.issues.map((issue) => (
                <tr key={issue.id}>
                  <td className="py-3 pl-5 font-medium text-gray-900">{issue.title}</td>
                  <td className="py-3 text-xs">
                    {issue.pdfOnSupabase ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 ring-1 ring-amber-100">
                        Supabase
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-100">
                        R2
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-xs">
                    {issue.coverOnSupabase ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 ring-1 ring-amber-100">
                        Supabase
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-100">
                        R2
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-5 text-right">
                    <Link
                      href={`/admin/issues#${issue.id}`}
                      className="text-xs font-medium text-flame-600 hover:text-flame-700"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtle,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtle: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-white p-4',
        highlight ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200',
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-heading text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{subtle}</div>
    </div>
  );
}
