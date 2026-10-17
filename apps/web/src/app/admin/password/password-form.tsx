'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';

export function AdminPasswordForm({ standalone = false }: { standalone?: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirm) { setError('The new passwords do not match.'); return; }
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/admin/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Password change failed.'); return; }
      router.replace(data.redirectTo || '/admin/account'); router.refresh();
    } catch { setError('Could not change your password. Try again.'); }
    finally { setSaving(false); }
  }

  return <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-flame-50 text-flame-700"><KeyRound className="h-5 w-5" /></div>
      <h1 className="font-heading text-2xl font-bold text-gray-900">Change your password</h1>
      <p className="mt-2 text-sm text-gray-600">Use a unique password with at least 12 characters.{standalone ? ' For your first sign-in, enter the temporary or previous shared password as your current password.' : ''}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-gray-700">Current password<input className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5" type="password" autoComplete="current-password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label>
        <label className="block text-sm font-medium text-gray-700">New password<input className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5" type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label>
        <label className="block text-sm font-medium text-gray-700">Confirm new password<input className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5" type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={saving} className="w-full rounded-xl bg-flame-600 px-4 py-3 text-sm font-semibold text-white hover:bg-flame-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save password'}</button>
      </form>
      {standalone && <Link className="mt-5 inline-block text-sm text-gray-600 underline underline-offset-4 hover:text-flame-700" href="/admin/login">Back to sign in</Link>}
    </section>;
}
