'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, X, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { MONTH_NAMES } from '@aim-archive/shared';
import type { MonthIndex } from '@aim-archive/shared';
import { formatFileSize } from '@/lib/utils';
import { TagsInput, type ManagedTopic } from '@/components/admin/tags-input';

interface Magazine {
  id: string;
  name: string;
  language: string;
}

export default function UploadIssuePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [allTopics, setAllTopics] = useState<ManagedTopic[]>([]);

  const coverRef = useRef<HTMLInputElement>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverDims, setCoverDims] = useState<{ w: number; h: number } | null>(null);
  const [coverOrientation, setCoverOrientation] = useState<'front-right' | 'front-left'>('front-right');

  async function refetchTopics() {
    try {
      const res = await fetch('/api/admin/topics');
      if (res.ok) setAllTopics(await res.json());
    } catch {}
  }

  const [form, setForm] = useState({
    magazine_id: '',
    title: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    description: '',
    topics: [] as string[],
  });

  useEffect(() => {
    fetch('/api/admin/magazines')
      .then((r) => r.json())
      .then((data) => {
        setMagazines(data);
        if (data.length > 0) setForm((f) => ({ ...f, magazine_id: data[0].id }));

        // Pick up "Duplicate issue" prefill — magazine, topics, description.
        try {
          const raw = sessionStorage.getItem('aim-prefill-issue');
          if (!raw) return;
          sessionStorage.removeItem('aim-prefill-issue');
          const pre = JSON.parse(raw) as {
            magazine_id?: string;
            topics?: string[];
            description?: string;
          };
          setForm((f) => ({
            ...f,
            magazine_id: pre.magazine_id ?? f.magazine_id,
            topics: pre.topics ?? f.topics,
            description: pre.description ?? f.description,
          }));
        } catch {}
      });
  }, []);

  // Pull the master topics list (with usage counts) for the dropdown.
  useEffect(() => {
    refetchTopics();
  }, []);

  // Auto-generate title when magazine/month/year change
  useEffect(() => {
    const mag = magazines.find((m) => m.id === form.magazine_id);
    if (mag) {
      const monthName = MONTH_NAMES[form.month as MonthIndex];
      setForm((f) => ({ ...f, title: `${mag.name} — ${monthName} ${form.year}` }));
    }
  }, [form.magazine_id, form.month, form.year, magazines]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setError('');
    } else {
      setError('Please select a PDF file');
    }
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Cover must be an image file (JPG, PNG, WebP)');
      return;
    }
    setError('');
    setCoverFile(f);
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    const url = URL.createObjectURL(f);
    setCoverPreviewUrl(url);
    const probe = new window.Image();
    probe.onload = () => setCoverDims({ w: probe.naturalWidth, h: probe.naturalHeight });
    probe.src = url;
  }

  function clearCover() {
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    setCoverFile(null);
    setCoverPreviewUrl(null);
    setCoverDims(null);
    if (coverRef.current) coverRef.current.value = '';
  }

  // Detect spread vs single cover for live preview overlay
  const isSpread = coverDims ? coverDims.w / coverDims.h > 1.1 : false;

  async function downloadCoverHalf(side: 'front' | 'back') {
    if (!coverPreviewUrl || !coverFile) return;

    // 1. Decode the image and crop the requested half via canvas.
    const probe = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = coverPreviewUrl;
    });

    const halfW = Math.floor(probe.naturalWidth / 2);
    const canvas = document.createElement('canvas');
    canvas.width = halfW;
    canvas.height = probe.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const frontIsOnRight = coverOrientation === 'front-right';
    const sx =
      (side === 'front' && frontIsOnRight) || (side === 'back' && !frontIsOnRight)
        ? probe.naturalWidth - halfW
        : 0;
    ctx.drawImage(probe, sx, 0, halfW, probe.naturalHeight, 0, 0, halfW, probe.naturalHeight);

    const jpegBlob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, 'image/jpeg', 0.95),
    );
    if (!jpegBlob) return;
    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());

    // 2. Wrap the cropped JPEG in a single-page PDF sized to its pixels (1:1).
    const { buildJpegPdf } = await import('@/lib/build-jpeg-pdf');
    const pdfBytes = buildJpegPdf(jpegBytes, halfW, probe.naturalHeight);

    // 3. Trigger download.
    const baseName = coverFile.name.replace(/\.[^.]+$/, '');
    const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${baseName}-${side}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Please select a PDF file'); return; }

    setUploading(true);
    setProgress('Uploading PDF...');
    setError('');

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('magazine_id', form.magazine_id);
    formData.append('title', form.title);
    formData.append('year', String(form.year));
    formData.append('month', String(form.month));
    formData.append('description', form.description);
    formData.append('topics', form.topics.join(','));
    if (coverFile) {
      formData.append('cover', coverFile);
      formData.append('cover_orientation', coverOrientation);
    }

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Upload failed');
        return;
      }

      setProgress('Done!');
      router.push('/admin/issues');
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/issues" className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Upload New Issue</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6">
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {/* PDF File Drop Zone */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">PDF File</label>
          <div
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors ${
              file ? 'border-flame-300 bg-gradient-to-r from-gold-50/60 to-flame-50/60' : 'border-gray-200 hover:border-flame-300 hover:bg-flame-50/40'
            }`}
          >
            {file ? (
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-flame-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="ml-2 rounded-lg p-1 text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-600">Click to select PDF</p>
                <p className="text-xs text-gray-400">Max 50MB</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Cover Image (optional, with auto-crop preview) */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Cover Image <span className="text-xs font-normal text-gray-400">(optional — overrides PDF page 1)</span>
          </label>

          {!coverPreviewUrl ? (
            <div
              onClick={() => coverRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-6 transition-colors hover:border-flame-300 hover:bg-flame-50/40"
            >
              <Upload className="h-7 w-7 text-gray-400" />
              <p className="mt-2 text-sm font-medium text-gray-600">Click to select cover image</p>
              <p className="text-xs text-gray-400">JPG / PNG · combined front+back spread is fine</p>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-flame-200 bg-gradient-to-br from-gold-50/50 to-flame-50/50 p-4">
              {/* Original spread with overlay highlighting kept half */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-500">
                  Source ({coverDims ? `${coverDims.w} × ${coverDims.h} px` : 'loading...'})
                  {isSpread && (
                    <span className="ml-2 rounded-full bg-gradient-to-r from-gold-100 to-flame-100 px-2 py-0.5 text-[10px] font-semibold text-flame-700">
                      Spread detected · cropping {coverOrientation === 'front-right' ? 'right' : 'left'} half
                    </span>
                  )}
                  {coverDims && !isSpread && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                      Single cover · used as-is
                    </span>
                  )}
                </p>
                <div className="relative mx-auto max-w-md overflow-hidden rounded-lg bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreviewUrl} alt="Cover preview" className="block w-full" />
                  {isSpread && (
                    <div
                      className={`pointer-events-none absolute inset-y-0 bg-black/55 ${
                        coverOrientation === 'front-right' ? 'left-0 right-1/2' : 'left-1/2 right-0'
                      }`}
                    />
                  )}
                  {isSpread && (
                    <div
                      className={`pointer-events-none absolute inset-y-0 ring-2 ring-inset ring-flame-400 ${
                        coverOrientation === 'front-right' ? 'left-1/2 right-0' : 'left-0 right-1/2'
                      }`}
                    />
                  )}
                </div>
              </div>

              {isSpread && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">
                      Front cover position in the spread:
                    </p>
                    <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white text-xs">
                      <button
                        type="button"
                        onClick={() => setCoverOrientation('front-left')}
                        className={`px-3 py-1.5 transition-colors ${
                          coverOrientation === 'front-left' ? 'bg-gradient-to-r from-gold-500 to-flame-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Left
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoverOrientation('front-right')}
                        className={`px-3 py-1.5 transition-colors ${
                          coverOrientation === 'front-right' ? 'bg-gradient-to-r from-gold-500 to-flame-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Right
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => downloadCoverHalf('front')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-flame-300 bg-white px-3 py-1.5 text-xs font-medium text-flame-700 transition-colors hover:bg-flame-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Front cover PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadCoverHalf('back')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Back cover PDF
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-flame-200/60 pt-3">
                <p className="truncate text-xs text-gray-500">
                  {coverFile?.name} · {coverFile ? formatFileSize(coverFile.size) : ''}
                </p>
                <button
                  type="button"
                  onClick={clearCover}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-white hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          )}

          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            className="hidden"
          />
        </div>

        {/* Magazine & Date */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Magazine</label>
            <select
              value={form.magazine_id}
              onChange={(e) => setForm({ ...form, magazine_id: e.target.value })}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
            >
              {magazines.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Month</label>
            <select
              value={form.month}
              onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
            >
              {Object.entries(MONTH_NAMES).map(([num, name]) => (
                <option key={num} value={num}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Year</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
            />
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
          />
        </div>

        {/* Topics */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Topics</label>
          <TagsInput
            value={form.topics}
            onChange={(topics) => setForm({ ...form, topics })}
            allTopics={allTopics}
            onTopicsRefetch={refetchTopics}
            placeholder="Click to manage topics"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Brief description of this issue..."
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={uploading || !file}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {uploading ? progress : 'Upload Issue'}
        </button>
      </form>
    </div>
  );
}
