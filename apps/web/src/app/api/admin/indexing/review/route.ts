import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure } from '@/lib/admin-request';
import { resolvePageReview } from '@/lib/db/indexing-page-reviews';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit } from '@/lib/rate-limit';
import { boundedJson } from '@/lib/request-body';

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
  const admin = await verifyAdmin('indexing.manage');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id, 'review');
  if (limited) return limited;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return NextResponse.json({ error: 'Open the review from this website.' }, { status: 403 });
  const body = await boundedJson(request, 32 * 1024);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.value);
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Enter a valid page decision and review note.' },
      { status: 400 },
    );
  try {
    await resolvePageReview(parsed.data, admin.id);
    await auditAdmin(admin.id, 'indexing.reviewed', parsed.data.issueId, `Page ${parsed.data.page}: ${parsed.data.decision}`);
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ error: 'Could not save the review. Refresh before retrying.' }, { status: 409 });
  }
}
