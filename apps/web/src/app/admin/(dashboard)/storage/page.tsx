import { StorageClient } from './storage-client';
import { getAdminStorageData } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

export default async function StoragePage() {
  try {
    const initialData = await getAdminStorageData();
    return <StorageClient initialData={initialData} />;
  } catch (error) {
    const initialError = error instanceof Error ? error.message : 'Failed to load storage data';
    return <StorageClient initialData={null} initialError={initialError} />;
  }
}
