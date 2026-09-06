import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { getPublicIssueById, getPublicNavigationFromDb, listRelatedReadableIssues } from '@/lib/db';
import type { ApiIssue } from '@/lib/api';
import { IssueDetailClient } from './issue-detail-client';

// Per-id ISR: each issue's HTML is edge-cached for a minute, so back-button
// navigation from the reader is near-instant on repeat visits while still
// picking up edits within ~60 s.
export const revalidate = 60;

async function fetchIssueServer(id: string): Promise<ApiIssue | null> {
  return getPublicIssueById(id);
}

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [issue, navigation] = await Promise.all([
    fetchIssueServer(id),
    getPublicNavigationFromDb(),
  ]);

  if (!issue) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header navigation={navigation} />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="font-heading text-2xl font-bold text-gray-900">Issue not found</h1>
            <Link href="/browse" className="mt-4 inline-block bg-gradient-to-r from-gold-600 to-flame-500 bg-clip-text text-transparent">
              Back to Browse
            </Link>
          </div>
        </main>
        <Footer navigation={navigation} />
      </div>
    );
  }

  const relatedIssues = await listRelatedReadableIssues(issue);
  return <IssueDetailClient initialIssue={issue} navigation={navigation} relatedIssues={relatedIssues} />;
}
