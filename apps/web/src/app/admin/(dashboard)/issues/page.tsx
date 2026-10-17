import { AdminIssuesClient } from './issues-client';
import { listAdminIssuesPage, listAdminMagazines } from '@/lib/admin-data';
import { verifyAdmin } from '@/lib/admin-auth';
import { ReadOnlyOverview } from '../read-only-overview';

export const dynamic = 'force-dynamic';

export default async function AdminIssuesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const admin = await verifyAdmin();
  const requestedPage = Math.max(1, Number((await searchParams).page) || 1);
  const [initialIssueResult, magazines] = await Promise.all([
    listAdminIssuesPage({
      page: admin && !admin.permissions.includes('catalogue.edit') ? requestedPage : 1,
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
  if (admin && !admin.permissions.includes('catalogue.edit')) return <ReadOnlyOverview title="Issues" description="Review the latest catalogue issues." count={initialIssueResult.total} page={initialIssueResult.page} pageSize={initialIssueResult.pageSize} rows={initialIssueResult.data.map(item => ({ id: item.id, title: item.title, subtitle: item.magazines.name, status: item.is_published ? 'Published' : 'Draft', href: item.is_published ? `/issue/${item.id}` : undefined }))} />;

  return <AdminIssuesClient initialIssueResult={initialIssueResult} initialMagazines={initialMagazines} />;
}
