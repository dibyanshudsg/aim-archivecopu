import { notFound } from 'next/navigation';
import { verifyAdmin } from '@/lib/admin-auth';

export default async function ProtectedSectionLayout({ children }: { children: React.ReactNode }) {
  if (!await verifyAdmin('storage.view')) notFound();
  return children;
}
