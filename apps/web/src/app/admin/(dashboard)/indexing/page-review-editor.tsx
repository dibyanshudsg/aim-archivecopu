'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CoverageIssue } from '@/lib/indexing-workspace';

const control =
  'min-h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-600 disabled:cursor-not-allowed disabled:opacity-50';
export function PageReviewEditor({
  issue,
  page,
  onSaved,
}: {
  issue: CoverageIssue;
  page: number;
  onSaved: () => void;
}) {
  const [decision, setDecision] = useState<'transcribe' | 'exclude'>('transcribe');
  const [content, setContent] = useState('');
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const prefix = `review-${issue.id}-${page}`;
  async function save() {
    if (busy || !checked) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/indexing/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueId: issue.id,
          page,
          sourceHash: issue.source_hash,
          pdfUrl: issue.pdf_url,
          decision,
          content,
          note,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw Error(result.error || 'Could not save the review.');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the review.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 border-t border-gray-200 py-4" aria-labelledby={prefix}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={prefix} className="font-semibold text-gray-900">
          Page {page}
          {page === 1 ? ' · Cover' : ''}
        </h4>
        <Link
          className={control}
          href={`/admin/indexing/${issue.id}/preview?page=${page}`}
          target="_blank"
          rel="noopener"
        >
          Inspect PDF (new tab)
        </Link>
      </div>
      <label className="block text-sm text-gray-700" htmlFor={`${prefix}-decision`}>
        Review decision
      </label>
      <select
        id={`${prefix}-decision`}
        className={control + ' w-full'}
        value={decision}
        disabled={busy}
        onChange={(e) => {
          setDecision(e.target.value as typeof decision);
          setChecked(false);
        }}
      >
        <option value="transcribe">Add verified text to search</option>
        <option value="exclude">Keep this page out of text search</option>
      </select>
      {decision === 'transcribe' ? (
        <>
          <label className="block text-sm text-gray-700" htmlFor={`${prefix}-text`}>
            Verified page text
          </label>
          <textarea
            id={`${prefix}-text`}
            className={control + ' min-h-32 w-full'}
            maxLength={20000}
            value={content}
            disabled={busy}
            onChange={(e) => {
              setContent(e.target.value);
              setChecked(false);
            }}
            aria-describedby={`${prefix}-help`}
          />
          <p id={`${prefix}-help`} className="text-sm text-gray-600">
            Copy only text you can verify against the PDF. This text will appear in public search
            when the issue is readable.
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-600">
          The PDF page stays visible. Its text will remain excluded from search, and the review flag
          will be resolved.
        </p>
      )}
      <label className="block text-sm text-gray-700" htmlFor={`${prefix}-note`}>
        Review note
      </label>
      <textarea
        id={`${prefix}-note`}
        className={control + ' min-h-20 w-full'}
        maxLength={1000}
        value={note}
        disabled={busy}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Explain what you verified or why the page is excluded."
      />
      <label className="flex min-h-11 items-start gap-2 py-2 text-sm text-gray-700">
        <input
          type="checkbox"
          className="mt-1 accent-flame-600"
          checked={checked}
          disabled={busy}
          onChange={(e) => setChecked(e.target.checked)}
        />
        I inspected this PDF page and confirm this decision.
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {['queued', 'processing'].includes(issue.status) && (
        <p className="text-sm text-amber-900">
          Wait for indexing to finish before saving a review.
        </p>
      )}
      <button
        className={control + ' font-semibold hover:bg-flame-50'}
        disabled={
          busy ||
          ['queued', 'processing'].includes(issue.status) ||
          !checked ||
          !note.trim() ||
          (decision === 'transcribe' && !content.trim())
        }
        onClick={() => void save()}
      >
        {busy ? 'Saving review…' : 'Save review decision'}
      </button>
    </section>
  );
}
