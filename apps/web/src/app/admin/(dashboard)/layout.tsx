import { redirect } from 'next/navigation';
import { verifyAdmin } from '@/lib/admin-auth';
import { AdminDashboardShell } from './admin-shell';
import { publicAdmin } from '@/lib/db/admin-accounts';

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await verifyAdmin();
  if (!admin) redirect('/admin/login');
  if (admin.mustChangePassword) redirect('/admin/password');

  return <AdminDashboardShell admin={publicAdmin(admin)}>{children}</AdminDashboardShell>;
}
