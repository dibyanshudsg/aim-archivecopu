import { notFound } from 'next/navigation';
import { verifyAdmin } from '@/lib/admin-auth';

export default async function ProtectedSectionLayout({ children }: { children: React.ReactNode }) {
  if (!await verifyAdmin('settings.view')) notFound();
  return children;
}
