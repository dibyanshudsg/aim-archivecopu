import { listIndexingCatalogue } from '@/lib/db/indexing-workspace-repository';
import { IndexingWorkspace } from './workspace';
import { verifyAdmin } from '@/lib/admin-auth';
import { ReadOnlyOverview } from '../read-only-overview';

export const dynamic = 'force-dynamic';
export default async function IndexingPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const admin = await verifyAdmin();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const initial = await listIndexingCatalogue(admin && !admin.permissions.includes('indexing.manage') ? { page } : {});
  if (admin && !admin.permissions.includes('indexing.manage')) return <ReadOnlyOverview title="Search Indexing" description="Review indexing coverage and current status." count={initial.total} page={initial.page} pageSize={initial.pageSize} rows={initial.issues.map(issue => ({ id: issue.id, title: issue.title, subtitle: `${issue.year} · ${issue.month}`, status: issue.status }))} />;
  return <IndexingWorkspace initial={initial} />;
}
