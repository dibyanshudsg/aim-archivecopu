import { NextRequest, NextResponse } from 'next/server';
import { embargoLiftLabel, isEmbargoed } from '@/lib/embargo';
import { getPublicIssueDownloadTarget, incrementIssueDownloadCount } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const issue = await getPublicIssueDownloadTarget(id);
  if (!issue?.pdf_url) {
    return NextResponse.json({ error: 'Issue not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  if (isEmbargoed(issue.year, issue.month)) {
    return NextResponse.json(
      {
        error: 'Issue not yet available',
        code: 'EMBARGOED',
        available_on: embargoLiftLabel(issue.year, issue.month),
      },
      { status: 403 },
    );
  }

  try {
    await incrementIssueDownloadCount(id);
  } catch (incrementError) {
    console.error('Failed to increment download count:', incrementError);
  }

  return NextResponse.redirect(issue.pdf_url);
}
