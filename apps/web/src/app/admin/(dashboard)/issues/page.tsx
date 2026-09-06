import { AdminIssuesClient } from './issues-client';
import { listAdminIssuesPage, listAdminMagazines } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

export default async function AdminIssuesPage() {
  const [initialIssueResult, magazines] = await Promise.all([
    listAdminIssuesPage({
      page: 1,
      pageSize: 25,
      q: '',
      magazineId: 'all',
      year: 'all',
      status: 'all',
      topic: 'all',
      sort: 'created_at',
      dir: 'desc',
    }),
    listAdminMagazines(),
  ]);

  const initialMagazines = magazines.map((magazine) => ({
    id: magazine.id,
    name: magazine.name,
  }));

  return <AdminIssuesClient initialIssueResult={initialIssueResult} initialMagazines={initialMagazines} />;
}
