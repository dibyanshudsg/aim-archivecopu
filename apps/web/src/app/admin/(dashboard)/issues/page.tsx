'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  Search,
  X,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Download,
  Copy,
  Image as ImageIcon,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { formatFileSize, formatMonthYear } from '@/lib/utils';
import { MONTH_NAMES } from '@aim-archive/shared';
import { TagsInput, type ManagedTopic } from '@/components/admin/tags-input';
import { useUI } from '@/components/ui/toast';

interface Issue {
  id: string;
  title: string;
  year: number;
  month: number;
  description: string | null;
  topics: string[];
  read_count: number;
  download_count: number;
  file_size_bytes: number;
  is_published: boolean;
  magazine_id: string;
  pdf_url: string;
  cover_image_url: string | null;
  updated_at: string | null;
  magazines: { name: string; language: string };
}

interface Magazine {
  id: string;
  name: string;
}

type SortField = 'title' | 'year' | 'read_count' | 'download_count' | 'file_size_bytes' | 'updated_at';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'published' | 'draft';

const PAGE_SIZE = 25;

export default function AdminIssuesPage() {
  const { toast, confirm } = useUI();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterMagazine, setFilterMagazine] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterTopic, setFilterTopic] = useState('all');

  // Sort
  const [sortField, setSortField] = useState<SortField>('year');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination
  const [page, setPage] = useState(1);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    topics: [] as string[],
    year: 0,
    month: 1,
  });

  // Replace-cover modal state
  const [coverModalIssue, setCoverModalIssue] = useState<Issue | null>(null);

  // Master topic list with usage counts
  const allTopics = useMemo<ManagedTopic[]>(() => {
    const counts = new Map<string, number>();
    for (const i of issues) for (const t of i.topics) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [issues]);

  async function loadData() {
    const [issuesRes, magsRes] = await Promise.all([
      fetch('/api/admin/issues'),
      fetch('/api/admin/magazines'),
    ]);
    if (issuesRes.ok) setIssues(await issuesRes.json());
    if (magsRes.ok) setMagazines(await magsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const years = useMemo(
    () => [...new Set(issues.map((i) => i.year))].sort((a, b) => b - a),
    [issues],
  );

  const filteredIssues = useMemo(() => {
    let result = issues;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.topics.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (filterMagazine !== 'all') {
      result = result.filter((i) => i.magazine_id === filterMagazine);
    }
    if (filterYear !== 'all') {
      result = result.filter((i) => i.year === Number(filterYear));
    }
    if (filterStatus !== 'all') {
      result = result.filter((i) => (filterStatus === 'published' ? i.is_published : !i.is_published));
    }
    if (filterTopic !== 'all') {
      result = result.filter((i) => i.topics.includes(filterTopic));
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortField === 'year') cmp = a.year * 100 + a.month - (b.year * 100 + b.month);
      else if (sortField === 'read_count') cmp = a.read_count - b.read_count;
      else if (sortField === 'download_count') cmp = a.download_count - b.download_count;
      else if (sortField === 'file_size_bytes') cmp = a.file_size_bytes - b.file_size_bytes;
      else if (sortField === 'updated_at') {
        const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        cmp = ta - tb;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [issues, search, filterMagazine, filterYear, filterStatus, filterTopic, sortField, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageIssues = filteredIssues.slice(pageStart, pageStart + PAGE_SIZE);

  // Reset page when filters reduce result count below current page
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterMagazine, filterYear, filterStatus, filterTopic]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function startEdit(issue: Issue) {
    setEditingId(issue.id);
    setEditForm({
      title: issue.title,
      description: issue.description || '',
      topics: [...issue.topics],
      year: issue.year,
      month: issue.month,
    });
  }

  async function saveEdit(issue: Issue) {
    const res = await fetch(`/api/admin/issues/${issue.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...issue,
        title: editForm.title,
        description: editForm.description,
        topics: editForm.topics,
        year: editForm.year,
        month: editForm.month,
      }),
    });
    if (res.ok) {
      toast.success('Issue updated');
      setEditingId(null);
      loadData();
    } else {
      toast.error('Failed to update issue');
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
      toast.success('Issue deleted');
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
      toast.success(issue.is_published ? 'Unpublished' : 'Published');
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

  function exportCsv() {
    const rows = filteredIssues.map((i) => ({
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
    const okCount = results.filter((r) => r.status === 'fulfilled' && (r.value as Response).ok).length;
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
            disabled={filteredIssues.length === 0}
            className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 sm:flex"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </button>
          <Link
            href="/admin/issues/bulk"
            className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:flex"
          >
            <Upload className="h-4 w-4" />
            Bulk Upload
          </Link>
          <Link
            href="/admin/issues/new"
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gold-600"
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search issues..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pr-9 pl-10 text-sm focus:border-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-200"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={filterMagazine}
          onChange={(e) => setFilterMagazine(e.target.value)}
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
          onChange={(e) => setFilterYear(e.target.value)}
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
          onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <select
          value={filterTopic}
          onChange={(e) => setFilterTopic(e.target.value)}
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
          {filteredIssues.length} of {issues.length} issues
        </span>
      </div>

      {/* Bulk actions toolbar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gold-200 bg-gold-50/40 px-4 py-2.5">
          <span className="text-sm font-medium text-gold-800">
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
      ) : filteredIssues.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <p className="text-gray-400">{issues.length === 0 ? 'No issues yet' : 'No issues match your filters'}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
            <table className="w-full text-left text-sm">
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
                      className="h-4 w-4 cursor-pointer accent-gold-500"
                      aria-label="Select all on page"
                    />
                  </th>
                  <SortHeader label="Title" field="title" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <th className="hidden px-5 py-3 font-medium text-gray-500 sm:table-cell">Magazine</th>
                  <th className="hidden px-5 py-3 font-medium text-gray-500 md:table-cell">Topics</th>
                  <SortHeader label="Date" field="year" current={sortField} dir={sortDir} onSort={toggleSort} className="hidden lg:table-cell" />
                  <SortHeader label="Reads" field="read_count" current={sortField} dir={sortDir} onSort={toggleSort} className="hidden lg:table-cell" />
                  <SortHeader label="Downloads" field="download_count" current={sortField} dir={sortDir} onSort={toggleSort} className="hidden xl:table-cell" />
                  <SortHeader label="Size" field="file_size_bytes" current={sortField} dir={sortDir} onSort={toggleSort} className="hidden xl:table-cell" />
                  <SortHeader label="Modified" field="updated_at" current={sortField} dir={sortDir} onSort={toggleSort} className="hidden xl:table-cell" />
                  <th className="px-5 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pageIssues.map((issue) => (
                  <tr key={issue.id} className="transition-colors hover:bg-gray-50/50">
                    {editingId === issue.id ? (
                      <>
                        <td className="px-3 py-3" />
                        <td className="px-5 py-3" colSpan={3}>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editForm.title}
                              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gold-300 focus:outline-none"
                            />
                            <TagsInput
                              value={editForm.topics}
                              onChange={(topics) => setEditForm({ ...editForm, topics })}
                              allTopics={allTopics}
                              onTopicsRefetch={loadData}
                              placeholder="Click to manage topics"
                            />
                            <input
                              type="text"
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              placeholder="Description"
                              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gold-300 focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <select
                                value={editForm.month}
                                onChange={(e) => setEditForm({ ...editForm, month: Number(e.target.value) })}
                                className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                              >
                                {Object.entries(MONTH_NAMES).map(([n, name]) => (
                                  <option key={n} value={n}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                value={editForm.year}
                                onChange={(e) => setEditForm({ ...editForm, year: Number(e.target.value) })}
                                className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                              />
                            </div>
                          </div>
                        </td>
                        <td className="hidden lg:table-cell" />
                        <td className="hidden lg:table-cell" />
                        <td className="hidden xl:table-cell" />
                        <td className="hidden xl:table-cell" />
                        <td className="hidden xl:table-cell" />
                        <td className="px-5 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveEdit(issue)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-green-600 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            checked={selected.has(issue.id)}
                            onChange={() => toggleSelectOne(issue.id)}
                            className="h-4 w-4 cursor-pointer accent-gold-500"
                            aria-label={`Select ${issue.title}`}
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {!issue.is_published && (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                                DRAFT
                              </span>
                            )}
                            <span className="font-medium text-gray-900">{issue.title}</span>
                          </div>
                        </td>
                        <td className="hidden px-5 py-4 text-gray-500 sm:table-cell">{issue.magazines?.name}</td>
                        <td className="hidden px-5 py-4 md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {issue.topics.slice(0, 2).map((t) => (
                              <span key={t} className="rounded-full bg-gold-50 px-2 py-0.5 text-[11px] text-gold-700">
                                {t}
                              </span>
                            ))}
                            {issue.topics.length > 2 && (
                              <span className="text-[11px] text-gray-400">+{issue.topics.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="hidden px-5 py-4 text-gray-500 lg:table-cell">
                          {formatMonthYear(issue.month, issue.year)}
                        </td>
                        <td className="hidden px-5 py-4 text-gray-500 lg:table-cell">{issue.read_count}</td>
                        <td className="hidden px-5 py-4 text-gray-500 xl:table-cell">{issue.download_count}</td>
                        <td className="hidden px-5 py-4 text-gray-500 xl:table-cell">
                          {formatFileSize(issue.file_size_bytes)}
                        </td>
                        <td className="hidden px-5 py-4 text-gray-500 xl:table-cell">
                          {issue.updated_at ? formatRelative(issue.updated_at) : '—'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-0.5">
                            <Link
                              href={`/issue/${issue.id}`}
                              target="_blank"
                              rel="noopener"
                              title="View public page"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                            <a
                              href={issue.pdf_url}
                              download
                              title="Download PDF"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => setCoverModalIssue(issue)}
                              title="Replace cover image"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => duplicate(issue)}
                              title="Duplicate metadata for new upload"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => startEdit(issue)}
                              title="Edit"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gold-50 hover:text-gold-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => togglePublish(issue)}
                              title={issue.is_published ? 'Unpublish' : 'Publish'}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                              {issue.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleDelete(issue)}
                              title="Delete"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium text-gray-700">{pageStart + 1}</span>–
                <span className="font-medium text-gray-700">{Math.min(pageStart + PAGE_SIZE, filteredIssues.length)}</span>{' '}
                of <span className="font-medium text-gray-700">{filteredIssues.length}</span>
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
          className={`h-3.5 w-3.5 transition-transform ${active ? 'text-gold-600' : 'text-gray-300'} ${active && dir === 'asc' ? 'rotate-180' : ''}`}
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
  const [submitting, setSubmitting] = useState(false);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    const img = new window.Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  }

  const isSpread = dims ? dims.w / dims.h > 1.1 : false;

  async function submit() {
    if (!file) return;
    setSubmitting(true);
    const fd = new FormData();
    fd.append('cover', file);
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
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-8 transition-colors hover:border-gold-300 hover:bg-gray-50"
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
                    className={`pointer-events-none absolute inset-y-0 ring-2 ring-inset ring-gold-400 ${
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
                      orientation === 'front-left' ? 'bg-gold-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Left
                  </button>
                  <button
                    onClick={() => setOrientation('front-right')}
                    className={`px-3 py-1.5 transition-colors ${
                      orientation === 'front-right' ? 'bg-gold-500 text-white' : 'text-gray-600 hover:bg-gray-50'
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

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!file || submitting}
            className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gold-600 disabled:opacity-50"
          >
            {submitting ? 'Uploading...' : 'Replace cover'}
          </button>
        </div>
      </div>
    </div>
  );
}
