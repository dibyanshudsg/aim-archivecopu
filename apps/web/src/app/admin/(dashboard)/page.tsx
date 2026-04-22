'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookCopy, FileText, Eye, Download, TrendingUp } from 'lucide-react';

interface Stats {
  totalMagazines: number;
  totalIssues: number;
  totalReads: number;
  totalDownloads: number;
  popularIssues: { id: string; title: string; read_count: number; download_count: number }[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-bold text-gray-900">Dashboard</h1>
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
        <h1 className="font-heading text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          href="/admin/issues/new"
          className="rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-600"
        >
          + Upload Issue
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookCopy} label="Magazines" value={stats.totalMagazines} />
        <StatCard icon={FileText} label="Issues" value={stats.totalIssues} />
        <StatCard icon={Eye} label="Total Reads" value={stats.totalReads} />
        <StatCard icon={Download} label="Downloads" value={stats.totalDownloads} />
      </div>

      {/* Popular Issues */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-gold-500" />
          <h2 className="text-lg font-semibold text-gray-900">Most Popular Issues</h2>
        </div>

        {stats.popularIssues.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {stats.popularIssues.map((issue, i) => (
              <div key={issue.id} className="flex items-center gap-4 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-50 text-xs font-bold text-gold-600">
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/magazines"
          className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-gold-200 hover:shadow-sm"
        >
          <BookCopy className="h-8 w-8 text-gold-500" />
          <h3 className="mt-3 font-semibold text-gray-900">Manage Magazines</h3>
          <p className="mt-1 text-sm text-gray-500">Add, edit, or remove magazine editions</p>
        </Link>
        <Link
          href="/admin/issues"
          className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-gold-200 hover:shadow-sm"
        >
          <FileText className="h-8 w-8 text-gold-500" />
          <h3 className="mt-3 font-semibold text-gray-900">Manage Issues</h3>
          <p className="mt-1 text-sm text-gray-500">Upload PDFs, edit metadata, manage issues</p>
        </Link>
      </div>
    </div>
  );
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-50">
          <Icon className="h-5 w-5 text-gold-600" />
        </div>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className="font-heading mt-3 text-3xl font-bold text-gray-900">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
