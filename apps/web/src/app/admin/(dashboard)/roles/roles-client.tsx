'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { ADMIN_PERMISSIONS, PERMISSION_LABELS, type AdminPermission } from '@/lib/admin-permissions';
import { AdminPageTitle } from '../admin-page-title';

type Role = { id: string; name: string; description: string; isSystem: boolean; permissions: string[] };
type Form = { id?: string; name: string; description: string; permissions: AdminPermission[] };
const empty: Form = { name: '', description: '', permissions: ['dashboard.view'] };
const groups = [
  { title: 'Workspace', values: ADMIN_PERMISSIONS.filter(p => p.startsWith('dashboard.')) },
  { title: 'Catalogue', values: ADMIN_PERMISSIONS.filter(p => p.startsWith('catalogue.')) },
  { title: 'Indexing', values: ADMIN_PERMISSIONS.filter(p => p.startsWith('indexing.')) },
  { title: 'Navigation and storage', values: ADMIN_PERMISSIONS.filter(p => p.startsWith('navigation.') || p.startsWith('storage.')) },
  { title: 'Settings and access', values: ADMIN_PERMISSIONS.filter(p => p.startsWith('settings.') || p.startsWith('users.') || p.startsWith('roles.')) },
];

export function AdminRolesClient({ initialRoles }: { initialRoles: Role[] }) {
  const [roles, setRoles] = useState(initialRoles);
  const [form, setForm] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function refresh() {
    const response = await fetch('/api/admin/roles', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not refresh roles.');
    setRoles((await response.json()).roles);
  }

  function select(role: Role) {
    if (role.id === 'owner') { setMessage('Owner always has full access and cannot be edited.'); return; }
    setForm({ id: role.id, name: role.name, description: role.description, permissions: role.permissions as AdminPermission[] }); setMessage('');
  }

  function toggle(permission: AdminPermission) {
    setForm(current => ({ ...current, permissions: current.permissions.includes(permission) ? current.permissions.filter(p => p !== permission) : [...current.permissions, permission] }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch(form.id ? `/api/admin/roles/${form.id}` : '/api/admin/roles', { method: form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, description: form.description, permissions: form.permissions }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save role.');
      await refresh(); setForm(empty); setMessage('Role saved. Assigned admins will sign in again to use changed permissions.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save role.'); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!form.id || !window.confirm(`Delete the ${form.name} role? It must have no assigned admins.`)) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/roles/${form.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not delete role.');
      await refresh(); setForm(empty); setMessage('Role deleted.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not delete role.'); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-6xl space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><AdminPageTitle title="Roles & Permissions" description="Choose exactly what each admin role can see and change." /><Link href="/admin/users" className="rounded-xl border border-flame-200 bg-white px-4 py-2.5 text-sm font-semibold text-flame-700 hover:bg-flame-50">Back to admin users</Link></header>
    {message && <p role="status" className="rounded-xl border border-flame-200 bg-flame-50 px-4 py-3 text-sm text-flame-800">{message}</p>}
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <section className="h-fit rounded-2xl border border-gray-200 bg-white p-4"><div className="mb-3 flex items-center justify-between px-2"><h2 className="font-semibold text-gray-900">Roles</h2><button type="button" onClick={() => { setForm(empty); setMessage(''); }} className="rounded-lg p-2 text-flame-700 hover:bg-flame-50" aria-label="Add a role"><Plus className="h-4 w-4" /></button></div><div className="space-y-1">{roles.map(role => <button key={role.id} type="button" onClick={() => select(role)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${form.id === role.id ? 'bg-flame-50 text-flame-800' : 'text-gray-700 hover:bg-gray-50'}`}><ShieldCheck className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{role.name}</span><span className="block text-xs opacity-70">{role.id === 'owner' ? 'Full access' : `${role.permissions.length} permissions`}</span></span></button>)}</div></section>
      <form onSubmit={save} className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-gray-900">{form.id ? `Edit ${form.name}` : 'Create role'}</h2><p className="mt-1 text-sm text-gray-600">Permission changes take effect after affected admins sign in again.</p></div>{form.id && !roles.find(r => r.id === form.id)?.isSystem && <button type="button" disabled={busy} onClick={remove} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Delete role</button>}</div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-gray-700">Role name<input required minLength={2} maxLength={60} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label><label className="block text-sm font-medium text-gray-700">Description<input maxLength={300} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label></div>
        <div className="mt-7 grid gap-6 sm:grid-cols-2">{groups.map(group => <fieldset key={group.title} className="min-w-0"><legend className="mb-2 text-sm font-semibold text-gray-900">{group.title}</legend><div className="space-y-1">{group.values.map(permission => <label key={permission} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"><input type="checkbox" checked={form.permissions.includes(permission)} onChange={() => toggle(permission)} className="h-4 w-4 accent-amber-600" /><span>{PERMISSION_LABELS[permission]}</span></label>)}</div></fieldset>)}</div>
        <div className="mt-7 flex justify-end"><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-flame-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-flame-700 disabled:opacity-50"><Save className="h-4 w-4" /> {busy ? 'Saving…' : form.id ? 'Save changes' : 'Create role'}</button></div>
      </form>
    </div>
  </div>;
}
