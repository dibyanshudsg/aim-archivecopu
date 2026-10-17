import { notFound } from 'next/navigation';
import { verifyAdmin } from '@/lib/admin-auth';
import { listAdminAccounts, listAdminRoles, publicAdmin } from '@/lib/db/admin-accounts';
import { AdminUsersClient } from './users-client';

export const dynamic = 'force-dynamic';
export default async function AdminUsersPage() {
  const admin = await verifyAdmin('users.manage');
  if (!admin) notFound();
  const [accounts, roles] = await Promise.all([listAdminAccounts(), listAdminRoles()]);
  return <AdminUsersClient currentId={admin.id} initialUsers={accounts.map(publicAdmin)} roles={roles} />;
}
