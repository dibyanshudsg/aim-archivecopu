'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { LANGUAGE_NAMES } from '@aim-archive/shared';
import { useUI } from '@/components/ui/toast';
import type { AdminMagazine } from '@/lib/admin-data';
import { AdminPageTitle } from '../admin-page-title';

export function AdminMagazinesClient({ initialMagazines }: { initialMagazines: AdminMagazine[] }) {
  const { confirm, toast } = useUI();
  const [magazines, setMagazines] = useState<AdminMagazine[]>(initialMagazines);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', language: 'english', description: '' });

  async function loadMagazines() {
    const res = await fetch('/api/admin/magazines');
    if (res.ok) setMagazines(await res.json());
    setLoading(false);
  }

  function resetForm() {
    setForm({ name: '', language: 'english', description: '' });
    setShowForm(false);
    setEditingId(null);
  }

  function startEdit(mag: AdminMagazine) {
    setForm({ name: mag.name, language: mag.language, description: mag.description });
    setEditingId(mag.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editingId ? `/api/admin/magazines/${editingId}` : '/api/admin/magazines';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      resetForm();
      loadMagazines();
      toast.success(editingId ? 'Magazine updated' : 'Magazine created');
    } else {
      toast.error('Could not save magazine');
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Delete magazine',
      message: 'Delete this magazine? All its issues will also be deleted.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/magazines/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadMagazines();
      toast.success('Magazine deleted');
    } else {
      toast.error('Could not delete magazine');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AdminPageTitle title="Magazines" />
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600"
          >
            <Plus className="h-4 w-4" />
            Add Magazine
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? 'Edit Magazine' : 'New Magazine'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
                placeholder="e.g., All India Magazine"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Language</label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
              >
                {Object.entries(LANGUAGE_NAMES).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
                placeholder="Brief description of this magazine..."
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600"
            >
              <Check className="h-4 w-4" />
              {editingId ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Magazines List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-6">
              <div className="h-5 w-40 rounded bg-gray-100" />
              <div className="mt-2 h-3 w-60 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {magazines.map((mag) => (
            <div
              key={mag.id}
              className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-6"
            >
              <div>
                <h3 className="font-semibold text-gray-900">{mag.name}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {LANGUAGE_NAMES[mag.language as keyof typeof LANGUAGE_NAMES] || mag.language}
                  {mag.description && ` — ${mag.description.slice(0, 80)}...`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(mag)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-flame-600"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(mag.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
