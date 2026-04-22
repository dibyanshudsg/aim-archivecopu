'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { MONTH_NAMES } from '@aim-archive/shared';
import type { MonthIndex } from '@aim-archive/shared';
import { formatFileSize } from '@/lib/utils';

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

  const [form, setForm] = useState({
    magazine_id: '',
    title: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    description: '',
    topics: '',
  });

  useEffect(() => {
    fetch('/api/admin/magazines')
      .then((r) => r.json())
      .then((data) => {
        setMagazines(data);
        if (data.length > 0) setForm((f) => ({ ...f, magazine_id: data[0].id }));
      });
  }, []);

  // Auto-generate title when magazine/month/year change
  useEffect(() => {
    const mag = magazines.find((m) => m.id === form.magazine_id);
    if (mag) {
      const monthName = MONTH_NAMES[form.month as MonthIndex];
      setForm((f) => ({ ...f, title: `${mag.name} ${monthName}-${form.year}` }));
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
    formData.append('topics', form.topics);

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
              file ? 'border-gold-300 bg-gold-50/50' : 'border-gray-200 hover:border-gold-300 hover:bg-gray-50'
            }`}
          >
            {file ? (
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-gold-500" />
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

        {/* Magazine & Date */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Magazine</label>
            <select
              value={form.magazine_id}
              onChange={(e) => setForm({ ...form, magazine_id: e.target.value })}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-200"
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
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-200"
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
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-200"
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
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-200"
          />
        </div>

        {/* Topics */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Topics <span className="text-gray-400">(comma-separated)</span>
          </label>
          <input
            type="text"
            value={form.topics}
            onChange={(e) => setForm({ ...form, topics: e.target.value })}
            placeholder="e.g., Surrender, Divine Grace, Karma Yoga"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-200"
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
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-200"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={uploading || !file}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-gold-600 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {uploading ? progress : 'Upload Issue'}
        </button>
      </form>
    </div>
  );
}
