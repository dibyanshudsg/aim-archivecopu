'use client';

import { useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, Search } from 'lucide-react';

type Entry = { id: string; actorId: string | null; actorName: string; actorEmail: string | null; action: string; subjectId: string | null; detail: string | null; createdAt: string };
type Result = { items: Entry[]; total: number; page: number; pageSize: number };
const areas = ['all', 'pending', 'failed', 'auth', 'admin', 'role', 'password', 'magazine', 'issue', 'navigation', 'indexing', 'storage', 'settings', 'topic'] as const;
const actionLabels: Record<string, string> = {
  'auth.signed_in': 'Signed in', 'auth.signed_out': 'Signed out', 'auth.failed': 'Sign-in failed', 'auth.temporary_expired': 'Expired temporary password',
  'admin.created': 'Admin added', 'admin.updated': 'Admin access changed', 'role.created': 'Role created', 'role.updated': 'Role updated', 'role.deleted': 'Role deleted',
  'password.changed': 'Password changed', 'password.reset': 'Password reset', 'magazine.created': 'Magazine added', 'magazine.updated': 'Magazine updated', 'magazine.deleted': 'Magazine deleted',
  'issue.created': 'Issue added', 'issue.updated': 'Issue updated', 'issue.deleted': 'Issue deleted', 'issue.cover_updated': 'Cover updated', 'issue.cover_generated': 'Cover generated', 'issue.pdf_replaced': 'PDF replaced',
  'navigation.created': 'Link added', 'navigation.updated': 'Link updated', 'navigation.deleted': 'Link deleted', 'navigation.reordered': 'Links reordered', 'navigation.reset': 'Menu reset',
  'indexing.queued': 'Indexing queued', 'indexing.started': 'Indexing started', 'indexing.released': 'Indexing lock released', 'indexing.reviewed': 'Page reviewed',
  'settings.updated': 'Settings updated', 'storage.deleted': 'Storage object deleted', 'topic.deleted': 'Topic deleted', 'topic.renamed': 'Topic renamed',
};

export function ActivityClient({ initial, actors }: { initial: Result; actors: { id: string; name: string }[] }) {
  const [result, setResult] = useState(initial);
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('all');
  const [actorId, setActorId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load(page: number, q = query, action = area, actor = actorId) {
    setBusy(true); setError('');
    const params = new URLSearchParams({ page: String(page) });
    if (q.trim()) params.set('q', q.trim());
    if (action !== 'all') params.set('action', action);
    if (actor) params.set('actorId', actor);
    try {
      const response = await fetch(`/api/admin/activity?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load activity. Try again.');
      setResult(await response.json());
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load activity.'); }
    finally { setBusy(false); }
  }

  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  return <div className="mx-auto max-w-6xl space-y-7">
    <header><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-flame-50 text-flame-700"><Activity className="h-5 w-5" /></span><div><h1 className="font-heading text-2xl font-bold text-gray-900">Activity Log</h1><p className="text-sm text-gray-600">Review sign-ins, access changes and admin work in one place.</p></div></div></header>
    <form onSubmit={event => { event.preventDefault(); void load(1); }} className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4">
      <label className="min-w-[220px] flex-1 text-xs font-semibold text-gray-600">Search activity<div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-300 px-3"><Search className="h-4 w-4 text-gray-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Action, person or record" className="w-full bg-transparent py-2.5 text-sm text-gray-900 outline-none" /></div></label>
      <label className="text-xs font-semibold text-gray-600">Area<select value={area} onChange={event => { setArea(event.target.value); void load(1, query, event.target.value, actorId); }} className="mt-1 block min-w-36 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900">{areas.map(value => <option key={value} value={value}>{value === 'all' ? 'All areas' : value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
      <label className="text-xs font-semibold text-gray-600">Person<select value={actorId} onChange={event => { setActorId(event.target.value); void load(1, query, area, event.target.value); }} className="mt-1 block min-w-40 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900"><option value="">All people</option>{actors.map(actor => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></label>
      <button disabled={busy} className="rounded-xl bg-flame-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-flame-700 disabled:opacity-50">Search</button>
    </form>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white" aria-label="Activity entries"><div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><h2 className="font-semibold text-gray-900">Recent events</h2><span className="text-sm text-gray-500">{result.total.toLocaleString()} total</span></div>
      {result.items.length ? <ol className="divide-y divide-gray-100">{result.items.map(item => <li key={item.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4"><div className="min-w-0"><p className="font-semibold text-gray-900">{actionLabels[item.action] ?? item.action.replaceAll('.', ' · ').replaceAll('_', ' ')} <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 align-middle text-[11px] font-medium text-gray-600">{item.action.split('.')[0]}</span>{item.action.endsWith('.pending') && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 align-middle text-[11px] font-semibold text-amber-800">Needs review</span>}{item.action.endsWith('.failed') && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 align-middle text-[11px] font-semibold text-red-700">Failed</span>}</p><p className="mt-1 text-sm text-gray-600"><span className="font-medium">{item.actorName}</span>{item.actorEmail && <span className="break-all"> · {item.actorEmail}</span>}{item.subjectId && item.subjectId !== item.actorId && <span className="break-all"> · Record {item.subjectId.slice(0, 8)}</span>}</p>{item.detail && <p className="mt-1 break-words text-xs text-gray-500">{item.detail}</p>}</div><time dateTime={item.createdAt} className="whitespace-nowrap text-xs text-gray-500" title={new Date(item.createdAt).toLocaleString()}>{new Date(item.createdAt).toLocaleString()}</time></li>)}</ol> : <p className="px-5 py-14 text-center text-sm text-gray-500">No activity matches these filters.</p>}
    </section>
    <div className="flex items-center justify-between gap-4"><p className="text-sm text-gray-600">Page {result.page} of {pages}</p><div className="flex gap-2"><button type="button" disabled={busy || result.page <= 1} onClick={() => void load(result.page - 1)} aria-label="Previous page" className="rounded-xl border border-gray-300 p-2 text-gray-700 disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button><button type="button" disabled={busy || result.page >= pages} onClick={() => void load(result.page + 1)} aria-label="Next page" className="rounded-xl border border-gray-300 p-2 text-gray-700 disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button></div></div>
  </div>;
}
