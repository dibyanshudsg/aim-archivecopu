'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Eye, EyeOff, Pencil, Search, X, Check, ChevronDown } from 'lucide-react';
import { formatFileSize, formatMonthYear } from '@/lib/utils';
import { MONTH_NAMES } from '@aim-archive/shared';
import { TagsInput, type ManagedTopic } from '@/components/admin/tags-input';

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
  magazines: { name: string; language: string };
}

interface Magazine {
  id: string;
  name: string;
}

type SortField = 'title' | 'year' | 'read_count' | 'file_size_bytes';
type SortDir = 'asc' | 'desc';

export default function AdminIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterMagazine, setFilterMagazine] = useState('all');
  const [filterYear, setFilterYear] = useState('all');

  // Sort
  const [sortField, setSortField] = useState<SortField>('year');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    topics: [] as string[],
    year: 0,
    month: 1,
  });

  // Master topics list with usage counts — drives the managed dropdown.
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

  useEffect(() => { loadData(); }, []);

  // Derived data
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

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortField === 'year') cmp = a.year * 100 + a.month - (b.year * 100 + b.month);
      else if (sortField === 'read_count') cmp = a.read_count - b.read_count;
      else if (sortField === 'file_size_bytes') cmp = a.file_size_bytes - b.file_size_bytes;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [issues, search, filterMagazine, filterYear, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
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
    await fetch(`/api/admin/issues/${issue.id}`, {
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
    setEditingId(null);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this issue? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/issues/${id}`, { method: 'DELETE' });
    if (res.ok) loadData();
  }

  async function togglePublish(issue: Issue) {
    await fetch(`/api/admin/issues/${issue.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...issue, is_published: !issue.is_published }),
    });
    loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-gray-900">Issues</h1>
        <Link
          href="/admin/issues/new"
          className="flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gold-600"
        >
          <Plus className="h-4 w-4" />
          Upload Issue
        </Link>
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
            <button onClick={() => setSearch('')} className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
        >
          <option value="all">All Years</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>

        <span className="ml-auto text-sm text-gray-400">
          {filteredIssues.length} of {issues.length} issues
        </span>
      </div>

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
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <SortHeader label="Title" field="title" current={sortField} dir={sortDir} onSort={toggleSort} />
                <th className="hidden px-5 py-3 font-medium text-gray-500 sm:table-cell">Magazine</th>
                <th className="hidden px-5 py-3 font-medium text-gray-500 md:table-cell">Topics</th>
                <SortHeader label="Date" field="year" current={sortField} dir={sortDir} onSort={toggleSort} className="hidden lg:table-cell" />
                <SortHeader label="Reads" field="read_count" current={sortField} dir={sortDir} onSort={toggleSort} className="hidden lg:table-cell" />
                <SortHeader label="Size" field="file_size_bytes" current={sortField} dir={sortDir} onSort={toggleSort} className="hidden lg:table-cell" />
                <th className="px-5 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredIssues.map((issue) => (
                <tr key={issue.id} className="transition-colors hover:bg-gray-50/50">
                  {editingId === issue.id ? (
                    /* Editing row */
                    <>
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
                                <option key={n} value={n}>{name}</option>
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
                      <td className="hidden lg:table-cell" />
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
                    /* Display row */
                    <>
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
                      <td className="hidden px-5 py-4 text-gray-500 sm:table-cell">
                        {issue.magazines?.name}
                      </td>
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
                      <td className="hidden px-5 py-4 text-gray-500 lg:table-cell">
                        {issue.read_count}
                      </td>
                      <td className="hidden px-5 py-4 text-gray-500 lg:table-cell">
                        {formatFileSize(issue.file_size_bytes)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1">
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
                            onClick={() => handleDelete(issue.id)}
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
