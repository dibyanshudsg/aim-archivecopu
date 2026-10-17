import { AdminDashboardClient } from './dashboard-client';
import { getAdminStats } from '@/lib/admin-data';
import { verifyAdmin } from '@/lib/admin-auth';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  if (!await verifyAdmin('dashboard.view')) notFound();
  const initialStats = await getAdminStats();
  return <AdminDashboardClient initialStats={initialStats} />;
}
