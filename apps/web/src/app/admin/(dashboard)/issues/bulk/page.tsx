'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Trash2, Upload, X, Check, AlertCircle } from 'lucide-react';
import { MONTH_NAMES, type MonthIndex } from '@aim-archive/shared';
import { formatFileSize } from '@/lib/utils';
import { useUI } from '@/components/ui/toast';

interface Magazine {
  id: string;
  name: string;
}

type ItemStatus = 'pending' | 'uploading' | 'done' | 'error';

interface BulkItem {
  id: string;
  file: File;
  magazine_id: string;
  year: number;
  month: number;
  title: string;
  status: ItemStatus;
  message?: string;
}

const MONTH_TOKENS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

/** Build a short prefix for magazine matching (e.g. "Agnishikha" → "agni"). */
function magazinePrefix(name: string): string {
  return name.toLowerCase().split(/\s+/)[0].slice(0, 4);
}

function detectMetadata(filename: string, magazines: Magazine[]) {
  const stripped = filename.replace(/\.pdf$/i, '');
  const lower = stripped.toLowerCase();

  // Year: 4-digit between 1950 and 2099
  const yearMatch = lower.match(/(19[5-9]\d|20\d{2})/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

  // Month: any token recognised in MONTH_TOKENS, longest-match-first
  const tokens = Object.keys(MONTH_TOKENS).sort((a, b) => b.length - a.length);
  let month = 0;
  for (const tok of tokens) {
    if (new RegExp(`\\b${tok}\\b`, 'i').test(lower)) {
      month = MONTH_TOKENS[tok];
      break;
    }
  }
  if (!month) month = new Date().getMonth() + 1;

  // Magazine: prefix match on first word of each magazine's name
  let magazine_id = magazines[0]?.id ?? '';
  for (const m of magazines) {
    const pre = magazinePrefix(m.name);
    if (pre && lower.includes(pre)) {
      magazine_id = m.id;
      break;
    }
  }

  return { year, month, magazine_id };
}

function buildTitle(magazineName: string, month: number, year: number) {
  const monthName = MONTH_NAMES[month as MonthIndex];
  return `${magazineName} — ${monthName} ${year}`;
}

export default function BulkUploadPage() {
  const router = useRouter();
  const { toast } = useUI();
  const fileRef = useRef<HTMLInputElement>(null);

  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [items, setItems] = useState<BulkItem[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch('/api/admin/magazines')
      .then((r) => r.json())
      .then(setMagazines);
  }, []);

  function magName(id: string) {
    return magazines.find((m) => m.id === id)?.name ?? '';
  }

  function addFiles(list: FileList | null) {
    if (!list || magazines.length === 0) return;
    const next: BulkItem[] = [];
    for (const f of Array.from(list)) {
      if (f.type !== 'application/pdf') continue;
      const det = detectMetadata(f.name, magazines);
      next.push({
        id: `${f.name}-${f.size}-${f.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        ...det,
        title: buildTitle(magName(det.magazine_id), det.month, det.year),
        status: 'pending',
      });
    }
    setItems((prev) => [...prev, ...next]);
  }

  function patch(id: string, changes: Partial<BulkItem>) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const merged = { ...it, ...changes };
        // Keep the title aligned with magazine + month + year unless the user
        // has explicitly typed in the title field (handled by patchTitle below).
        if (
          changes.magazine_id !== undefined ||
          changes.month !== undefined ||
          changes.year !== undefined
        ) {
          merged.title = buildTitle(magName(merged.magazine_id), merged.month, merged.year);
        }
        return merged;
      }),
    );
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function uploadOne(item: BulkItem): Promise<boolean> {
    const fd = new FormData();
    fd.append('pdf', item.file);
    fd.append('magazine_id', item.magazine_id);
    fd.append('title', item.title);
    fd.append('year', String(item.year));
    fd.append('month', String(item.month));
    fd.append('description', '');
    fd.append('topics', '');
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      patch(item.id, { status: 'error', message: data.error || 'Upload failed' });
      return false;
    }
    patch(item.id, { status: 'done', message: 'Uploaded' });
    return true;
  }

  async function uploadAll() {
    if (running) return;
    setRunning(true);
    let okCount = 0;
    for (const item of items) {
      if (item.status === 'done') {
        okCount++;
        continue;
      }
      patch(item.id, { status: 'uploading', message: undefined });
      const ok = await uploadOne(item);
      if (ok) okCount++;
    }
    setRunning(false);
    toast[okCount === items.length ? 'success' : okCount > 0 ? 'info' : 'error'](
      `${okCount} / ${items.length} uploaded`,
    );
    if (okCount === items.length) router.push('/admin/issues');
  }

  const allDone = items.length > 0 && items.every((i) => i.status === 'done');
  const pendingCount = items.filter((i) => i.status === 'pending' || i.status === 'error').length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/issues" className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Bulk Upload</h1>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          addFiles(e.dataTransfer.files);
        }}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-10 transition-colors hover:border-flame-300 hover:bg-flame-50/40"
      >
        <Upload className="h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-700">
          Drop multiple PDFs here, or click to select
        </p>
        <p className="text-xs text-gray-400">
          Magazine, month and year are auto-detected from each filename — review before uploading.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={(e) => addFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">File</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Magazine</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Month</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Year</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Title</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-flame-500" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-gray-900">
                            {item.file.name}
                          </p>
                          <p className="text-[10px] text-gray-400">{formatFileSize(item.file.size)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.magazine_id}
                        onChange={(e) => patch(item.id, { magazine_id: e.target.value })}
                        disabled={item.status === 'uploading' || item.status === 'done'}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                      >
                        {magazines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.month}
                        onChange={(e) => patch(item.id, { month: Number(e.target.value) })}
                        disabled={item.status === 'uploading' || item.status === 'done'}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                      >
                        {Object.entries(MONTH_NAMES).map(([n, name]) => (
                          <option key={n} value={n}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.year}
                        onChange={(e) => patch(item.id, { year: Number(e.target.value) })}
                        disabled={item.status === 'uploading' || item.status === 'done'}
                        className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it) => (it.id === item.id ? { ...it, title: e.target.value } : it)),
                          )
                        }
                        disabled={item.status === 'uploading' || item.status === 'done'}
                        className="w-full min-w-[14rem] rounded-lg border border-gray-200 px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <StatusBadge status={item.status} message={item.message} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.status !== 'uploading' && item.status !== 'done' && (
                        <button
                          onClick={() => remove(item.id)}
                          className="text-gray-400 hover:text-red-500"
                          aria-label="Remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              {items.length} file{items.length === 1 ? '' : 's'} ready
              {pendingCount > 0 && ` · ${pendingCount} pending`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setItems([])}
                disabled={running}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </button>
              <button
                onClick={uploadAll}
                disabled={running || allDone}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {running ? 'Uploading...' : allDone ? 'All uploaded' : `Upload ${pendingCount}`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status, message }: { status: ItemStatus; message?: string }) {
  if (status === 'pending') return <span className="text-gray-400">Pending</span>;
  if (status === 'uploading')
    return (
      <span className="inline-flex items-center gap-1.5 text-flame-700">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-flame-100 border-t-flame-500" />
        Uploading…
      </span>
    );
  if (status === 'done')
    return (
      <span className="inline-flex items-center gap-1 text-green-600">
        <Check className="h-3.5 w-3.5" />
        Done
      </span>
    );
  return (
    <span
      className="inline-flex items-center gap-1 text-red-600"
      title={message}
    >
      <AlertCircle className="h-3.5 w-3.5" />
      {message ?? 'Error'}
    </span>
  );
}
