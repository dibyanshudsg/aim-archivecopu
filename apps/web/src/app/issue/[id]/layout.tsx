import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = getClient();

  const { data: issue } = await supabase
    .from('issues')
    .select('title, description, year, month, magazines!inner(name)')
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (!issue) {
    return { title: 'Issue Not Found' };
  }

  const magazines = issue.magazines as unknown as { name: string };
  const magazineName = magazines.name;

  return {
    title: issue.title,
    description:
      issue.description ||
      `Read ${issue.title} from ${magazineName}. Part of the AIM Archive — Sri Aurobindo Society's digital magazine collection.`,
    openGraph: {
      title: `${issue.title} | AIM Archive`,
      description:
        issue.description ||
        `${magazineName} — ${issue.title}. Free to read online.`,
      type: 'article',
    },
    alternates: { canonical: `/issue/${id}` },
  };
}

export default function IssueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
