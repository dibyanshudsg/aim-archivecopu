import { notFound } from 'next/navigation';
import { verifyAdmin } from '@/lib/admin-auth';
import { AdminProfileClient } from './profile-client';

export const dynamic = 'force-dynamic';

export default async function AdminAccountPage() {
  const admin = await verifyAdmin();
  if (!admin) notFound();
  return <AdminProfileClient account={{
    name: admin.name,
    email: admin.email,
    roleName: admin.roleName,
    isActive: admin.isActive,
    permissions: [...admin.permissions],
  }} />;
}
