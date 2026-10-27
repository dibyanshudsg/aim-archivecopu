import { AdminDashboardClient } from './dashboard-client';
import { getAdminStats } from '@/lib/admin-data';
import { getAdminForPage } from './admin-page-auth';
import { notFound } from 'next/navigation';
import { getHeroSchedule } from '@/lib/hero-issues';
import { getIndexingAttentionCounts } from '@/lib/db/indexing-workspace-repository';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const admin = await getAdminForPage();
  if (!admin || !admin.permissions.includes('dashboard.view')) notFound();
  const [initialStats, initialHero, indexingCounts] = await Promise.all([getAdminStats(), getHeroSchedule(), admin.permissions.includes('indexing.view') ? getIndexingAttentionCounts() : Promise.resolve(null)]);
  return <AdminDashboardClient initialStats={initialStats} initialHero={initialHero} indexingCounts={indexingCounts} canManageHero={admin.permissions.includes('catalogue.publish')} />;
}
