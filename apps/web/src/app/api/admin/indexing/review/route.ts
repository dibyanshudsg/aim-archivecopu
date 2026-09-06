import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdmin } from '@/lib/admin-auth';
import { resolvePageReview } from '@/lib/db/indexing-page-reviews';

const schema = z.object({
  issueId: z.string().min(1).max(100),
  page: z.number().int().positive(),
  sourceHash: z.string().min(1).max(128),
  pdfUrl: z.string().url().max(2000),
  decision: z.enum(['transcribe', 'exclude']),
  content: z.string().max(20000),
  note: z.string().trim().min(1).max(1000),
});
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return NextResponse.json({ error: 'Open the review from this website.' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Enter a valid page decision and review note.' },
      { status: 400 },
    );
  try {
    await resolvePageReview(parsed.data, admin.id);
    return NextResponse.json({ saved: true });
  } catch (error) {
    const message =
      error instanceof Error && /Refresh|Enter verified|short note/.test(error.message)
        ? error.message
        : 'Could not save the review. Refresh before retrying.';
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
