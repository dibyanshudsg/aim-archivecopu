'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ExternalLink, ImageUp, MessageSquareText, Save, Settings } from 'lucide-react';
import { useUI } from '@/components/ui/toast';
import type { AdminSiteSettings } from '@/lib/admin-data';
import { AdminPageTitle } from '../admin-page-title';
import type { BrandAssets, BrandSlot } from '@/lib/brand-assets';

const brandPlacements: { slot: BrandSlot; label: string; description: string }[] = [
  { slot: 'logo', label: 'Main logo', description: 'Header, footer and admin screens' },
  { slot: 'favicon', label: 'Favicon', description: 'Browser tab and saved shortcut' },
  { slot: 'social', label: 'Social image', description: 'Shared links and preview cards' },
];

interface SiteSettingsForm {
  feedback_form_url: string;
  feedback_form_edit_url: string;
}

export function AdminSettingsClient({
  initialSettings,
  initialBrand,
  initialError = '',
}: {
  initialSettings: AdminSiteSettings;
  initialBrand: BrandAssets;
  initialError?: string;
}) {
  const { toast } = useUI();
  const [form, setForm] = useState<SiteSettingsForm>(initialSettings);
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(initialError);
  const [brand, setBrand] = useState(initialBrand);
  const [brandFile, setBrandFile] = useState<File | null>(null);
  const [brandPreview, setBrandPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<BrandAssets>({ logo: true, favicon: true, social: true });
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandVersion, setBrandVersion] = useState(0);

  useEffect(() => {
    if (!brandFile) { setBrandPreview(null); return; }
    const url = URL.createObjectURL(brandFile);
    setBrandPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [brandFile]);

  async function uploadBrand() {
    if (!brandFile || !Object.values(selected).some(Boolean)) { setError('Choose an image and at least one placement.'); return; }
    setBrandSaving(true); setError('');
    try {
      const body = new FormData();
      body.set('image', brandFile);
      for (const slot of brandPlacements) body.set(slot.slot, String(selected[slot.slot]));
      const response = await fetch('/api/admin/brand', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not upload image');
      setBrand(data); setBrandFile(null); setBrandVersion(Date.now());
      toast.success('Selected brand images updated');
    } catch (cause) { const message = cause instanceof Error ? cause.message : 'Could not upload image'; setError(message); toast.error(message); }
    finally { setBrandSaving(false); }
  }

  async function restoreBrand(slot: BrandSlot) {
    setBrandSaving(true); setError('');
    try {
      const response = await fetch(`/api/admin/brand?slot=${slot}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not restore default');
      setBrand(data); setBrandVersion(Date.now()); toast.success('Default image restored');
    } catch (cause) { const message = cause instanceof Error ? cause.message : 'Could not restore default'; setError(message); toast.error(message); }
    finally { setBrandSaving(false); }
  }

  async function saveSettings() {
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save settings');
      setForm({
        feedback_form_url: data.feedback_form_url ?? '',
        feedback_form_edit_url: data.feedback_form_edit_url ?? '',
      });
      toast.success('Feedback settings saved');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const publicUrl = form.feedback_form_url.trim();
  const editUrl = form.feedback_form_edit_url.trim();

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageTitle title="Settings" />
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
          <div className="mt-5 h-11 animate-pulse rounded-xl bg-gray-100" />
          <div className="mt-4 h-11 animate-pulse rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <AdminPageTitle title="Settings" description="Manage public links and small site-level controls without changing code." />
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" aria-labelledby="brand-images-title">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-flame-50 text-flame-700"><ImageUp className="h-5 w-5" /></span>
          <div><h2 id="brand-images-title" className="text-base font-semibold text-gray-900">Brand images</h2><p className="mt-1 text-sm text-gray-600">Upload one image and select where it should appear. Each placement can also be restored independently.</p></div>
        </div>
        <label className="block text-sm font-medium text-gray-800" htmlFor="brand-image-upload">Image to upload</label>
        <input id="brand-image-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setBrandFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-xl border border-gray-200 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-flame-50 file:px-3 file:py-2 file:font-semibold file:text-flame-700" />
        <p className="mt-1 text-xs text-gray-600">PNG, JPEG or WebP, at least 128 × 128 pixels, up to 5 MB. The system prepares the selected sizes.</p>
        {brandPreview && <div className="mt-4 flex items-center gap-3"><Image src={brandPreview} alt="Selected image preview" width={72} height={72} unoptimized className="h-[72px] w-[72px] rounded-lg object-contain" /><span className="text-sm text-gray-700">{brandFile?.name}</span></div>}
        <div className="mt-5 divide-y divide-gray-100 border-y border-gray-100">
          {brandPlacements.map(({ slot, label, description }) => <div key={slot} className="flex flex-wrap items-center gap-3 py-3">
            <input id={`brand-${slot}`} type="checkbox" checked={selected[slot]} onChange={(event) => setSelected((current) => ({ ...current, [slot]: event.target.checked }))} className="h-4 w-4 accent-flame-600" />
            <label htmlFor={`brand-${slot}`} className="min-w-0 flex-1 cursor-pointer"><span className="block text-sm font-semibold text-gray-900">{label}</span><span className="block text-xs text-gray-600">{description}</span></label>
            <Image src={`/api/brand/${slot}?v=${brandVersion}`} alt={`${label} currently in use`} width={44} height={44} unoptimized className="h-11 w-11 rounded-lg bg-gray-50 object-contain" />
            <span className="text-xs text-gray-600">{brand[slot] ? 'Custom' : 'Default'}</span>
            {brand[slot] && <button type="button" disabled={brandSaving} onClick={() => restoreBrand(slot)} className="text-sm font-medium text-flame-700 underline underline-offset-2 disabled:opacity-50">Restore default</button>}
          </div>)}
        </div>
        <button type="button" disabled={brandSaving || !brandFile || !Object.values(selected).some(Boolean)} onClick={uploadBrand} className="mt-5 rounded-xl bg-flame-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-flame-700 disabled:opacity-50">{brandSaving ? 'Updating images…' : 'Update selected images'}</button>
      </section>

      <details className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 focus-visible:outline-2 focus-visible:outline-flame-600 [&::-webkit-details-marker]:hidden">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-50 to-flame-50 text-flame-600">
            <MessageSquareText className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900">Feedback form</h2>
            <p className="text-sm text-gray-500">
              The footer feedback button appears only when the public form URL is set.
            </p>
          </div>
          <ChevronDown aria-hidden="true" className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" />
        </summary>

        <div className="space-y-5 border-t border-gray-100 p-5">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Public Google Form link</span>
            <input
              type="url"
              value={form.feedback_form_url}
              onChange={(event) => setForm((prev) => ({ ...prev, feedback_form_url: event.target.value }))}
              placeholder="https://forms.gle/..."
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
            />
            <span className="mt-1 block text-xs text-gray-400">
              This is where visitors go when they click Share feedback.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Google Form edit/manage link</span>
            <input
              type="url"
              value={form.feedback_form_edit_url}
              onChange={(event) => setForm((prev) => ({ ...prev, feedback_form_edit_url: event.target.value }))}
              placeholder="https://docs.google.com/forms/d/..."
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
            />
            <span className="mt-1 block text-xs text-gray-400">
              Keep the editable form URL here for quick admin access.
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <div className="flex flex-wrap gap-2">
              <a
                href={publicUrl || undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!publicUrl}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                  publicUrl
                    ? 'border-flame-200 text-flame-700 hover:border-flame-300 hover:bg-flame-50'
                    : 'pointer-events-none border-gray-200 text-gray-300'
                }`}
              >
                <ExternalLink className="h-4 w-4" />
                Open public form
              </a>
              <a
                href={editUrl || undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!editUrl}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                  editUrl
                    ? 'border-flame-200 text-flame-700 hover:border-flame-300 hover:bg-flame-50'
                    : 'pointer-events-none border-gray-200 text-gray-300'
                }`}
              >
                <Settings className="h-4 w-4" />
                Manage form
              </a>
            </div>

            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
