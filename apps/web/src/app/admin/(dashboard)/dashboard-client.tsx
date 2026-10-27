'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookCopy, FileText, Eye, EyeOff, Download, TrendingUp, Settings, Navigation, CalendarDays, AlertTriangle, BookOpen, RotateCcw, SearchCheck } from 'lucide-react';
import type { AdminStats } from '@/lib/admin-data';
import type { HeroIssue, HeroMagazine, HeroSelection, NextHeroChoice } from '@/lib/hero-issues';
import { MONTH_NAMES } from '@aim-archive/shared';
import { AdminPageTitle } from './admin-page-title';
import { AdminDialog } from './admin-dialog';
import { AdminOptionMenu } from './admin-option-menu';

type IndexingCounts = { missing: number; failed: number; review: number; unverified: number };

export function AdminDashboardClient({ initialStats, initialHero, indexingCounts, canManageHero }: { initialStats: AdminStats; initialHero: HeroMagazine[]; indexingCounts: IndexingCounts | null; canManageHero: boolean }) {
  const [stats] = useState<AdminStats | null>(initialStats);
  const [hero, setHero] = useState(initialHero);
  const [heroError, setHeroError] = useState('');
  const [heroSaving, setHeroSaving] = useState<string | null>(null);
  const [hideTarget, setHideTarget] = useState<{ magazineId: string; issueId: string; title: string; replacement: HeroIssue | null } | null>(null);

  async function changeHero(action: 'hide' | 'show' | 'select' | 'schedule', magazineId: string, issueId?: string, selection?: HeroSelection, nextChoice?: NextHeroChoice) {
    setHeroSaving(magazineId);
    setHeroError('');
    try {
      const response = await fetch('/api/admin/hero', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, magazineId, issueId, selection, nextChoice }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update the hero');
      setHero(data);
      return true;
    } catch (error) { setHeroError(error instanceof Error ? error.message : 'Could not update the hero'); return false; }
    finally { setHeroSaving(null); }
  }

  async function confirmHide() {
    if (!hideTarget) return;
    if (await changeHero('hide', hideTarget.magazineId, hideTarget.issueId)) setHideTarget(null);
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <AdminPageTitle title="Dashboard" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-6">
              <div className="h-4 w-20 rounded bg-gray-100" />
              <div className="mt-3 h-8 w-16 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <AdminPageTitle title="Dashboard" />
        <Link
          href="/admin/issues/new"
          className="rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600"
        >
          + Upload Issue
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={BookCopy} label="Magazines" value={stats.totalMagazines} />
        <StatCard icon={FileText} label="Issues" value={stats.totalIssues} />
        <StatCard icon={Eye} label="Total Reads" value={stats.totalReads} />
        <StatCard icon={Download} label="Downloads" value={stats.totalDownloads} />
        {indexingCounts && <Link href="/admin/indexing" className="rounded-2xl border border-gray-100 bg-white p-6 transition-colors hover:border-flame-200 hover:bg-flame-50/30 focus-visible:outline-2 focus-visible:outline-flame-600"><div className="flex items-center gap-3"><span className="rounded-xl bg-flame-50 p-2.5 text-flame-600"><SearchCheck className="h-5 w-5" /></span><span className="text-sm font-medium text-gray-500">Search indexing</span></div><p className="font-heading mt-3 text-3xl font-bold text-gray-900">{Object.values(indexingCounts).reduce((sum, count) => sum + count, 0).toLocaleString()}</p><p className="mt-2 text-xs leading-5 text-gray-600">{indexingCounts.missing} missing · {indexingCounts.failed} failed<br />{indexingCounts.review} page review · {indexingCounts.unverified} unverified</p></Link>}
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-6" aria-labelledby="hero-schedule-title">
        <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-flame-600" /><h2 id="hero-schedule-title" className="text-lg font-semibold text-gray-900">Home hero schedule</h2></div>
        <p className="mb-5 text-sm text-gray-600">Uploaded issues appear publicly at 00:00 India time on the first of their issue month. A hidden issue stays hidden until restored.</p>
        {heroError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{heroError}</p>}
        <div className="grid gap-4 xl:grid-cols-2">
          {hero.map((magazine) => <article key={magazine.id} className="flex min-w-0 flex-col rounded-2xl border border-gray-200 bg-gray-50/40 p-4 sm:p-5">
            <h3 className="font-heading text-base font-semibold text-gray-900">{magazine.name}</h3>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Live in the hero</p>
              <HeroIssueCard issue={magazine.live} empty="No issue selected" />
              {(magazine.current_override || magazine.selection !== 'automatic') && <p className="mt-2 text-xs font-medium text-flame-700">{magazine.current_override ? 'Showing this month’s scheduled choice' : magazine.selection === 'previous' ? 'Showing previous issue' : 'Showing archive issue'}</p>}
            </div>
            {canManageHero && <div className="mt-3 flex flex-wrap gap-2">
              {magazine.live && <button type="button" disabled={heroSaving === magazine.id} onClick={() => { setHeroError(''); setHideTarget({ magazineId: magazine.id, issueId: magazine.live!.id, title: magazine.live!.title, replacement: magazine.hide_fallback }); }} className="inline-flex min-h-9 w-40 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"><EyeOff className="h-4 w-4" aria-hidden="true" />Hide this issue</button>}
              {magazine.hidden.length > 0 && <div className="w-40 max-w-full"><AdminOptionMenu icon={RotateCcw} label="Restore issue" title={`Restore an issue · ${magazine.name}`} description="Choose a hidden issue to make it available again." value="" options={magazine.hidden.map((issue) => ({ value: issue.id, label: issue.title, helper: 'Hidden from the home hero' }))} disabled={heroSaving === magazine.id} onChange={(issueId) => { void changeHero('show', magazine.id, issueId); }} align="end" compact /></div>}
            </div>}
            {canManageHero && <div className="mt-5 border-t border-gray-200 pt-4">
              <AdminOptionMenu icon={BookOpen} label="Feature another issue" title={`Feature an issue · ${magazine.name}`} description="Choose which issue appears in the home hero." value={magazine.selection} options={[
                { value: 'automatic', label: 'Automatic', helper: magazine.automatic_pick?.title ?? 'No issue available' },
                { value: 'previous', label: 'Previous issue', helper: magazine.previous_pick?.title ?? 'Not available', disabled: !magazine.previous_pick },
                { value: 'archive', label: 'Archive (5+ years old)', helper: magazine.archive_pick?.title ?? 'Not available', disabled: !magazine.archive_pick },
              ]} disabled={heroSaving === magazine.id} onChange={(value) => { void changeHero('select', magazine.id, undefined, value as HeroSelection); }} />
              {magazine.archive_pick && magazine.selection !== 'archive' && magazine.archive_pick.id !== magazine.live?.id && <button type="button" disabled={heroSaving === magazine.id} onClick={() => changeHero('select', magazine.id, undefined, 'archive')} className="mt-2 inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg border border-flame-200 bg-flame-50 px-3 py-1.5 text-left text-xs font-semibold text-flame-800 transition-colors hover:border-flame-300 hover:bg-flame-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-600 disabled:opacity-50"><BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="truncate">Feature archive: {magazine.archive_pick.title}</span></button>}
            </div>}
            <div className="mt-5 border-t border-gray-200 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Coming next month</p>
              {magazine.next ? <><HeroIssueCard issue={magazine.next} empty="No issue uploaded" /><p className="mt-2 text-xs text-gray-500">{magazine.next_choice_unavailable ? 'The selected issue is unavailable; the automatic choice will be used.' : !magazine.next.is_published ? 'Draft — publish it before release' : magazine.next_choice === 'keep' ? 'The same issue will remain in the hero next month.' : magazine.next_choice === 'previous_year' ? 'Previous-year issue selected for next month.' : magazine.selection === 'archive' && magazine.next_choice === 'automatic' ? 'An available archive issue will appear automatically next month.' : 'Ready for the next monthly release.'}</p></> : <p role="status" className="mt-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" />{magazine.selection === 'archive' ? 'No archive issue available for next month' : 'No issue uploaded for next month'}</p>}
              {canManageHero && <div className="mt-3">
                <AdminOptionMenu icon={CalendarDays} label="Next month’s issue" title={`Choose next month’s issue · ${magazine.name}`} description="Select the issue to show when next month begins." value={magazine.next_choice} options={[
                  { value: 'automatic', label: 'Automatic', helper: magazine.next_default?.title ?? 'No issue available' },
                  { value: 'current_year', label: 'This year’s next month', helper: magazine.next_current_year?.title ?? 'Not uploaded', disabled: !magazine.next_current_year },
                  { value: 'previous_year', label: 'Previous year’s next month', helper: magazine.next_previous_year?.title ?? 'Not available', disabled: !magazine.next_previous_year },
                  { value: 'keep', label: 'Keep current hero', helper: magazine.next_keep?.title ?? 'No issue selected', disabled: !magazine.next_keep },
                ]} disabled={heroSaving === magazine.id} onChange={(value) => { void changeHero('schedule', magazine.id, undefined, undefined, value as NextHeroChoice); }} />
              </div>}
            </div>
          </article>)}
        </div>
      </section>

      {hideTarget && <AdminDialog label="Confirm hiding the hero issue" busy={heroSaving === hideTarget.magazineId} onClose={() => { setHideTarget(null); setHeroError(''); }}>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><EyeOff className="h-6 w-6" aria-hidden="true" /></span>
        <h2 className="font-heading mt-5 pr-8 text-xl font-semibold text-gray-900">Hide this issue from the home hero?</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600"><strong className="font-semibold text-gray-900">{hideTarget.title}</strong> will stop appearing in its hero position until you restore it.</p>
        <div className="mt-5 rounded-xl border border-flame-200 bg-flame-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-flame-700">What visitors will see instead</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{hideTarget.replacement?.title ?? 'No issue will appear for this magazine'}</p>
          <p className="mt-1 text-xs text-gray-600">{hideTarget.replacement ? 'The next available issue will take this place automatically.' : 'You can restore this issue later from the dashboard.'}</p>
        </div>
        {heroError && <p role="alert" className="mt-4 text-sm text-red-700">{heroError}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" disabled={heroSaving === hideTarget.magazineId} onClick={() => { setHideTarget(null); setHeroError(''); }} className="min-h-10 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Keep issue visible</button>
          <button type="button" disabled={heroSaving === hideTarget.magazineId} onClick={confirmHide} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"><EyeOff className="h-4 w-4" aria-hidden="true" />{heroSaving === hideTarget.magazineId ? 'Hiding…' : 'Hide issue'}</button>
        </div>
      </AdminDialog>}

      {/* Popular Issues */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-flame-500" />
          <h2 className="text-lg font-semibold text-gray-900">Most Popular Issues</h2>
        </div>

        {stats.popularIssues.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {stats.popularIssues.map((issue, i) => (
              <div key={issue.id} className="flex items-center gap-4 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-r from-gold-100 to-flame-100 text-xs font-bold text-flame-700">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{issue.title}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{issue.read_count} reads</span>
                  <span>{issue.download_count} downloads</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No data yet</p>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/admin/magazines"
          className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-flame-200 hover:shadow-sm"
        >
          <BookCopy className="h-8 w-8 text-flame-500" />
          <h3 className="mt-3 font-semibold text-gray-900">Manage Magazines</h3>
          <p className="mt-1 text-sm text-gray-500">Add, edit, or remove magazine editions</p>
        </Link>
        <Link
          href="/admin/issues"
          className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-flame-200 hover:shadow-sm"
        >
          <FileText className="h-8 w-8 text-flame-500" />
          <h3 className="mt-3 font-semibold text-gray-900">Manage Issues</h3>
          <p className="mt-1 text-sm text-gray-500">Upload PDFs, edit metadata, manage issues</p>
        </Link>
        <Link
          href="/admin/settings"
          className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-flame-200 hover:shadow-sm"
        >
          <Settings className="h-8 w-8 text-flame-500" />
          <h3 className="mt-3 font-semibold text-gray-900">Site Settings</h3>
          <p className="mt-1 text-sm text-gray-500">Manage footer feedback and public links</p>
        </Link>
        <Link
          href="/admin/navigation"
          className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-flame-200 hover:shadow-sm"
        >
          <Navigation className="h-8 w-8 text-flame-500" />
          <h3 className="mt-3 font-semibold text-gray-900">Navigation</h3>
          <p className="mt-1 text-sm text-gray-500">Manage header, mobile, and footer links</p>
        </Link>
      </div>
    </div>
  );
}

function HeroIssueCard({ issue, empty }: { issue: HeroIssue | null; empty: string }) {
  if (!issue) return <div className="mt-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">{empty}</div>;
  return <div className="mt-2 flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 bg-white p-2.5">
    <div className="relative h-24 w-[4.5rem] shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50 shadow-sm">
      {issue.cover_image_url ? <Image src={`/api/admin/issues/${issue.id}/cover`} alt={`${issue.title} cover`} fill unoptimized sizes="72px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-gray-300"><BookOpen className="h-7 w-7" aria-hidden="true" /></div>}
    </div>
    <div className="min-w-0"><p className="text-sm font-semibold leading-5 text-gray-900">{issue.title}</p><p className="mt-1 text-xs text-gray-500">{MONTH_NAMES[issue.month as keyof typeof MONTH_NAMES]} {issue.year}</p></div>
  </div>;
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-50 to-flame-50">
          <Icon className="h-5 w-5 text-flame-600" />
        </div>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className="font-heading mt-3 text-3xl font-bold text-gray-900">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
