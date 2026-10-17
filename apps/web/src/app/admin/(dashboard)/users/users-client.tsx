'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Plus, RefreshCw, ShieldCheck, UserRound, UserRoundX } from 'lucide-react';
import { AdminPageTitle } from '../admin-page-title';

type Account = { id: string; name: string; email: string; roleId: string; roleName: string; isActive: boolean; mustChangePassword: boolean; temporaryPasswordExpiresAt: string | null };
type Role = { id: string; name: string };
type Props = { initialUsers: Account[]; roles: Role[]; currentId: string };

export function AdminUsersClient({ initialUsers, roles, currentId }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('editor');
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function refresh() {
    const response = await fetch('/api/admin/users', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load admin users.');
    setUsers((await response.json()).users);
  }

  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, roleId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create admin.');
      setCredential({ email, password: data.temporaryPassword }); setName(''); setEmail('');
      await refresh(); setMessage('Admin created. Share the temporary password privately.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create admin.'); }
    finally { setBusy(false); }
  }

  async function update(id: string, changes: { roleId?: string; isActive?: boolean }) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update admin.');
      await refresh(); setMessage('Admin access updated. Existing sessions were revoked.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update admin.'); }
    finally { setBusy(false); }
  }

  async function reset(user: Account) {
    if (!window.confirm(`Reset the password for ${user.name}? Their existing sessions will end.`)) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not reset password.');
      setCredential({ email: user.email, password: data.temporaryPassword });
      await refresh(); setMessage('Password reset. Share the temporary password privately.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not reset password.'); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-6xl space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <AdminPageTitle title="Admin Users" description="Give each person their own account and control what they can access." />
      <Link href="/admin/roles" className="inline-flex items-center gap-2 rounded-xl border border-flame-200 bg-white px-4 py-2.5 text-sm font-semibold text-flame-700 hover:bg-flame-50"><ShieldCheck className="h-4 w-4" /> Manage roles</Link>
    </header>
    {message && <p role="status" className="rounded-xl border border-flame-200 bg-flame-50 px-4 py-3 text-sm text-flame-800">{message}</p>}
    {credential && <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5" aria-label="Temporary credentials">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-gray-900">Temporary password for {credential.email}</h2><p className="mt-1 text-sm text-gray-700">Shown only now and valid for 24 hours. Share it privately; this admin must change it at sign-in.</p></div><button type="button" onClick={() => setCredential(null)} className="text-sm font-medium text-gray-700 underline underline-offset-4">Dismiss</button></div>
      <div className="mt-4 flex flex-wrap items-center gap-2"><code className="min-w-0 break-all rounded-lg bg-white px-3 py-2 text-sm text-gray-900">{credential.password}</code><button type="button" className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white" onClick={async () => { await navigator.clipboard.writeText(credential.password); setMessage('Temporary password copied.'); }}><Copy className="h-4 w-4" /> Copy</button></div>
    </section>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4"><h2 className="font-semibold text-gray-900">People with admin access</h2><p className="mt-1 text-sm text-gray-500">Role changes and deactivation end existing sessions.</p></div>
        <div className="divide-y divide-gray-100">{users.map(user => <div key={user.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-flame-50 text-flame-700"><UserRound className="h-5 w-5" /></div>
          <div className="min-w-[160px] flex-1"><p className="font-semibold text-gray-900">{user.name}{user.id === currentId && <span className="ml-2 text-xs font-normal text-gray-500">You</span>}</p><p className="break-all text-sm text-gray-600">{user.email}</p><p className="mt-1 text-xs text-gray-500">{!user.isActive ? 'Inactive' : user.mustChangePassword ? user.temporaryPasswordExpiresAt && Date.parse(user.temporaryPasswordExpiresAt) <= Date.now() ? 'Temporary password expired · Reset required' : user.temporaryPasswordExpiresAt ? `Password change required · Expires ${new Date(user.temporaryPasswordExpiresAt).toLocaleString()}` : 'Password change required' : 'Active'}</p></div>
          <label className="text-xs font-medium text-gray-600">Role<select aria-label={`Role for ${user.name}`} className="mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900" value={user.roleId} disabled={busy || user.id === currentId} onChange={e => update(user.id, { roleId: e.target.value })}>{roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => reset(user)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Reset password</button><button type="button" disabled={busy || user.id === currentId} onClick={() => update(user.id, { isActive: !user.isActive })} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"><UserRoundX className="h-4 w-4" /> {user.isActive ? 'Deactivate' : 'Reactivate'}</button></div>
        </div>)}</div>
      </section>
      <section className="h-fit rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-semibold text-gray-900">Add admin</h2><p className="mt-1 text-sm text-gray-600">Create a separate sign-in for a colleague.</p><form onSubmit={create} className="mt-5 space-y-4">
        <label className="block text-sm font-medium text-gray-700">Full name<input required minLength={2} maxLength={100} value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
        <label className="block text-sm font-medium text-gray-700">Email address<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
        <label className="block text-sm font-medium text-gray-700">Role<select value={roleId} onChange={e => setRoleId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5">{roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
        <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-flame-600 px-4 py-3 text-sm font-semibold text-white hover:bg-flame-700 disabled:opacity-50"><Plus className="h-4 w-4" /> {busy ? 'Working…' : 'Create admin'}</button>
      </form></section>
    </div>
  </div>;
}
