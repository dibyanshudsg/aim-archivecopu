'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, MessageSquareText, Save, Settings } from 'lucide-react';
import { useUI } from '@/components/ui/toast';

interface SiteSettingsForm {
  feedback_form_url: string;
  feedback_form_edit_url: string;
}

const emptyForm: SiteSettingsForm = {
  feedback_form_url: '',
  feedback_form_edit_url: '',
};

export default function AdminSettingsPage() {
  const { toast } = useUI();
  const [form, setForm] = useState<SiteSettingsForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load settings');
        setForm({
          feedback_form_url: data.feedback_form_url ?? '',
          feedback_form_edit_url: data.feedback_form_edit_url ?? '',
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

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
        <h1 className="font-heading text-2xl font-bold text-gray-900">Settings</h1>
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
        <p className="bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-xs font-semibold uppercase text-transparent">
          Site controls
        </p>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage public links and small site-level controls without changing code.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-50 to-flame-50 text-flame-600">
            <MessageSquareText className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Feedback form</h2>
            <p className="text-sm text-gray-500">
              The footer feedback button appears only when the public form URL is set.
            </p>
          </div>
        </div>

        <div className="space-y-5 p-5">
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
      </section>
    </div>
  );
}
