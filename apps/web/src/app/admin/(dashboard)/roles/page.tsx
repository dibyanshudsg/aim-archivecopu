import { notFound } from 'next/navigation';
import { verifyAdmin } from '@/lib/admin-auth';
import { listAdminRoles } from '@/lib/db/admin-accounts';
import { AdminRolesClient } from './roles-client';

export const dynamic = 'force-dynamic';
export default async function AdminRolesPage() {
  if (!await verifyAdmin('roles.manage')) notFound();
  return <AdminRolesClient initialRoles={await listAdminRoles()} />;
}
