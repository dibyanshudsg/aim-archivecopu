'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  MonitorSmartphone,
  Navigation,
  PanelBottom,
  PanelTop,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { useUI } from '@/components/ui/toast';
import {
  HEADER_NAV_LIMIT,
  NAVIGATION_MENU_DEFINITIONS,
  NAVIGATION_ROUTES,
  type NavigationDestinations,
  type NavigationItem,
  type NavigationLinkType,
  type NavigationMenu,
  type NavigationMenuKey,
  type PublicNavigation,
} from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface NavigationClientProps {
  initialNavigation: PublicNavigation;
  destinations: NavigationDestinations;
}

interface NavigationFormState {
  id: string | null;
  menu_key: NavigationMenuKey;
  label: string;
  link_type: NavigationLinkType;
  route_key: string;
  target_id: string;
  href: string;
  is_published: boolean;
  opens_new_tab: boolean;
}

const LINK_TYPES: Array<{ value: NavigationLinkType; label: string; helper: string }> = [
  { value: 'route', label: 'Page route', helper: 'Home, Browse, Search, Bookmarks' },
  { value: 'magazine', label: 'Magazine', helper: 'Browse filtered by magazine' },
  { value: 'topic', label: 'Topic', helper: 'Browse filtered by subject' },
  { value: 'issue', label: 'Issue', helper: 'Single issue detail page' },
  { value: 'external', label: 'External URL', helper: 'Opens outside this website' },
  { value: 'feedback', label: 'Feedback', helper: 'Uses the Settings feedback URL' },
];

export function NavigationClient({ initialNavigation, destinations }: NavigationClientProps) {
  const { toast, confirm } = useUI();
  const [navigation, setNavigation] = useState(initialNavigation);
  const [selectedMenuKey, setSelectedMenuKey] = useState<NavigationMenuKey>('header');
  const [form, setForm] = useState<NavigationFormState>(() => newForm('header'));
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const selectedMenu = navigation.menus[selectedMenuKey];
  const selectedItem = form.id ? selectedMenu.items.find((item) => item.id === form.id) : null;
  const headerPublishedCount = navigation.menus.header.items.filter((item) => item.is_published).length;
  const previewHref = useMemo(() => previewNavigationHref(form, destinations), [form, destinations]);

  function selectMenu(key: NavigationMenuKey) {
    setSelectedMenuKey(key);
    setForm(newForm(key));
    setCreating(false);
  }

  function editItem(item: NavigationItem) {
    setSelectedMenuKey(item.menu_key);
    setCreating(false);
    setForm({
      id: item.id,
      menu_key: item.menu_key,
      label: item.label,
      link_type: item.link_type,
      route_key: item.route_key ?? '',
      target_id: item.target_id ?? '',
      href: item.link_type === 'route' && item.route_key ? '' : item.href,
      is_published: item.is_published,
      opens_new_tab: item.opens_new_tab,
    });
  }

  function toggleItem(item: NavigationItem) {
    if (form.id === item.id) {
      setForm(newForm(selectedMenuKey));
      setCreating(false);
      return;
    }

    editItem(item);
  }

  async function refreshNavigation() {
    const response = await fetch('/api/admin/navigation', { cache: 'no-store' });
    if (!response.ok) throw new Error(await readError(response));
    setNavigation((await response.json()) as PublicNavigation);
  }

  async function saveItem() {
    setSaving(true);
    try {
      const payload = buildPayload(form, selectedItem?.sort_order ?? selectedMenu.items.length, destinations);
      const response = await fetch(form.id ? `/api/admin/navigation/items/${form.id}` : '/api/admin/navigation/items', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await readError(response));
      await refreshNavigation();
      setForm(newForm(payload.menu_key));
      setSelectedMenuKey(payload.menu_key);
      setCreating(false);
      toast.success('Navigation saved', { variant: 'admin' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save navigation item', { variant: 'admin' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item: NavigationItem) {
    const ok = await confirm({
      title: 'Delete navigation link?',
      message: `This removes "${item.label}" from ${navigation.menus[item.menu_key].title}.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    setBusyItemId(item.id);
    try {
      const response = await fetch(`/api/admin/navigation/items/${item.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await readError(response));
      await refreshNavigation();
      if (form.id === item.id) {
        setForm(newForm(item.menu_key));
        setCreating(false);
      }
      toast.success('Navigation link deleted', { variant: 'admin' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete navigation item', { variant: 'admin' });
    } finally {
      setBusyItemId(null);
    }
  }

  async function moveItem(item: NavigationItem, direction: -1 | 1) {
    const items = selectedMenu.items;
    const index = items.findIndex((entry) => entry.id === item.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);

    setBusyItemId(item.id);
    try {
      const response = await fetch('/api/admin/navigation/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_key: selectedMenuKey, item_ids: next.map((entry) => entry.id) }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setNavigation((await response.json()) as PublicNavigation);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reorder navigation', { variant: 'admin' });
    } finally {
      setBusyItemId(null);
    }
  }

  async function resetMenu() {
    const ok = await confirm({
      title: 'Reset this menu?',
      message: `${selectedMenu.title} will be replaced with the default links.`,
      confirmLabel: 'Reset',
    });
    if (!ok) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/navigation/reset-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_key: selectedMenuKey }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setNavigation((await response.json()) as PublicNavigation);
      setForm(newForm(selectedMenuKey));
      setCreating(false);
      toast.success('Menu reset', { variant: 'admin' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset menu', { variant: 'admin' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-50 to-flame-50 text-flame-600">
              <Navigation className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-heading text-2xl font-bold text-gray-900">Navigation</h1>
              <p className="text-sm text-gray-500">Manage website header, mobile menu, and footer links.</p>
            </div>
          </div>
        </div>
        <Link
          href="/"
          target="_blank"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame-200 bg-white px-4 py-2.5 text-sm font-semibold text-flame-700 transition-colors hover:bg-flame-50"
        >
          <ExternalLink className="h-4 w-4" />
          Preview Site
        </Link>
      </div>

      <div className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {NAVIGATION_MENU_DEFINITIONS.map((menu) => (
            <MenuCard
              key={menu.key}
              menu={navigation.menus[menu.key]}
              active={selectedMenuKey === menu.key}
              onClick={() => selectMenu(menu.key)}
            />
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 bg-gradient-to-r from-white to-flame-50/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">{selectedMenu.title}</h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-flame-700 ring-1 ring-flame-100">
                  {selectedMenu.items.filter((item) => item.is_published).length} published
                </span>
              </div>
              <p className="mt-0.5 text-sm text-gray-500">{selectedMenu.description}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetMenu}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(newForm(selectedMenuKey));
                  setCreating(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-500 to-flame-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(190,140,46,0.18)]"
              >
                <Plus className="h-4 w-4" />
                Add Link
              </button>
            </div>
          </div>

          {selectedMenuKey === 'header' && headerPublishedCount >= HEADER_NAV_LIMIT && (
            <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-800">
              Header is at the recommended maximum of {HEADER_NAV_LIMIT} published links.
            </div>
          )}

          <AnimatePresence initial={false}>
            {creating && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden border-b border-flame-100 bg-flame-50/35"
              >
                <div className="px-4 py-4">
                  <NavigationItemEditor
                    form={form}
                    setForm={setForm}
                    destinations={destinations}
                    previewHref={previewHref}
                    saving={saving}
                    title={`New link in ${navigation.menus[form.menu_key].title}`}
                    description="Choose the menu, label, and destination before saving."
                    saveLabel="Create Navigation Link"
                    onCancel={() => {
                      setCreating(false);
                      setForm(newForm(selectedMenuKey));
                    }}
                    onSave={saveItem}
                    onMenuChange={(key) => {
                      setForm((current) => ({ ...current, menu_key: key }));
                      setSelectedMenuKey(key);
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="divide-y divide-gray-100">
            {selectedMenu.items.length === 0 ? (
              <div className="m-4 rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                No links in this menu yet.
              </div>
            ) : (
              selectedMenu.items.map((item, index) => (
                <article
                  key={item.id}
                  className={cn(
                    'group transition-colors',
                    form.id === item.id ? 'bg-flame-50/70 shadow-[inset_3px_0_0_#f97316]' : 'hover:bg-gray-50',
                  )}
                >
                  <div className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <button
                      type="button"
                      onClick={() => toggleItem(item)}
                      aria-expanded={form.id === item.id}
                      className={cn(
                        'min-w-0 rounded-xl text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame-300',
                        form.id === item.id ? 'bg-white/80 ring-1 ring-flame-200' : '',
                      )}
                    >
                      <div className="grid min-w-0 gap-3 p-2 sm:grid-cols-[2.5rem_minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] sm:items-center">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gold-50 to-flame-50 text-xs font-bold text-flame-700">
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-semibold text-gray-900">{item.label}</span>
                          </span>
                          <span className="mt-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            {linkTypeLabel(item.link_type)}
                          </span>
                        </span>
                        <span className="flex min-w-0 items-center gap-2 text-xs text-gray-500">
                          <Link2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate font-medium text-gray-600">{item.href}</span>
                        </span>
                        <StatusPill item={item} />
                        <span
                          className={cn(
                            'hidden h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-transform sm:flex',
                            form.id === item.id ? 'rotate-180 text-flame-600' : 'group-hover:text-flame-600',
                          )}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 justify-self-end rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
                      <IconButton label="Move up" disabled={index === 0 || busyItemId === item.id} onClick={() => moveItem(item, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label="Move down"
                        disabled={index === selectedMenu.items.length - 1 || busyItemId === item.id}
                        onClick={() => moveItem(item, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </IconButton>
                      <IconButton label="Delete" disabled={busyItemId === item.id} onClick={() => deleteItem(item)} destructive>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {form.id === item.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden border-t border-flame-100 bg-gradient-to-b from-flame-50/45 to-white"
                      >
                        <div className="px-4 py-4">
                          <NavigationItemEditor
                            form={form}
                            setForm={setForm}
                            destinations={destinations}
                            previewHref={previewHref}
                            saving={saving}
                            title={`Edit ${item.label}`}
                            description={`This link belongs to ${selectedMenu.title}.`}
                            saveLabel="Save Navigation Link"
                            onCancel={() => setForm(newForm(selectedMenuKey))}
                            onSave={saveItem}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function MenuCard({ menu, active, onClick }: { menu: NavigationMenu; active: boolean; onClick: () => void }) {
  const Icon = menu.location === 'header' ? PanelTop : menu.location === 'mobile' ? MonitorSmartphone : PanelBottom;
  const published = menu.items.filter((item) => item.is_published).length;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border px-3 py-3 text-left transition-colors',
        active
          ? 'border-flame-300 bg-gradient-to-r from-gold-50 to-flame-50 shadow-[inset_0_-2px_0_#f97316]'
          : 'border-gray-100 bg-white hover:border-flame-100 hover:bg-flame-50/30',
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-flame-600 shadow-sm ring-1 ring-gray-100">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-gray-900">{menu.title}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">{published} published</span>
        </span>
      </div>
    </button>
  );
}

function NavigationItemEditor({
  form,
  setForm,
  destinations,
  previewHref,
  saving,
  title,
  description,
  saveLabel,
  onCancel,
  onSave,
  onMenuChange,
}: {
  form: NavigationFormState;
  setForm: React.Dispatch<React.SetStateAction<NavigationFormState>>;
  destinations: NavigationDestinations;
  previewHref: string;
  saving: boolean;
  title: string;
  description: string;
  saveLabel: string;
  onCancel: () => void;
  onSave: () => void;
  onMenuChange?: (key: NavigationMenuKey) => void;
}) {
  const menu = NAVIGATION_MENU_DEFINITIONS.find((entry) => entry.key === form.menu_key);

  return (
    <div className="rounded-2xl border border-flame-100 bg-white p-4 shadow-[0_12px_28px_rgba(190,140,46,0.10)]">
      <div className="mb-4 flex flex-col gap-1 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <div className="rounded-full bg-flame-50 px-3 py-1 text-xs font-semibold text-flame-700 ring-1 ring-flame-100">
          {previewHref}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <Field label="Menu">
            {onMenuChange ? (
              <select
                value={form.menu_key}
                onChange={(event) => onMenuChange(event.target.value as NavigationMenuKey)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-flame-300"
              >
                {NAVIGATION_MENU_DEFINITIONS.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.title}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700">
                {menu?.title ?? form.menu_key}
              </div>
            )}
          </Field>

          <Field label="Label">
            <input
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              maxLength={80}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-flame-300"
              placeholder="Browse"
            />
          </Field>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl border border-gray-100 px-3 py-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(event) => setForm((current) => ({ ...current, is_published: event.target.checked }))}
                className="h-4 w-4 accent-flame-500"
              />
              Published
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-gray-100 px-3 py-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.opens_new_tab}
                onChange={(event) => setForm((current) => ({ ...current, opens_new_tab: event.target.checked }))}
                className="h-4 w-4 accent-flame-500"
              />
              New tab
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <Field label="Destination Type">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {LINK_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, link_type: type.value, route_key: '', target_id: '', href: '' }))}
                  className={cn(
                    'min-h-16 rounded-xl border px-3 py-2 text-left transition-colors',
                    form.link_type === type.value
                      ? 'border-flame-200 bg-gradient-to-r from-gold-50 to-flame-50'
                      : 'border-gray-100 hover:border-flame-100 hover:bg-flame-50/40',
                  )}
                >
                  <span className="block text-sm font-semibold text-gray-900">{type.label}</span>
                  <span className="block truncate text-xs text-gray-500">{type.helper}</span>
                </button>
              ))}
            </div>
          </Field>

          <DestinationFields form={form} destinations={destinations} setForm={setForm} />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !form.label.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(190,140,46,0.2)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : saveLabel}
        </button>
      </div>
    </div>
  );
}

function StatusPill({ item }: { item: NavigationItem }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold',
        item.is_published ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
      )}
    >
      {item.is_published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      {item.is_published ? 'Published' : 'Draft'}
    </span>
  );
}

function DestinationFields({
  form,
  destinations,
  setForm,
}: {
  form: NavigationFormState;
  destinations: NavigationDestinations;
  setForm: React.Dispatch<React.SetStateAction<NavigationFormState>>;
}) {
  if (form.link_type === 'route') {
    return (
      <Field label="Page">
        <select
          value={form.route_key}
          onChange={(event) => setForm((current) => ({ ...current, route_key: event.target.value }))}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-flame-300"
        >
          <option value="">Custom route</option>
          {NAVIGATION_ROUTES.map((route) => (
            <option key={route.key} value={route.key}>
              {route.label}
            </option>
          ))}
        </select>
        {!form.route_key && (
          <input
            value={form.href}
            onChange={(event) => setForm((current) => ({ ...current, href: event.target.value }))}
            className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-flame-300"
            placeholder="/browse"
          />
        )}
      </Field>
    );
  }

  if (form.link_type === 'magazine') {
    return <DestinationSelect label="Magazine" value={form.target_id} options={destinations.magazines} onChange={(value) => setForm((current) => ({ ...current, target_id: value }))} />;
  }

  if (form.link_type === 'topic') {
    return (
      <Field label="Topic">
        <input
          value={form.target_id}
          list="navigation-topic-options"
          onChange={(event) => setForm((current) => ({ ...current, target_id: event.target.value }))}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-flame-300"
          placeholder="Surrender"
        />
        <datalist id="navigation-topic-options">
          {destinations.topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.label}
            </option>
          ))}
        </datalist>
      </Field>
    );
  }

  if (form.link_type === 'issue') {
    return <DestinationSelect label="Issue" value={form.target_id} options={destinations.issues} onChange={(value) => setForm((current) => ({ ...current, target_id: value }))} />;
  }

  if (form.link_type === 'feedback') {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
        {destinations.feedback ? (
          <>Uses Settings feedback URL: <span className="break-all font-medium text-gray-900">{destinations.feedback.href}</span></>
        ) : (
          'No feedback URL is configured yet. Add it in Site Settings.'
        )}
      </div>
    );
  }

  return (
    <Field label="External URL">
      <input
        value={form.href}
        onChange={(event) => setForm((current) => ({ ...current, href: event.target.value }))}
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-flame-300"
        placeholder="https://aurosociety.org"
      />
    </Field>
  );
}

function DestinationSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ id: string; label: string; helper?: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-flame-300"
      >
        <option value="">Choose {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}{option.helper ? ` - ${option.helper}` : ''}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-normal text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function IconButton({
  label,
  children,
  onClick,
  disabled,
  destructive,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        destructive ? 'text-red-500 hover:bg-red-50' : 'text-gray-500 hover:bg-white hover:text-flame-600',
      )}
    >
      {children}
    </button>
  );
}

function newForm(menuKey: NavigationMenuKey): NavigationFormState {
  return {
    id: null,
    menu_key: menuKey,
    label: '',
    link_type: 'route',
    route_key: '',
    target_id: '',
    href: '',
    is_published: true,
    opens_new_tab: false,
  };
}

function buildPayload(form: NavigationFormState, sortOrder: number, destinations: NavigationDestinations) {
  const href = form.link_type === 'feedback' ? destinations.feedback?.href ?? '' : form.href.trim();
  return {
    menu_key: form.menu_key,
    label: form.label.trim(),
    link_type: form.link_type,
    route_key: form.link_type === 'route' ? form.route_key || null : null,
    target_id: ['magazine', 'topic', 'issue'].includes(form.link_type) ? form.target_id || null : null,
    href,
    params: form.link_type === 'topic' ? { topic: form.target_id } : {},
    sort_order: sortOrder,
    is_published: form.is_published,
    opens_new_tab: form.opens_new_tab || form.link_type === 'external' || form.link_type === 'feedback',
  };
}

function previewNavigationHref(form: NavigationFormState, destinations: NavigationDestinations): string {
  if (form.link_type === 'route') return NAVIGATION_ROUTES.find((route) => route.key === form.route_key)?.href ?? (form.href.trim() || '/');
  if (form.link_type === 'magazine') return form.target_id ? `/browse?magazine=${encodeURIComponent(form.target_id)}` : '/browse';
  if (form.link_type === 'topic') return form.target_id ? `/browse?subject=${encodeURIComponent(form.target_id)}` : '/browse';
  if (form.link_type === 'issue') return form.target_id ? `/issue/${encodeURIComponent(form.target_id)}` : '/browse';
  if (form.link_type === 'feedback') return destinations.feedback?.href ?? '#feedback';
  return form.href.trim() || 'https://';
}

function linkTypeLabel(linkType: NavigationLinkType): string {
  return LINK_TYPES.find((type) => type.value === linkType)?.label ?? linkType;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || `Request failed with ${response.status}`;
  } catch {
    return `Request failed with ${response.status}`;
  }
}
