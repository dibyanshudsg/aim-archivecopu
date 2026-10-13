import type { Metadata } from 'next';
import { getPublicIssueMetadataById } from '@/lib/db';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const issue = await getPublicIssueMetadataById(id);
  if (!issue) return { title: 'Issue Not Found' };

  return {
    title: issue.title,
    description:
      issue.description ||
      `Read ${issue.title} from ${issue.magazineName}. Part of the AIM Archive - Sri Aurobindo Society's digital magazine collection.`,
    openGraph: {
      title: `${issue.title} | AIM Archive`,
      description:
        issue.description ||
        `${issue.magazineName} - ${issue.title}. Free to read online.`,
      type: 'article',
    },
    alternates: { canonical: `/issue/${id}` },
  };
}

export default function IssueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
