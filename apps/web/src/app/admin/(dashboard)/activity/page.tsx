import { notFound } from 'next/navigation';
import { verifyAdmin } from '@/lib/admin-auth';
import { listAdminActivity, listAdminAccounts } from '@/lib/db/admin-accounts';
import { ActivityClient } from './activity-client';

export const dynamic = 'force-dynamic';

export default async function AdminActivityPage() {
  if (!(await verifyAdmin('audit.view'))) notFound();
  const [initial, accounts] = await Promise.all([listAdminActivity({ page: 1 }), listAdminAccounts()]);
  return <ActivityClient initial={initial} actors={accounts.map(account => ({ id: account.id, name: account.name }))} />;
}
