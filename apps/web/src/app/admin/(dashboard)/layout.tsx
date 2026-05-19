import { redirect } from 'next/navigation';
import { verifyAdmin } from '@/lib/admin-auth';
import { AdminDashboardShell } from './admin-shell';

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await verifyAdmin();
  if (!admin) redirect('/admin/login');

  return <AdminDashboardShell admin={admin}>{children}</AdminDashboardShell>;
}
