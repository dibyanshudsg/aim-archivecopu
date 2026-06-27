'use client';

import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Image as ImageIcon,
  FileSpreadsheet,
  Upload,
  Download,
  FileText,
  RotateCw,
  ExternalLink,
  FileUp,
} from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';
import { MONTH_NAMES } from '@aim-archive/shared';
import type { MonthIndex } from '@aim-archive/shared';
import { TagsInput, type ManagedTopic } from '@/components/admin/tags-input';
import { useUI } from '@/components/ui/toast';
import type { AdminIssue, AdminIssueListResult, AdminMagazine } from '@/lib/admin-data';
import { renderPdfFirstPageCoverFromUrl } from '@/lib/pdf-cover-client';

type Issue = AdminIssue;

type Magazine = Pick<AdminMagazine, 'id' | 'name'>;

type SortField = 'title' | 'year' | 'read_count' | 'download_count' | 'file_size_bytes' | 'updated_at';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'published' | 'draft';

const PAGE_SIZE = 25;

export function AdminIssuesClient({
  initialIssueResult,
  initialMagazines,
}: {
  initialIssueResult: AdminIssueListResult;
  initialMagazines: Magazine[];
}) {
  const { toast, confirm } = useUI();
  const router = useRouter();

  const [issues, setIssues] = useState<Issue[]>(initialIssueResult.data);
  const [totalIssues, setTotalIssues] = useState(initialIssueResult.total);
  const [totalPages, setTotalPages] = useState(initialIssueResult.totalPages);
  const [years, setYears] = useState<number[]>(initialIssueResult.facets.years);
  const [allTopics, setAllTopics] = useState<ManagedTopic[]>(initialIssueResult.facets.topics);
  const [magazines] = useState<Magazine[]>(initialMagazines);
  const [loading, setLoading] = useState(false);
  const didMountRef = useRef(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterMagazine, setFilterMagazine] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterTopic, setFilterTopic] = useState('all');

  // Sort
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination
  const [page, setPage] = useState(1);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Edit modal state
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);

  // Replace-cover modal state
  const [coverModalIssue, setCoverModalIssue] = useState<Issue | null>(null);

  const pageStart = (page - 1) * PAGE_SIZE;
  const pageIssues = issues;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      router.prefetch('/admin/issues/new');
      router.prefetch('/admin/issues/bulk');
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [router]);

  const loadData = useCallback(async (nextPage = page, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const issuesRes = await fetch(
        buildAdminIssuesUrl({
          page: nextPage,
          pageSize: PAGE_SIZE,
          q: search,
          magazine: filterMagazine,
          year: filterYear,
          status: filterStatus,
          topic: filterTopic,
          sort: sortField,
          dir: sortDir,
        }),
        { cache: 'no-store', signal },
      );
      if (!issuesRes.ok) throw new Error('Failed to load issues');
      const result = (await issuesRes.json()) as AdminIssueListResult;
      setIssues(result.data);
      setTotalIssues(result.total);
      setTotalPages(result.totalPages);
      setYears(result.facets.years);
      setAllTopics(result.facets.topics);
      if (result.page > result.totalPages) setPage(result.totalPages);
    } catch (error) {
      if (signal?.aborted) return;
      toast.error(error instanceof Error ? error.message : 'Failed to load issues');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filterMagazine, filterStatus, filterTopic, filterYear, page, search, sortDir, sortField, toast]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const controller = new AbortController();
    setSelected(new Set());
    loadData(page, controller.signal);
    return () => controller.abort();
  }, [loadData, page]);

  // Keep the open edit panel in sync with the latest issue data after refetches
  // (e.g. after a PDF replace, file_size_bytes / page_count update).
  useEffect(() => {
    setEditingIssue((prev) => {
      if (!prev) return prev;
      const fresh = issues.find((i) => i.id === prev.id);
      return fresh ?? prev;
    });
  }, [issues]);

  function toggleSort(field: SortField) {
    setPage(1);
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  async function handleDelete(issue: Issue) {
    const ok = await confirm({
      title: 'Delete issue?',
      message: `“${issue.title}” will be permanently removed, including its PDF and cover. This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/issues/${issue.id}`, { method: 'DELETE' });
    if (res.ok) {
      setIssues((prev) => prev.filter((i) => i.id !== issue.id));
      setSelected((s) => {
        const next = new Set(s);
        next.delete(issue.id);
        return next;
      });
      loadData();
    } else {
      toast.error('Failed to delete issue');
    }
  }

  async function togglePublish(issue: Issue) {
    const res = await fetch(`/api/admin/issues/${issue.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...issue, is_published: !issue.is_published }),
    });
    if (res.ok) {
      loadData();
    } else {
      toast.error('Failed to toggle publish');
    }
  }

  function duplicate(issue: Issue) {
    // Stash the metadata in sessionStorage; the upload form picks it up.
    sessionStorage.setItem(
      'aim-prefill-issue',
      JSON.stringify({
        magazine_id: issue.magazine_id,
        topics: issue.topics,
        description: issue.description ?? '',
      }),
    );
    toast.info('Metadata copied — pick a PDF to upload the duplicate');
    window.location.href = '/admin/issues/new';
  }

  async function exportCsv() {
    const res = await fetch(
      buildAdminIssuesUrl({
        page: 1,
        pageSize: 5000,
        q: search,
        magazine: filterMagazine,
        year: filterYear,
        status: filterStatus,
        topic: filterTopic,
        sort: sortField,
        dir: sortDir,
      }),
      { cache: 'no-store' },
    );
    if (!res.ok) {
      toast.error('Failed to export issues');
      return;
    }
    const result = (await res.json()) as AdminIssueListResult;
    const rows = result.data.map((i) => ({
      Title: i.title,
      Magazine: i.magazines?.name ?? '',
      Year: i.year,
      Month: MONTH_NAMES[i.month as keyof typeof MONTH_NAMES] ?? i.month,
      Topics: i.topics.join('; '),
      Reads: i.read_count,
      Downloads: i.download_count,
      'Size (bytes)': i.file_size_bytes,
      Status: i.is_published ? 'Published' : 'Draft',
      'Last modified': i.updated_at ?? '',
    }));
    const headers = Object.keys(rows[0] ?? {});
    const escape = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv =
      headers.join(',') +
      '\n' +
      rows.map((r) => headers.map((h) => escape((r as Record<string, unknown>)[h])).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aim-issues-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    toast.success(`Exported ${rows.length} issues`);
  }

  // ---------- Bulk actions ----------
  const allOnPageSelected = pageIssues.length > 0 && pageIssues.every((i) => selected.has(i.id));
  const someOnPageSelected = pageIssues.some((i) => selected.has(i.id));

  function toggleSelectAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) for (const i of pageIssues) next.delete(i.id);
      else for (const i of pageIssues) next.add(i.id);
      return next;
    });
  }

  function toggleSelectOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkSetPublished(targetState: boolean) {
    const ids = [...selected];
    if (ids.length === 0) return;
    const issuesById = new Map(issues.map((i) => [i.id, i]));
    const results = await Promise.allSettled(
      ids.map((id) => {
        const issue = issuesById.get(id);
        if (!issue) return Promise.reject();
        return fetch(`/api/admin/issues/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...issue, is_published: targetState }),
        });
      }),
    );
    const ok = results.filter((r) => r.status === 'fulfilled' && (r.value as Response).ok).length;
    toast[ok === ids.length ? 'success' : 'error'](
      `${ok} / ${ids.length} ${targetState ? 'published' : 'unpublished'}`,
    );
    setSelected(new Set());
    loadData();
  }

  async function bulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    const ok = await confirm({
      title: `Delete ${ids.length} issue${ids.length === 1 ? '' : 's'}?`,
      message:
        'All selected issues — including their PDFs and covers — will be permanently removed. This cannot be undone.',
      confirmLabel: `Delete ${ids.length}`,
      destructive: true,
    });
    if (!ok) return;
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/admin/issues/${id}`, { method: 'DELETE' })),
    );
    const deletedIds = new Set<string>();
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled' && (r.value as Response).ok) {
        deletedIds.add(ids[idx]);
      }
    });
    if (deletedIds.size > 0) {
      setIssues((prev) => prev.filter((i) => !deletedIds.has(i.id)));
    }
    const okCount = deletedIds.size;
    toast[okCount === ids.length ? 'success' : 'error'](`${okCount} / ${ids.length} deleted`);
    setSelected(new Set());
    loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-gray-900">Issues</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={totalIssues === 0}
            className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 sm:flex"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </button>
          <Link
            href="/admin/issues/bulk"
            onMouseEnter={() => router.prefetch('/admin/issues/bulk')}
            onFocus={() => router.prefetch('/admin/issues/bulk')}
            className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:flex"
          >
            <Upload className="h-4 w-4" />
            Bulk Upload
          </Link>
          <Link
            href="/admin/issues/new"
            onMouseEnter={() => router.prefetch('/admin/issues/new')}
            onFocus={() => router.prefetch('/admin/issues/new')}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600"
          >
            <Plus className="h-4 w-4" />
            Upload Issue
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search issues..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pr-9 pl-10 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={filterMagazine}
          onChange={(e) => {
            setFilterMagazine(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
        >
          <option value="all">All Magazines</option>
          {magazines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          value={filterYear}
          onChange={(e) => {
            setFilterYear(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
        >
          <option value="all">All Years</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as StatusFilter);
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <select
          value={filterTopic}
          onChange={(e) => {
            setFilterTopic(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
        >
          <option value="all">All Topics</option>
          {allTopics.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name} ({t.count})
            </option>
          ))}
        </select>

        <span className="ml-auto text-sm text-gray-400">
          {totalIssues} matching issue{totalIssues === 1 ? '' : 's'}
        </span>
      </div>

      {/* Bulk actions toolbar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-flame-200 bg-gradient-to-r from-gold-50/60 to-flame-50/60 px-4 py-2.5">
          <span className="text-sm font-medium text-flame-800">
            {selected.size} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => bulkSetPublished(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Eye className="h-3.5 w-3.5" /> Publish
            </button>
            <button
              onClick={() => bulkSetPublished(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <EyeOff className="h-3.5 w-3.5" /> Unpublish
            </button>
            <button
              onClick={bulkDelete}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-gray-500 hover:text-gray-700"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5">
              <div className="h-5 w-48 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : totalIssues === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <p className="text-gray-400">No issues match your filters</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected;
                      }}
                      onChange={toggleSelectAllOnPage}
                      className="h-4 w-4 cursor-pointer accent-flame-500"
                      aria-label="Select all on page"
                    />
                  </th>
                  <th className="w-12 px-2 py-3" aria-label="Cover" />
                  <SortHeader label="Magazine Title" field="title" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <th className="hidden px-4 py-3 font-medium text-gray-500 lg:table-cell">Theme Title</th>
                  <th className="hidden px-4 py-3 font-medium text-gray-500 2xl:table-cell">Magazine</th>
                  <th className="hidden px-4 py-3 font-medium text-gray-500 md:table-cell">Topic Tags</th>
                  <SortHeader label="Reads" field="read_count" current={sortField} dir={sortDir} onSort={toggleSort} className="hidden px-3 lg:table-cell" />
                  <SortHeader label="Downloads" field="download_count" current={sortField} dir={sortDir} onSort={toggleSort} className="hidden px-3 xl:table-cell" />
                  <SortHeader label="Size" field="file_size_bytes" current={sortField} dir={sortDir} onSort={toggleSort} className="hidden px-3 xl:table-cell" />
                  <SortHeader label="Modified" field="updated_at" current={sortField} dir={sortDir} onSort={toggleSort} className="hidden px-3 xl:table-cell" />
                </tr>
              </thead>
                {pageIssues.map((issue) => (
                  <tbody
                    key={issue.id}
                    className={cn(
                      'group origin-center transition-[transform,box-shadow,background-color] duration-200 ease-out last:border-b-0',
                      'border-b border-gray-100',
                      'hover:relative hover:z-10 hover:scale-[1.006] hover:bg-gray-50/40 hover:shadow-[0_14px_36px_rgba(190,140,46,0.14)]',
                      editingIssue?.id === issue.id &&
                        'relative z-10 shadow-[0_14px_36px_rgba(229,86,31,0.12)]',
                    )}
                  >
                  <tr
                    className={cn(
                      editingIssue?.id === issue.id &&
                        'bg-gradient-to-r from-gold-50/60 to-flame-50/60',
                    )}
                  >
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            checked={selected.has(issue.id)}
                            onChange={() => toggleSelectOne(issue.id)}
                            className="h-4 w-4 cursor-pointer accent-flame-500"
                            aria-label={`Select ${issue.title}`}
                          />
                        </td>
                        <td className="px-2 py-3">
                          <CoverThumbnail issue={issue} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-2">
                            {!issue.is_published && (
                              <span className="mt-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                                DRAFT
                              </span>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900">{issue.title}</div>
                              {issue.theme && (
                                <div className="font-heading mt-0.5 bg-gradient-to-r from-gold-700 to-flame-700 bg-clip-text pr-1 text-[12px] font-semibold text-transparent lg:hidden">
                                  {issue.theme}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-4 lg:table-cell">
                          {issue.theme ? (
                            <span className="font-heading bg-gradient-to-r from-gold-700 to-flame-700 bg-clip-text pr-1 text-sm font-semibold text-transparent">
                              {issue.theme}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="hidden px-4 py-4 text-gray-500 2xl:table-cell">{issue.magazines?.name}</td>
                        <td className="hidden px-4 py-4 md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {issue.topics.slice(0, 2).map((t) => (
                              <span key={t} className="rounded-full bg-gradient-to-r from-gold-50 to-flame-50 px-2 py-0.5 text-[11px] text-flame-700">
                                {t}
                              </span>
                            ))}
                            {issue.topics.length > 2 && (
                              <span className="text-[11px] text-gray-400">+{issue.topics.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="hidden px-3 py-4 text-gray-500 lg:table-cell">{issue.read_count}</td>
                        <td className="hidden px-3 py-4 text-gray-500 xl:table-cell">{issue.download_count}</td>
                        <td className="hidden px-3 py-4 text-gray-500 xl:table-cell">
                          {formatFileSize(issue.file_size_bytes)}
                        </td>
                        <td className="hidden px-3 py-4 text-gray-500 xl:table-cell">
                          {issue.updated_at ? formatRelative(issue.updated_at) : '—'}
                        </td>
                  </tr>
                  {/* Actions row — visually paired with the main row above */}
                  <tr
                    className={cn(
                      '![&]:border-t-0',
                      editingIssue?.id === issue.id
                        ? 'bg-gradient-to-r from-gold-50/50 to-flame-50/50'
                        : 'bg-gradient-to-b from-gray-50/30 to-gray-50/70',
                    )}
                    style={{ borderTopWidth: 0 }}
                  >
                    <td colSpan={10} className="px-3 pt-1 pb-2.5 sm:px-5">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {/* Secondary actions — grouped toolbar */}
                        <div className="inline-flex items-center gap-0.5 rounded-lg border border-gray-200/80 bg-white p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                          <button
                            onClick={() => setCoverModalIssue(issue)}
                            title="Replace cover image"
                            className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Cover</span>
                          </button>
                          <div className="h-4 w-px bg-gray-200" />
                          <button
                            onClick={() => duplicate(issue)}
                            title="Duplicate metadata for new upload"
                            className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Duplicate</span>
                          </button>
                          <div className="h-4 w-px bg-gray-200" />
                          <button
                            onClick={() => togglePublish(issue)}
                            title={issue.is_published ? 'Click to unpublish' : 'Click to publish'}
                            className={cn(
                              'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors',
                              issue.is_published
                                ? 'text-emerald-700 hover:bg-emerald-50'
                                : 'text-amber-700 hover:bg-amber-50',
                            )}
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                issue.is_published ? 'bg-emerald-500' : 'bg-amber-500',
                              )}
                            />
                            <span className="hidden sm:inline">
                              {issue.is_published ? 'Published' : 'Draft'}
                            </span>
                          </button>
                        </div>

                        {/* Primary action: Edit */}
                        <button
                          onClick={() => setEditingIssue(issue)}
                          title="Edit issue"
                          className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-gold-500 to-flame-500 px-3.5 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(190,140,46,0.25)] transition-all hover:from-gold-600 hover:to-flame-600 hover:shadow-[0_6px_18px_rgba(229,86,31,0.28)]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>

                        {/* Destructive action: Delete */}
                        <button
                          onClick={() => handleDelete(issue)}
                          title="Delete issue"
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <AnimatePresence initial={false}>
                    {editingIssue?.id === issue.id && (
                      <motion.tr
                        key={`edit-${issue.id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <td colSpan={10} className="p-0">
                          <motion.div
                            initial={{ height: 0, overflow: 'hidden' }}
                            animate={{
                              height: 'auto',
                              transitionEnd: { overflow: 'visible' },
                            }}
                            exit={{ height: 0, overflow: 'hidden' }}
                            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                            onClick={() => setEditingIssue(null)}
                            className="cursor-pointer border-y border-flame-200/60 bg-gradient-to-br from-gold-50/40 to-flame-50/40"
                          >
                            <EditRowForm
                              issue={issue}
                              magazines={magazines}
                              allTopics={allTopics}
                              onCancel={() => setEditingIssue(null)}
                              onSaved={() => {
                                setEditingIssue(null);
                                loadData();
                              }}
                              onTopicsRefetch={loadData}
                            />
                          </motion.div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                  </tbody>
                ))}
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium text-gray-700">{pageStart + 1}</span>–
                <span className="font-medium text-gray-700">{Math.min(pageStart + PAGE_SIZE, totalIssues)}</span>{' '}
                of <span className="font-medium text-gray-700">{totalIssues}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Replace cover modal */}
      {coverModalIssue && (
        <ReplaceCoverModal
          issue={coverModalIssue}
          onClose={() => setCoverModalIssue(null)}
          onDone={() => {
            setCoverModalIssue(null);
            loadData();
          }}
        />
      )}

    </div>
  );
}

function buildAdminIssuesUrl(input: {
  page: number;
  pageSize: number;
  q: string;
  magazine: string;
  year: string;
  status: StatusFilter;
  topic: string;
  sort: SortField;
  dir: SortDir;
}) {
  const params = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
    sort: input.sort,
    dir: input.dir,
  });
  if (input.q.trim()) params.set('q', input.q.trim());
  if (input.magazine !== 'all') params.set('magazine', input.magazine);
  if (input.year !== 'all') params.set('year', input.year);
  if (input.status !== 'all') params.set('status', input.status);
  if (input.topic !== 'all') params.set('topic', input.topic);
  return `/api/admin/issues?${params.toString()}`;
}

function SortHeader({
  label,
  field,
  current,
  dir,
  onSort,
  className = '',
}: {
  label: string;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const active = current === field;
  return (
    <th
      className={`cursor-pointer px-5 py-3 font-medium text-gray-500 transition-colors hover:text-gray-700 ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${active ? 'text-flame-600' : 'text-gray-300'} ${active && dir === 'asc' ? 'rotate-180' : ''}`}
        />
      </span>
    </th>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

// ---------- Replace-cover modal ----------
function ReplaceCoverModal({
  issue,
  onClose,
  onDone,
}: {
  issue: Issue;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useUI();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [orientation, setOrientation] = useState<'front-right' | 'front-left'>('front-right');
  const [coverSource, setCoverSource] = useState<'manual' | 'pdf-first-page'>('manual');
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    setCoverSource('manual');
    showPreview(f);
  }

  function showPreview(f: File) {
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    const img = new window.Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  }

  async function generateFromPdf() {
    setGenerating(true);
    try {
      const generated = await renderPdfFirstPageCoverFromUrl(issue.pdf_url, issue.title);
      if (!generated) throw new Error('Could not render PDF page 1');
      setCoverSource('pdf-first-page');
      showPreview(generated);
      toast.success('Cover generated from page 1');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate cover');
    } finally {
      setGenerating(false);
    }
  }

  const isSpread = dims ? dims.w / dims.h > 1.1 : false;

  async function submit() {
    if (!file) return;
    setSubmitting(true);
    const fd = new FormData();
    fd.append('cover', file);
    fd.append('cover_source', coverSource);
    fd.append('cover_orientation', orientation);
    const res = await fetch(`/api/admin/issues/${issue.id}/cover`, {
      method: 'POST',
      body: fd,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success('Cover replaced');
      onDone();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || 'Failed to replace cover');
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-gray-900">Replace cover</h2>
            <p className="text-xs text-gray-500">{issue.title}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!previewUrl ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-8 transition-colors hover:border-flame-300 hover:bg-flame-50/40"
          >
            <ImageIcon className="h-7 w-7 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-600">Click to select cover image</p>
            <p className="text-xs text-gray-400">JPG / PNG · combined front+back spread is fine</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-lg bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Cover preview" className="block w-full" />
              {isSpread && (
                <>
                  <div
                    className={`pointer-events-none absolute inset-y-0 bg-black/55 ${
                      orientation === 'front-right' ? 'left-0 right-1/2' : 'left-1/2 right-0'
                    }`}
                  />
                  <div
                    className={`pointer-events-none absolute inset-y-0 ring-2 ring-inset ring-flame-400 ${
                      orientation === 'front-right' ? 'left-1/2 right-0' : 'left-0 right-1/2'
                    }`}
                  />
                </>
              )}
            </div>
            {isSpread && (
              <div className="flex items-center justify-end gap-2 text-xs">
                <span className="text-gray-500">Front cover:</span>
                <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <button
                    onClick={() => setOrientation('front-left')}
                    className={`px-3 py-1.5 transition-colors ${
                      orientation === 'front-left' ? 'bg-gradient-to-r from-gold-500 to-flame-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Left
                  </button>
                  <button
                    onClick={() => setOrientation('front-right')}
                    className={`px-3 py-1.5 transition-colors ${
                      orientation === 'front-right' ? 'bg-gradient-to-r from-gold-500 to-flame-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Right
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={pick}
          className="hidden"
        />

        <button
          type="button"
          onClick={generateFromPdf}
          disabled={generating || submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-flame-200 bg-flame-50/50 px-4 py-2.5 text-sm font-semibold text-flame-700 transition-colors hover:bg-flame-50 disabled:cursor-wait disabled:opacity-60"
        >
          <ImageIcon className="h-4 w-4" />
          {generating ? 'Generating from PDF...' : 'Generate from PDF page 1'}
        </button>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!file || submitting || generating}
            className="rounded-lg bg-gradient-to-r from-gold-500 to-flame-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600 disabled:opacity-50"
          >
            {submitting ? 'Uploading...' : 'Replace cover'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Cover thumbnail with hover preview (portal-rendered to escape table overflow) ----------
const PREVIEW_W = 240;
const PREVIEW_H = 320;
const PREVIEW_GAP = 12;
const VIEWPORT_PAD = 12;

function CoverThumbnail({ issue }: { issue: Issue }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  function updatePosition() {
    if (!thumbRef.current) return;
    const rect = thumbRef.current.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    // Clamp vertically so the preview never goes off-viewport
    const minY = PREVIEW_H / 2 + VIEWPORT_PAD;
    const maxY = window.innerHeight - PREVIEW_H / 2 - VIEWPORT_PAD;
    const clampedY = Math.max(minY, Math.min(maxY, centerY));
    setPos({ x: rect.right + PREVIEW_GAP, y: clampedY });
  }

  function handleEnter() {
    if (!issue.cover_image_url) return;
    updatePosition();
    setShow(true);
  }

  function handleLeave() {
    setShow(false);
  }

  return (
    <>
      <div
        ref={thumbRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className="relative inline-block"
      >
        <div className="relative h-12 w-9 overflow-hidden rounded bg-gradient-to-br from-gold-100 to-flame-100 shadow-sm ring-1 ring-flame-200/40">
          <div className="absolute inset-y-0 left-0 z-10 w-[3px] bg-gradient-to-b from-gold-500 to-flame-500" />
          {issue.cover_image_url ? (
            <Image
              src={issue.cover_image_url}
              alt=""
              fill
              className="object-cover"
              sizes="36px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[8px] font-medium text-flame-700/60">
              no
              <br />
              cover
            </div>
          )}
        </div>
      </div>

      {mounted &&
        issue.cover_image_url &&
        createPortal(
          <AnimatePresence>
            {show && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="pointer-events-none fixed z-[1000]"
                style={{
                  left: pos.x,
                  top: pos.y - PREVIEW_H / 2,
                  width: PREVIEW_W,
                }}
              >
                <div
                  className="relative overflow-hidden rounded-xl border-2 border-flame-300 bg-white shadow-2xl"
                  style={{ height: PREVIEW_H }}
                >
                  <div className="absolute inset-y-0 left-0 z-10 w-1.5 bg-gradient-to-b from-gold-500 to-flame-500" />
                  <Image
                    src={issue.cover_image_url}
                    alt={issue.title}
                    fill
                    className="object-cover"
                    sizes="240px"
                  />
                </div>
                <div className="mt-1 truncate rounded-md bg-white/95 px-2 py-1 text-center text-[11px] font-medium text-gray-700 shadow-sm">
                  {issue.title}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

// ---------- Inline edit row form (slides in below the row) ----------
function EditRowForm({
  issue,
  magazines,
  allTopics,
  onCancel,
  onSaved,
  onTopicsRefetch,
}: {
  issue: Issue;
  magazines: Magazine[];
  allTopics: ManagedTopic[];
  onCancel: () => void;
  onSaved: () => void;
  onTopicsRefetch: () => void;
}) {
  const { toast } = useUI();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    magazine_id: issue.magazine_id,
    title: issue.title,
    theme: issue.theme || '',
    year: issue.year,
    month: issue.month,
    description: issue.description || '',
    topics: [...issue.topics],
  });

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // Auto-regenerate Magazine Title when magazine/month/year change.
  // Skip on initial mount so we don't clobber a customized stored title.
  const skipFirstAutoTitle = useRef(true);
  useEffect(() => {
    if (skipFirstAutoTitle.current) {
      skipFirstAutoTitle.current = false;
      return;
    }
    const mag = magazines.find((m) => m.id === form.magazine_id);
    if (!mag) return;
    const monthName = MONTH_NAMES[form.month as MonthIndex];
    setForm((f) => ({ ...f, title: `${mag.name} — ${monthName} ${f.year}` }));
  }, [form.magazine_id, form.month, form.year, magazines]);

  // Track whether the form has been modified vs the saved issue.
  const isDirty = useMemo(() => {
    if (form.magazine_id !== issue.magazine_id) return true;
    if (form.title !== issue.title) return true;
    if (form.theme !== (issue.theme || '')) return true;
    if (form.year !== issue.year) return true;
    if (form.month !== issue.month) return true;
    if (form.description !== (issue.description || '')) return true;
    const a = [...form.topics].sort();
    const b = [...issue.topics].sort();
    if (a.length !== b.length) return true;
    return a.some((t, i) => t !== b[i]);
  }, [form, issue]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch(`/api/admin/issues/${issue.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...issue,
        magazine_id: form.magazine_id,
        title: form.title,
        theme: form.theme.trim() || null,
        description: form.description,
        topics: form.topics,
        year: form.year,
        month: form.month,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      onSaved();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || 'Failed to update issue');
    }
  }

  return (
    <form
      onSubmit={submit}
      onClick={(e) => e.stopPropagation()}
      className="mx-auto my-5 max-w-5xl cursor-default rounded-2xl border-2 border-flame-300 bg-white px-6 py-6 shadow-[0_10px_30px_rgba(190,140,46,0.12)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-heading text-base font-bold text-gray-900">Edit Issue</h3>
          <p className="mt-0.5 truncate text-xs text-gray-500">{issue.title}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-flame-300 text-flame-500 transition-colors hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* Two-column body: PDF management (left) + metadata fields (right) */}
      <div className="mt-5 grid gap-6 lg:grid-cols-[300px_1fr]">
        <PdfManagementPanel issue={issue} onChanged={onTopicsRefetch} />

        <div className="space-y-5">
          {/* Magazine & Date */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Magazine</label>
              <select
                value={form.magazine_id}
                onChange={(e) => setForm({ ...form, magazine_id: e.target.value })}
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
              >
                {magazines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Month</label>
              <select
                value={form.month}
                onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
              >
                {Object.entries(MONTH_NAMES).map(([n, name]) => (
                  <option key={n} value={n}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Year</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
              />
            </div>
          </div>

          {/* Magazine Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Magazine Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
            />
          </div>

          {/* Theme Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Theme Title <span className="text-xs font-normal text-gray-400">(the overarching theme of this issue)</span>
            </label>
            <input
              type="text"
              value={form.theme}
              onChange={(e) => setForm({ ...form, theme: e.target.value })}
              placeholder="e.g. The Psychic Being, Surrender, On Education"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
            />
          </div>

          {/* Topic Tags */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Topic Tags</label>
            <TagsInput
              value={form.topics}
              onChange={(topics) => setForm({ ...form, topics })}
              allTopics={allTopics}
              onTopicsRefetch={onTopicsRefetch}
              placeholder="Click to manage topic tags"
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
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
            />
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !isDirty}
          title={!isDirty ? 'No changes to save' : undefined}
          className="rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {submitting ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

// ---------- PDF management side panel ----------
function PdfManagementPanel({ issue, onChanged }: { issue: Issue; onChanged: () => void }) {
  const { toast, confirm } = useUI();
  const fileRef = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [reindexStatus, setReindexStatus] = useState<string>('Re-running OCR…');
  const [reindexProgress, setReindexProgress] = useState<{ page: number; total: number } | null>(null);
  const [downloading, setDownloading] = useState(false);

  const filename = useMemo(() => {
    try {
      const decoded = decodeURIComponent(issue.pdf_url.split('?')[0]);
      const last = decoded.split('/').pop() || 'document.pdf';
      return last;
    } catch {
      return 'document.pdf';
    }
  }, [issue.pdf_url]);


  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(issue.pdf_url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Defer revoke so Firefox gets a chance to start the download
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(err instanceof Error ? `Download failed: ${err.message}` : 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  async function handleReplace(file: File) {
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error('PDF must be under 100MB');
      return;
    }
    const ok = await confirm({
      title: 'Replace PDF?',
      message: `The current PDF will be overwritten with “${file.name}”. The OCR index will be rebuilt automatically. This cannot be undone.`,
      confirmLabel: 'Replace',
      destructive: true,
    });
    if (!ok) return;

    setReplacing(true);
    const fd = new FormData();
    fd.append('pdf', file);
    const res = await fetch(`/api/admin/issues/${issue.id}/pdf`, {
      method: 'POST',
      body: fd,
    });
    setReplacing(false);
    if (res.ok) {
      const data = await res.json();
      toast.success(`PDF replaced · ${data.pages_indexed ?? 0} pages re-indexed`);
      onChanged();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || 'Failed to replace PDF');
    }
  }

  async function handleReindex() {
    const pages = issue.page_count ?? 0;
    const etaText = pages > 0 ? ` Estimated time: ~${pages * 4}s for ${pages} pages.` : '';
    const ok = await confirm({
      title: 'Re-run OCR?',
      message: `The full-text index for this issue will be rebuilt from the current PDF.${etaText} You'll see live page-by-page progress.`,
      confirmLabel: 'Reindex',
    });
    if (!ok) return;

    setReindexing(true);
    setReindexStatus('Starting…');
    setReindexProgress(null);

    let finished = false;
    let lastError: string | null = null;
    let finalPages = 0;

    try {
      const res = await fetch(`/api/admin/issues/${issue.id}/reindex`, { method: 'POST' });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let event: { type: string; [k: string]: unknown };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.type === 'status') {
            setReindexStatus(String(event.message ?? ''));
            setReindexProgress(null);
          } else if (event.type === 'progress') {
            setReindexStatus('OCR');
            setReindexProgress({
              page: Number(event.page),
              total: Number(event.total),
            });
          } else if (event.type === 'done') {
            finished = true;
            finalPages = Number(event.pagesIndexed ?? 0);
          } else if (event.type === 'error') {
            lastError = String(event.message ?? 'Reindex failed');
          }
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Reindex failed';
    }

    setReindexing(false);
    setReindexProgress(null);

    if (finished) {
      toast.success(`Reindexed · ${finalPages} pages`);
      onChanged();
    } else {
      toast.error(lastError || 'Reindex failed');
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-gold-200/70 bg-gradient-to-br from-gold-50/40 to-flame-50/30 p-5">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-flame-600" />
        <h4 className="font-heading text-sm font-bold tracking-wide text-gray-900 uppercase">PDF File</h4>
      </div>

      {/* File summary */}
      <div className="space-y-2.5 rounded-xl border border-gray-200/80 bg-white/70 p-3 text-xs">
        <div className="break-all font-medium text-gray-900" title={filename}>
          {filename}
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-gray-500">
          <dt>Size</dt>
          <dd className="text-right font-medium text-gray-700">{formatFileSize(issue.file_size_bytes)}</dd>
          <dt>Pages</dt>
          <dd className="text-right font-medium text-gray-700">{issue.page_count ?? '—'}</dd>
          <dt>Reads</dt>
          <dd className="text-right font-medium text-gray-700">{issue.read_count}</dd>
          <dt>Downloads</dt>
          <dd className="text-right font-medium text-gray-700">{issue.download_count}</dd>
        </dl>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <Link
          href={`/read/${issue.id}`}
          target="_blank"
          rel="noopener"
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in reader
        </Link>

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700 disabled:cursor-wait disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" />
          {downloading ? 'Downloading…' : 'Download PDF'}
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={replacing}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-3 py-2 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600 disabled:cursor-wait disabled:opacity-60"
        >
          <FileUp className="h-3.5 w-3.5" />
          {replacing ? 'Replacing…' : 'Replace PDF'}
        </button>

        <button
          type="button"
          onClick={handleReindex}
          disabled={reindexing}
          className="relative flex items-center justify-center gap-2 overflow-hidden rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:border-flame-300 hover:bg-flame-50 hover:text-flame-700 disabled:cursor-wait disabled:opacity-80"
        >
          {reindexing && reindexProgress && (
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold-200/60 to-flame-200/60 transition-[width] duration-200"
              style={{
                width: `${Math.min(100, (reindexProgress.page / Math.max(1, reindexProgress.total)) * 100)}%`,
              }}
            />
          )}
          <span className="relative flex items-center gap-2">
            <RotateCw className={cn('h-3.5 w-3.5', reindexing && 'animate-spin')} />
            {reindexing
              ? reindexProgress
                ? `OCR · ${reindexProgress.page} / ${reindexProgress.total} pages`
                : reindexStatus
              : 'Re-run OCR'}
          </span>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleReplace(f);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      <p className="mt-auto text-[10.5px] leading-relaxed text-gray-400">
        Replacing the PDF overwrites the existing file in storage and rebuilds the search index. The cover thumbnail is regenerated only if it was auto-generated from page&nbsp;1.
      </p>
    </div>
  );
}
