import { AdminIssuesClient } from './issues-client';
import { listAdminIssues, listAdminMagazines } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

export default async function AdminIssuesPage() {
  const [initialIssues, magazines] = await Promise.all([
    listAdminIssues(),
    listAdminMagazines(),
  ]);

  const initialMagazines = magazines.map((magazine) => ({
    id: magazine.id,
    name: magazine.name,
  }));

  return <AdminIssuesClient initialIssues={initialIssues} initialMagazines={initialMagazines} />;
}
