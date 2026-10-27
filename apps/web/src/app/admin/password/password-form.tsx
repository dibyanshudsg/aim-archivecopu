'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

function PasswordField({ label, value, onChange, autoComplete, minLength }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return <div>
    <label htmlFor={`password-${autoComplete}-${label}`} className="block text-sm font-medium text-gray-700">{label}</label>
    <div className="relative mt-1">
      <input id={`password-${autoComplete}-${label}`} className="w-full rounded-xl border border-gray-300 px-3 py-2.5 pr-12" type={visible ? 'text' : 'password'} autoComplete={autoComplete} minLength={minLength} required value={value} onChange={event => onChange(event.target.value)} />
      <button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(!visible)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-gray-600 hover:text-flame-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-600">
        {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  </div>;
}

export function AdminPasswordForm({ standalone = false, inDialog = false, onSuccess }: { standalone?: boolean; inDialog?: boolean; onSuccess?: () => void }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirm) { setError('The new passwords do not match.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Password change failed.'); return; }
      if (standalone) { router.replace(data.redirectTo || '/admin'); router.refresh(); }
      else { setCurrentPassword(''); setNewPassword(''); setConfirm(''); if (onSuccess) onSuccess(); else setSuccess('Password updated successfully.'); router.refresh(); }
    } catch { setError('Could not change your password. Try again.'); }
    finally { setSaving(false); }
  }

  return <section className={inDialog ? 'w-full' : 'w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8'}>
      <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-flame-50 text-flame-700"><KeyRound className="h-5 w-5" /></div>
      {inDialog ? <h2 className="font-heading text-2xl font-bold text-gray-900">Change your password</h2> : <h1 className="font-heading text-2xl font-bold text-gray-900">Change your password</h1>}
      <p className="mt-2 text-sm text-gray-600">Use a unique password with at least 12 characters.{standalone ? ' For your first sign-in, enter the temporary or previous shared password as your current password.' : ''}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
        <PasswordField label="New password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" minLength={12} />
        <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" minLength={12} />
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{success}</p>}
        <button disabled={saving} className="w-full rounded-xl bg-flame-600 px-4 py-3 text-sm font-semibold text-white hover:bg-flame-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save password'}</button>
      </form>
      {standalone && <Link className="mt-5 inline-block text-sm text-gray-600 underline underline-offset-4 hover:text-flame-700" href="/admin/login">Back to sign in</Link>}
    </section>;
}
