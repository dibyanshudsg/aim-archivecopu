import { AdminMagazinesClient } from './magazines-client';
import { listAdminMagazines } from '@/lib/admin-data';
import { verifyAdmin } from '@/lib/admin-auth';
import { ReadOnlyOverview } from '../read-only-overview';

export const dynamic = 'force-dynamic';

export default async function AdminMagazinesPage() {
  const initialMagazines = await listAdminMagazines();
  const admin = await verifyAdmin();
  if (admin && !admin.permissions.includes('catalogue.edit')) return <ReadOnlyOverview title="Magazines" description="Browse the magazine catalogue." rows={initialMagazines.map(item => ({ id: item.id, title: item.name, subtitle: item.description, status: item.language }))} />;
  return <AdminMagazinesClient initialMagazines={initialMagazines} />;
}
