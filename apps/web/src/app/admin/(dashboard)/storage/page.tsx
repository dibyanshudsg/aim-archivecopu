import { StorageClient } from './storage-client';
import { getAdminStorageData } from '@/lib/admin-data';
import { verifyAdmin } from '@/lib/admin-auth';
import { ReadOnlyOverview } from '../read-only-overview';

export const dynamic = 'force-dynamic';

export default async function StoragePage() {
  try {
    const initialData = await getAdminStorageData();
    const admin = await verifyAdmin();
    if (admin && !admin.permissions.includes('storage.manage')) return <ReadOnlyOverview title="Storage" description="Review stored files and their linked issues." count={initialData.r2.objectCount} rows={initialData.r2.objects.slice(0, 100).map(item => ({ id: item.key, title: item.key, subtitle: item.linkedIssue?.title ?? 'No linked issue', status: `${(item.size / 1024 / 1024).toFixed(1)} MB` }))} />;
    return <StorageClient initialData={initialData} />;
  } catch (error) {
    console.error('Storage inventory failed:', error);
    const initialError = 'Storage inventory is unavailable. Check the R2 connection and refresh this page.';
    const admin = await verifyAdmin();
    if (admin && !admin.permissions.includes('storage.manage')) return <ReadOnlyOverview title="Storage" description="Storage data is temporarily unavailable. Refresh to try again." rows={[]} />;
    return <StorageClient initialData={null} initialError={initialError} />;
  }
}
