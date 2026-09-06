'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RefreshCw, Search, X, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { useUI } from '@/components/ui/toast';
import {
  indexingStatusLabels as labels,
  type CoverageIssue,
  type IndexingCatalogue,
  type IndexingFilters,
  type IndexingRun,
} from '@/lib/indexing-workspace';

const endpoint = '/api/admin/indexing/catalogue';
const control =
  'min-h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-600 disabled:opacity-50 disabled:cursor-not-allowed';
const action = control + ' font-medium hover:border-flame-400 hover:bg-flame-50';
const primary =
  'min-h-10 rounded-lg bg-gradient-to-r from-gold-500 to-flame-500 px-4 py-2 text-sm font-semibold text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-600 disabled:opacity-50 disabled:cursor-not-allowed';
const dates = (date: string | null) =>
  date
    ? new Date(date).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not recorded';
const stateClass = (status: string) =>
  status === 'failed'
    ? 'text-red-700 bg-red-50'
    : status === 'review' || status === 'unverified' || status === 'unavailable'
      ? 'text-amber-900 bg-amber-50'
      : status === 'indexed' || status === 'complete'
        ? 'text-green-800 bg-green-50'
        : 'text-gray-700 bg-gray-100';
function Status({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${stateClass(status)}`}>
      {labels[status] ??
        (status === 'complete'
          ? 'Indexed'
          : status === 'superseded'
            ? 'Superseded'
            : status.replaceAll('_', ' '))}
    </span>
  );
}
function title(issue: { theme: string | null; title: string }) {
  return issue.theme || issue.title;
}
function Pager({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
      <span>
        {total
          ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`
          : '0 results'}
      </span>
      <div className="flex items-center gap-2">
        <button
          className={action}
          disabled={page <= 1}
          aria-label="Previous page"
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button
          className={action}
          disabled={page >= pages}
          aria-label="Next page"
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function IndexingWorkspace({ initial }: { initial: IndexingCatalogue }) {
  const { confirm, toast } = useUI();
  const [data, setData] = useState(initial);
  const [filters, setFilters] = useState<IndexingFilters>({ status: 'attention', page: 1 });
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'coverage' | 'history'>('coverage');
  const [history, setHistory] = useState<{
    runs: IndexingRun[];
    total: number;
    page: number;
    pageSize: number;
  }>({ runs: [], total: 0, page: 1, pageSize: 25 });
  const [historyPage, setHistoryPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision((n) => n + 1);
  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => ({ ...f, q: query, page: 1 })), 300);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let first = true;
    const load = async () => {
      if (first) setLoading(true);
      try {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(filters))
          if (value != null) params.set(key, String(value));
        const requests = [
          fetch(endpoint + '?' + params, { signal: controller.signal, cache: 'no-store' }),
        ];
        if (tab === 'history')
          requests.push(
            fetch(endpoint + `?view=history&page=${historyPage}`, {
              signal: controller.signal,
              cache: 'no-store',
            }),
          );
        const responses = await Promise.all(requests);
        if (responses.some((r) => !r.ok))
          throw Error(
            responses.some((r) => r.status === 401)
              ? 'Your session expired. Sign in again.'
              : 'Could not load indexing data. Refresh to try again.',
          );
        const values = await Promise.all(responses.map((r) => r.json()));
        if (!controller.signal.aborted) {
          setData(values[0]);
          if (values[1]) setHistory(values[1]);
          setError('');
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Could not load indexing data.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          first = false;
          timer = setTimeout(() => {
            if (document.hidden) timer = setTimeout(load, 5000);
            else void load();
          }, 5000);
        }
      }
    };
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [filters, tab, historyPage, revision]);
  function filter(key: keyof IndexingFilters, value: string) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
    setTab('coverage');
  }
  async function queue(kind: 'missing' | 'retry' | 'selected', ids?: string[]) {
    const chosen = ids ?? [...selected];
    if (kind === 'selected' && !chosen.length) return;
    const ok = await confirm({
      title:
        kind === 'selected'
          ? 'Index selected issues?'
          : kind === 'retry'
            ? 'Retry failed issues?'
            : 'Index missing issues?',
      message:
        kind === 'selected'
          ? `${chosen.length} selected issue(s) will be queued. Existing indexes will be rebuilt; active jobs and unsupported editions are skipped. Start Run workflow on GitHub to process this queue.`
          : `Up to 100 ${kind === 'retry' ? 'failed' : 'missing'} eligible English issues across the catalogue will be queued. The current filters do not limit this action. Start Run workflow on GitHub to process this queue.`,
      confirmLabel: kind === 'retry' ? 'Queue retries' : 'Queue indexing',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: kind,
          ids: kind === 'selected' ? chosen : undefined,
          rebuild: kind === 'selected',
        }),
      });
      const result = await res.json();
      if (!res.ok) throw Error(result.error || 'Could not queue indexing.');
      toast.success(
        `${result.queued.length} queued${result.skipped.length ? ` · ${result.skipped.length} skipped` : ''}`,
      );
      if (result.skipped.length)
        toast.info(
          result.skipped
            .map((s: { reason: string }) => s.reason)
            .filter((s: string, i: number, a: string[]) => a.indexOf(s) === i)
            .join('; '),
        );
      setSelected((s) => new Set([...s].filter((id) => !result.queued.includes(id))));
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not queue indexing.');
    } finally {
      setBusy(false);
    }
  }
  const active = (data.counts.queued || 0) + (data.counts.processing || 0);
  const attention = ['missing', 'failed', 'review', 'unverified', 'unavailable'].reduce(
    (n, s) => n + (data.counts[s] || 0),
    0,
  );
  const tiles = [
    ['all', 'Eligible English issues', data.eligible],
    ['missing', 'Need indexing', data.counts.missing || 0],
    ['active', 'Queued / Processing', active],
    ['failed', 'Failed', data.counts.failed || 0],
    ['review', 'Need page review', data.counts.review || 0],
  ] as const;
  const canSelect = (i: CoverageIssue) =>
    !['excluded', 'unavailable', 'queued', 'processing'].includes(i.status);
  const selectable = data.issues.filter(canSelect);
  const allSelected = selectable.length > 0 && selectable.every((i) => selected.has(i.id));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Search Indexing</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            See what is searchable, find missing editions, and follow every indexing run.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={action}
            disabled={busy || !data.counts.failed}
            onClick={() => void queue('retry')}
          >
            Retry failed
          </button>
          <button
            className={primary}
            disabled={busy || !data.counts.missing}
            onClick={() => void queue('missing')}
          >
            Index missing issues ({data.counts.missing || 0})
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="min-w-0">
          <p className="text-gray-900">
            Manual indexing — runs only when started
            {data.workerOnline && <span className="ml-2 text-green-800">Worker connected</span>}
          </p>
          {data.schedule && (
            <p className="mt-1 text-gray-600">
              Last manual check {dates(new Date(data.schedule.lastCheckedAt).toISOString())} IST.
              {['failure', 'cancelled'].includes(data.schedule.lastResult) &&
                ' The last run did not finish successfully.'}{' '}
            </p>
          )}
          <p className="mt-1 text-gray-600">
            <a
              className="text-flame-700 underline underline-offset-2"
              href="https://github.com/MugdhanilK/aim-archive/actions/workflows/search-indexing.yml"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open GitHub to run indexing
            </a>{' '}
            Choose Run workflow on main after uploading or queuing issues.
          </p>
        </div>
        <button className={action} disabled={loading} onClick={refresh}>
          <RefreshCw className="mr-2 inline h-4 w-4" />
          Refresh
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error} Previously loaded data may be out of date.
        </p>
      )}
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-gray-200 bg-white sm:grid-cols-3 xl:grid-cols-5">
        {tiles.map(([status, label, count]) => (
          <button
            key={status}
            onClick={() => filter('status', status === 'all' ? 'eligible' : status)}
            className={`min-h-24 border-b border-gray-200 px-4 py-4 text-left transition-colors hover:bg-flame-50 focus-visible:outline-2 focus-visible:outline-flame-600 ${filters.status === status || (status === 'all' && filters.status === 'eligible') ? 'bg-flame-50' : ''}`}
          >
            <span className="block text-sm text-gray-600">{label}</span>
            <span className="mt-1 block text-2xl font-semibold tabular-nums text-gray-900">
              {count}
            </span>
          </button>
        ))}
      </div>
      <details className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
        <summary className="cursor-pointer font-medium text-gray-900">How indexing works</summary>
        <div className="mt-3 max-w-3xl space-y-2 leading-relaxed">
          <p>
            English uploads and PDF replacements queue automatically. Start Run workflow on GitHub
            to process the queue. Imports may need to be queued here first. Metadata edits do not rebuild the PDF text.
          </p>
          <p>
            Queued → Downloading PDF → Extracting text / OCR → Saving index → Complete. Completed
            pages are saved. Each run handles up to three issues and stops starting new issues after
            20 minutes. If work remains, start another run. Failed work gets up to three attempts across runs before a manual retry is needed.
          </p>
          <p>
            Blank pages and uncertain pages are tracked separately. Uncertain pages stay out of
            search. An existing index without enough evidence is marked “verification needed”.
            Public search may take a cache refresh to show a completed change.
          </p>
          <p>
            Hindi and other languages remain outside the current indexing scope. Earlier verified
            rebuilds appear in coverage and history, clearly labelled as reconciled records.
          </p>
        </div>
      </details>
      <div
        className="flex gap-5 border-b border-gray-200"
        role="tablist"
        aria-label="Indexing views"
      >
        {(['coverage', 'history'] as const).map((view) => (
          <button
            key={view}
            role="tab"
            aria-selected={tab === view}
            tabIndex={tab === view ? 0 : -1}
            onKeyDown={(event) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 'coverage'
                    : event.key === 'End'
                      ? 'history'
                      : view === 'coverage'
                        ? 'history'
                        : 'coverage';
                setTab(next);
                const tabs =
                  event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                    '[role=tab]',
                  );
                tabs?.[next === 'coverage' ? 0 : 1]?.focus();
              }
            }}
            onClick={() => setTab(view)}
            className={`min-h-11 border-b-2 px-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-flame-600 ${tab === view ? 'border-flame-600 text-flame-700' : 'border-transparent text-gray-600'}`}
          >
            {view === 'coverage' ? 'Catalogue coverage' : 'Activity / History'}
          </button>
        ))}
      </div>
      {tab === 'coverage' ? (
        <>
          <div className="flex flex-wrap gap-3">
            <label className="relative min-w-52 flex-1">
              <span className="sr-only">Search issue titles</span>
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <input
                className={control + ' w-full pl-10 placeholder:text-gray-500'}
                placeholder="Search issue title or theme…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label>
              <span className="sr-only">Indexing status</span>
              <select
                aria-label="Indexing status"
                className={control}
                value={filters.status}
                onChange={(e) => filter('status', e.target.value)}
              >
                <option value="attention">Needs attention ({attention})</option>
                <option value="all">All issues</option>
                <option value="eligible">Eligible English issues</option>
                <option value="active">Queued / Processing</option>
                {Object.entries(labels).map(([s, l]) => (
                  <option key={s} value={s}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Magazine</span>
              <select
                aria-label="Magazine"
                className={control}
                value={filters.magazine || 'all'}
                onChange={(e) => filter('magazine', e.target.value)}
              >
                <option value="all">All magazines</option>
                {data.magazines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Year</span>
              <select
                aria-label="Year"
                className={control}
                value={filters.year || 'all'}
                onChange={(e) => filter('year', e.target.value)}
              >
                <option value="all">All years</option>
                {data.years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Publication status</span>
              <select
                aria-label="Publication status"
                className={control}
                value={filters.publication || 'all'}
                onChange={(e) => filter('publication', e.target.value)}
              >
                <option value="all">Published + drafts</option>
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
            <span aria-live="polite">
              {loading ? 'Updating…' : `${data.total} matching issues`}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span>{selected.size} selected</span>
              <button
                className={action}
                disabled={!selected.size || busy}
                onClick={() => void queue('selected')}
              >
                {busy ? 'Queuing…' : 'Index selected'}
              </button>
              {selected.size > 0 && (
                <button className={action} onClick={() => setSelected(new Set())}>
                  Clear selection
                </button>
              )}
            </div>
          </div>
          <div
            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
            aria-busy={loading}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-4">
                      <input
                        type="checkbox"
                        aria-label="Select eligible issues on this page"
                        checked={allSelected}
                        disabled={!selectable.length}
                        onChange={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            for (const i of selectable)
                              if (allSelected) next.delete(i.id);
                              else if (next.size < 100) next.add(i.id);
                            return next;
                          })
                        }
                      />
                    </th>
                    <th className="py-3 pr-4 font-medium">Issue</th>
                    <th className="py-3 pr-4 font-medium">Status & coverage</th>
                    <th className="hidden py-3 pr-4 font-medium lg:table-cell">Last indexed</th>
                    <th className="hidden py-3 pr-4 font-medium sm:table-cell">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.issues.map((issue) => (
                    <tr key={issue.id}>
                      <td className="p-4 align-top">
                        <input
                          aria-label={`Select ${issue.title}`}
                          type="checkbox"
                          disabled={
                            !canSelect(issue) || (selected.size >= 100 && !selected.has(issue.id))
                          }
                          checked={selected.has(issue.id)}
                          onChange={() =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(issue.id)) next.delete(issue.id);
                              else if (next.size < 100) next.add(issue.id);
                              return next;
                            })
                          }
                        />
                      </td>
                      <td className="min-w-32 py-4 pr-4 align-top sm:min-w-40">
                        <div className="flex gap-3">
                          {issue.cover_image_url ? (
                            <Image
                              src={issue.cover_image_url}
                              alt=""
                              width={40}
                              height={56}
                              className="hidden h-14 w-10 rounded object-cover sm:block"
                            />
                          ) : (
                            <BookOpen className="hidden h-10 w-10 text-gray-400 sm:block" />
                          )}
                          <div>
                            <button
                              className="text-left font-semibold text-gray-900 underline decoration-gray-300 underline-offset-4 hover:text-flame-700"
                              onClick={() => setDetail(issue.id)}
                            >
                              {title(issue)}
                            </button>
                            <p className="mt-1 text-xs text-gray-600">{issue.title}</p>
                            {!issue.is_published && (
                              <span className="mt-1 inline-block text-xs text-gray-600">Draft</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="min-w-28 py-4 pr-4 align-top sm:min-w-40">
                        <Status status={issue.status} />
                        <p className="mt-2 text-xs tabular-nums text-gray-600">
                          {issue.indexed_pages} / {issue.total_pages ?? 'unknown'} pages searchable
                        </p>
                        {issue.status === 'processing' && (
                          <p className="mt-1 text-xs text-gray-700">
                            {issue.completed_pages} pages processed
                          </p>
                        )}
                        {issue.verified && (
                          <p className="mt-1 text-xs text-gray-600">
                            {issue.blank_pages.length} blank · {issue.review_pages.length} withheld
                          </p>
                        )}
                      </td>
                      <td className="hidden py-4 pr-4 align-top text-xs text-gray-600 lg:table-cell">
                        {dates(issue.indexed_at)}
                      </td>
                      <td className="hidden py-4 pr-4 align-top sm:table-cell">
                        <button className={action} onClick={() => setDetail(issue.id)}>
                          {issue.status === 'review' ? 'Review pages' : 'View details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.issues.length && (
              <div className="px-6 py-12 text-center">
                <p className="font-medium text-gray-900">
                  {filters.status === 'attention'
                    ? 'No issues need attention'
                    : 'No matching issues'}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  {active
                    ? 'Active jobs are still running. Open Queued / Processing to follow them.'
                    : 'Choose All issues to see the full catalogue, or adjust your filters.'}
                </p>
              </div>
            )}
            <Pager
              page={data.page}
              total={data.total}
              pageSize={data.pageSize}
              onPage={(page) => setFilters((f) => ({ ...f, page }))}
            />
          </div>
        </>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <p className="border-b border-gray-200 p-4 text-sm text-gray-600">
            Each upload, replacement, or manual rebuild has its own record. Automatic attempts stay
            within that run.
          </p>
          <ul className="divide-y divide-gray-200">
            {history.runs.map((run) => (
              <li key={run.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div>
                  <button
                    onClick={() => setDetail(run.issue_id)}
                    className="text-left text-sm font-semibold text-gray-900 underline decoration-gray-300 underline-offset-4"
                  >
                    {title(run)}
                  </button>
                  <p className="mt-1 text-xs text-gray-600">{run.title}</p>
                  <p className="mt-2 text-xs text-gray-600">
                    {run.trigger.replaceAll('_', ' ')} · {dates(run.created_at)} ·{' '}
                    {run.trigger === 'verified_rebuild'
                      ? 'Attempts not recorded'
                      : `${run.attempts} attempt(s)`}
                  </p>
                </div>
                <div className="text-sm">
                  <Status status={run.status} />
                  <p className="mt-2 text-xs text-gray-600">
                    {run.indexed_pages} pages indexed · {run.review_pages} withheld
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {!history.runs.length && (
            <p className="p-8 text-center text-sm text-gray-600">No indexing runs recorded yet.</p>
          )}
          <Pager page={history.page} total={history.total} pageSize={25} onPage={setHistoryPage} />
        </div>
      )}
      {detail && (
        <IssueDetails
          id={detail}
          revision={revision}
          onClose={() => setDetail(null)}
          busy={busy}
          onQueue={(id) => {
            setDetail(null);
            void queue('selected', [id]);
          }}
        />
      )}
    </div>
  );
}

function IssueDetails({
  id,
  revision,
  onClose,
  onQueue,
  busy,
}: {
  id: string;
  revision: number;
  onClose: () => void;
  onQueue: (id: string) => void;
  busy: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<{ issue: CoverageIssue; runs: IndexingRun[] } | null>(null);
  const [error, setError] = useState('');
  const close = useCallback(onClose, [onClose]);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const res = await fetch(endpoint + '?issue=' + encodeURIComponent(id), {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok) throw Error('Could not load this issue. Close and reopen details to retry.');
        const value = await res.json();
        if (!controller.signal.aborted) {
          setData(value);
          setError('');
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Could not load details.');
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(load, 5000);
      }
    };
    setData(null);
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, revision]);
  const i = data?.issue;
  const current = data?.runs[0];
  return (
    <dialog
      ref={dialog}
      onCancel={close}
      aria-labelledby="indexing-detail-title"
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-xl border-l border-gray-200 bg-white p-0 shadow-xl backdrop:bg-black/30"
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <h2 id="indexing-detail-title" className="text-lg font-semibold text-gray-900">
          Indexing details
        </h2>
        <button autoFocus className={action} aria-label="Close indexing details" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-6 p-5">
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {!i && !error && <p role="status">Loading issue…</p>}
        {i && (
          <>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title(i)}</h3>
              <p className="mt-1 text-sm text-gray-600">{i.title}</p>
              <div className="mt-3">
                <Status status={i.status} />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-gray-600">Searchable pages</dt>
              <dd>
                {i.indexed_pages} / {i.total_pages ?? 'unknown'}
              </dd>
              <dt className="text-gray-600">Blank pages</dt>
              <dd>{i.verified ? i.blank_pages.length : 'Not verified'}</dd>
              <dt className="text-gray-600">Withheld pages</dt>
              <dd>{i.verified ? i.review_pages.length : 'Not verified'}</dd>
              <dt className="text-gray-600">Last indexed</dt>
              <dd>{dates(i.indexed_at)}</dd>
              <dt className="text-gray-600">Evidence</dt>
              <dd>
                {i.verified
                  ? i.evidence === 'verified_rebuild'
                    ? 'Reconciled rebuild records'
                    : 'Completed worker run'
                  : 'Verification needed'}
              </dd>
            </dl>
            {['queued', 'processing', 'failed'].includes(i.status) && (
              <div className="space-y-2 border-y border-gray-200 py-4 text-sm">
                <p className="font-medium text-gray-900">
                  {i.status === 'processing'
                    ? {
                        downloading: 'Downloading PDF',
                        extracting: 'Extracting text / OCR',
                        saving: 'Saving index',
                      }[i.stage || 'extracting']
                    : labels[i.status]}
                </p>
                <p className="text-gray-600">
                  {i.completed_pages} / {i.total_pages ?? 'unknown'} pages processed · Attempt{' '}
                  {i.attempts} of 3
                </p>
                {i.total_pages != null && (
                  <progress
                    aria-label="Pages processed"
                    className="h-2 w-full accent-flame-600"
                    value={i.completed_pages}
                    max={i.total_pages}
                  />
                )}
                <p className="text-gray-600">
                  {i.indexed_pages
                    ? 'Existing searchable pages remain available while this run is processed.'
                    : 'This issue has no searchable page text yet.'}
                </p>
                {i.status === 'queued' && i.attempts > 0 && (
                  <p>
                    Automatic retry after{' '}
                    {new Date(i.available_at).toLocaleTimeString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                    })}{' '}
                    IST.
                  </p>
                )}
                {i.error && <p className="break-words text-red-700">{i.error}</p>}
              </div>
            )}
            {i.status === 'unverified' && (
              <p className="text-sm leading-relaxed text-amber-900">
                Search text exists, but its source or processing evidence could not be fully
                verified. Rebuild the index to establish current coverage.
              </p>
            )}
            {i.status === 'unavailable' && (
              <p className="text-sm text-amber-900">
                Upload an available PDF from the Issues page before indexing.
              </p>
            )}
            {i.status === 'excluded' && (
              <p className="text-sm text-gray-600">
                Only English editions are indexed in the current scope. Existing content is
                preserved.
              </p>
            )}
            {i.review_pages.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900">Review withheld pages</h3>
                <p className="mt-1 text-sm text-gray-600">
                  These pages were uncertain and stay out of search. Check the PDF source before
                  rebuilding.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {i.review_pages.map((n) => (
                    <Link
                      key={n}
                      href={`/admin/indexing/${id}/preview?page=${n}`}
                      target="_blank"
                      rel="noopener"
                      className={action}
                    >
                      Page {n}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {!['excluded', 'unavailable', 'queued', 'processing'].includes(i.status) && (
                <button className={primary} disabled={busy} onClick={() => onQueue(id)}>
                  {i.status === 'missing'
                    ? 'Index issue'
                    : i.status === 'failed'
                      ? 'Retry indexing'
                      : 'Rebuild index'}
                </button>
              )}
              <Link href="/admin/issues" className={action}>
                Manage issue
              </Link>
              {!['unavailable', 'excluded'].includes(i.status) && (
                <Link
                  href={`/admin/indexing/${id}/preview`}
                  target="_blank"
                  rel="noopener"
                  className={action}
                >
                  Open PDF
                </Link>
              )}
            </div>
            <div className="border-t border-gray-200 pt-5">
              <h3 className="font-semibold text-gray-900">Run history</h3>
              {!data?.runs.length && (
                <p className="mt-2 text-sm text-gray-600">
                  No processing history recorded for this issue.
                </p>
              )}
              <ol className="mt-3 divide-y divide-gray-200">
                {data?.runs.map((run) => (
                  <li key={run.id} className="space-y-2 py-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">{run.trigger.replaceAll('_', ' ')}</span>
                      <Status status={run.status} />
                    </div>
                    <p className="text-xs text-gray-600">
                      {run.trigger === 'verified_rebuild' ? 'Rebuild recorded' : 'Queued'}:{' '}
                      {dates(run.created_at)}
                      <br />
                      Started: {dates(run.started_at)}
                      <br />
                      Finished: {dates(run.finished_at)}
                    </p>
                    <p className="text-xs text-gray-600">
                      {run.trigger === 'verified_rebuild'
                        ? 'Attempts not recorded'
                        : `${run.attempts} attempt(s)`}{' '}
                      · {run.indexed_pages} pages indexed · {run.review_pages} withheld
                    </p>
                    {run.error && <p className="break-words text-xs text-red-700">{run.error}</p>}
                  </li>
                ))}
              </ol>
              {current && (
                <p className="mt-2 text-xs text-gray-600">
                  Up to 30 recent runs shown. Details update automatically.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
