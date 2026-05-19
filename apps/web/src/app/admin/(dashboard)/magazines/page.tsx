import { AdminMagazinesClient } from './magazines-client';
import { listAdminMagazines } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

export default async function AdminMagazinesPage() {
  const initialMagazines = await listAdminMagazines();
  return <AdminMagazinesClient initialMagazines={initialMagazines} />;
}
