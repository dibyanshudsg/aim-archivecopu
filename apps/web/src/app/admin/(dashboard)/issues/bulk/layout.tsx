import { notFound } from 'next/navigation';
import { verifyAdmin } from '@/lib/admin-auth';

export default async function BulkIssueLayout({ children }: { children: React.ReactNode }) {
  const admin = await verifyAdmin('catalogue.edit');
  if (!admin || !admin.permissions.includes('catalogue.publish')) notFound();
  return children;
}
