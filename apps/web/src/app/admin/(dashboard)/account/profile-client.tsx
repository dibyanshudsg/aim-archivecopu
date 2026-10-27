'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Check, KeyRound, Mail, Pencil, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { AdminPageTitle } from '../admin-page-title';
import { AdminPasswordForm } from '../../password/password-form';
import { useUI } from '@/components/ui/toast';
import { AdminDialog } from '../admin-dialog';

interface ProfileAccount {
  name: string;
  email: string;
  roleName: string;
  isActive: boolean;
  permissions: string[];
}

export function AdminProfileClient({ account }: { account: ProfileAccount }) {
  const router = useRouter();
  const { toast } = useUI();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(account.name);
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [error, setError] = useState('');
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  function refreshAvatar() {
    setAvatarVersion(Date.now());
    window.dispatchEvent(new Event('admin-avatar-changed'));
  }

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    setSavingAvatar(true); setError('');
    try {
      const form = new FormData();
      form.set('image', file);
      const response = await fetch('/api/admin/avatar', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not upload avatar');
      refreshAvatar(); toast.success('Profile photo updated');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not upload avatar'); }
    finally { setSavingAvatar(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function removeAvatar() {
    setSavingAvatar(true); setError('');
    try {
      const response = await fetch('/api/admin/avatar', { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not remove avatar');
      refreshAvatar(); toast.success('Profile photo removed');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove avatar'); }
    finally { setSavingAvatar(false); }
  }

  async function saveName(event: React.FormEvent) {
    event.preventDefault(); setSavingName(true); setError('');
    try {
      const response = await fetch('/api/admin/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update display name');
      setName(result.name); setEditingName(false); router.refresh(); refreshAvatar(); toast.success('Display name updated');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update display name'); }
    finally { setSavingName(false); }
  }

  return <div className="mx-auto max-w-5xl space-y-6">
    <AdminPageTitle title="Your profile" description="Manage how your admin identity appears and keep your account secure." />
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" aria-labelledby="profile-heading">
      <div className="h-24 bg-gradient-to-r from-gold-100 via-orange-50 to-flame-100" />
      <div className="px-6 pb-7 sm:px-8">
        <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
          <Image src={`/api/admin/avatar?v=${avatarVersion}`} alt={`${name}'s profile photo`} width={88} height={88} unoptimized className="h-20 w-20 rounded-full border-4 border-white bg-orange-50 object-cover shadow-sm" />
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="profile-avatar-upload" onChange={(event) => uploadAvatar(event.target.files?.[0])} />
            <button type="button" disabled={savingAvatar} onClick={() => fileRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-flame-600 px-4 text-sm font-semibold text-white hover:bg-flame-700 disabled:opacity-50"><Camera className="h-4 w-4" />{savingAvatar ? 'Updating…' : 'Upload photo'}</button>
            <button type="button" disabled={savingAvatar} onClick={removeAvatar} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><Trash2 className="h-4 w-4" />Remove</button>
          </div>
        </div>
        <h2 id="profile-heading" className="font-heading mt-4 text-2xl font-semibold text-gray-900">{name}</h2>
        <p className="mt-1 text-sm text-gray-600">{account.email}</p>
        <p className="mt-3 text-xs text-gray-500">Square PNG, JPEG or WebP, at least 64 × 64 pixels, up to 3 MB. The photo appears in your admin profile and sidebar.</p>
      </div>
    </section>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="details-heading">
        <div className="mb-6 flex items-center gap-3"><span className="rounded-xl bg-flame-50 p-2.5 text-flame-700"><UserRound className="h-5 w-5" /></span><div><h2 id="details-heading" className="font-heading text-lg font-semibold text-gray-900">Account details</h2><p className="text-sm text-gray-500">The name shown in the admin sidebar.</p></div></div>
        <div className="space-y-5">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Display name</p>
            {editingName ? <form onSubmit={saveName} className="mt-2 flex flex-wrap gap-2"><input aria-label="Display name" autoFocus minLength={2} maxLength={80} required value={name} onChange={(event) => setName(event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-xl border border-gray-300 px-3 text-sm focus:border-flame-500 focus:outline-none" /><button disabled={savingName} className="inline-flex items-center gap-2 rounded-xl bg-flame-600 px-4 text-sm font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" />Save</button><button type="button" onClick={() => { setName(account.name); setEditingName(false); }} className="rounded-xl border border-gray-200 px-4 text-sm text-gray-600">Cancel</button></form>
              : <div className="mt-2 flex items-center justify-between gap-3"><span className="font-medium text-gray-900">{name}</span><button type="button" onClick={() => setEditingName(true)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-flame-700 hover:bg-flame-50"><Pencil className="h-4 w-4" />Edit</button></div>}
          </div>
          <div className="border-t border-gray-100 pt-5"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sign-in email</p><p className="mt-2 flex items-center gap-2 text-sm font-medium text-gray-900"><Mail className="h-4 w-4 text-gray-400" />{account.email}</p></div>
          <div className="border-t border-gray-100 pt-5"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Access role</p><p className="mt-2 flex items-center gap-2 text-sm font-medium text-gray-900"><ShieldCheck className="h-4 w-4 text-flame-600" />{account.roleName}</p><p className="mt-1 text-xs text-gray-500">{account.permissions.length} permissions assigned by your role.</p></div>
          <div className="border-t border-gray-100 pt-5"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Account status</p><p className="mt-2 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-800"><span className="h-2 w-2 rounded-full bg-green-500" />{account.isActive ? 'Active' : 'Inactive'}</p></div>
        </div>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="security-heading"><span className="inline-flex rounded-xl bg-flame-50 p-2.5 text-flame-700"><KeyRound className="h-5 w-5" /></span><h2 id="security-heading" className="font-heading mt-4 text-lg font-semibold text-gray-900">Password & security</h2><p className="mt-2 text-sm leading-6 text-gray-600">Change your password regularly and use a unique one with at least 12 characters.</p><button type="button" onClick={() => setPasswordDialogOpen(true)} className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-700">Change password</button></section>
    </div>
    {passwordDialogOpen && <AdminDialog label="Change password" onClose={() => setPasswordDialogOpen(false)}><AdminPasswordForm inDialog onSuccess={() => { setPasswordDialogOpen(false); toast.success('Password updated successfully'); }} /></AdminDialog>}
  </div>;
}
