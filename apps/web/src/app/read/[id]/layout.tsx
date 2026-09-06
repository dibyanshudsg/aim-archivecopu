import { getPublicIssueById } from '@/lib/db';
import { ReaderIssueProvider } from './reader-issue-context';

// Issue metadata changes infrequently. Including it in the route payload lets
// the reader request its cover, worker, and PDF as soon as navigation finishes
// instead of waiting for a second client-side API waterfall.
export const revalidate = 60;

export default async function ReaderLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const issue = await getPublicIssueById(id);

  return <ReaderIssueProvider issue={issue}>{children}</ReaderIssueProvider>;
}
