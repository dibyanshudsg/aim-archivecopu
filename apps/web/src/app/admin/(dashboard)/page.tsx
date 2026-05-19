import { AdminDashboardClient } from './dashboard-client';
import { getAdminStats } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const initialStats = await getAdminStats();
  return <AdminDashboardClient initialStats={initialStats} />;
}
