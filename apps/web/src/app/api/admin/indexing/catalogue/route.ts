import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure } from '@/lib/admin-request';
import {
  listIndexingCatalogue,
  queueWorkspaceIssues,
  listIndexingHistory,
  getIndexingIssueDetails,
} from '@/lib/db/indexing-workspace-repository';
import { z } from 'zod';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit, adminReadRateLimit } from '@/lib/rate-limit';

export const runtime='nodejs';
export const maxDuration=60;

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin('indexing.view');
  if (!admin) return await adminAccessFailure();
  const limited = await adminReadRateLimit(request, admin.id);
  if (limited) return limited;
  const params = request.nextUrl.searchParams;
  try {
    const result = params.has('issue')
      ? await getIndexingIssueDetails(params.get('issue')!)
      : params.get('view') === 'history'
        ? await listIndexingHistory(Number(params.get('page')) || 1)
        : await listIndexingCatalogue({
            q: params.get('q') ?? '',
            status: params.get('status') ?? 'attention',
            magazine: params.get('magazine') ?? 'all',
            year: params.get('year') ?? 'all',
            publication: params.get('publication') ?? 'all',
            page: Number(params.get('page')) || 1,
          });
    return NextResponse.json(result ?? { error: 'Issue not found' }, {
      status: result ? 200 : 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not load indexing data. Refresh to try again.' },
      { status: 503 },
    );
  }
}
const bodySchema = z.object({
  action: z.enum(['missing', 'retry', 'selected']),
  ids: z.array(z.string().min(1).max(100)).max(100).optional(),
  rebuild: z.boolean().optional(),
});
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin('indexing.manage');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id, 'indexing');
  if (limited) return limited;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Choose a valid action and at most 100 issues.' },
      { status: 400 },
    );
  try {
    const result = await queueWorkspaceIssues(parsed.data);
    await auditAdmin(admin.id, 'indexing.queued', undefined, JSON.stringify({ action: parsed.data.action, count: parsed.data.ids?.length ?? null }));
    return NextResponse.json(result, { status: 202 });
  } catch {
    return NextResponse.json(
      { error: 'Could not queue this batch. Refresh before retrying.' },
      { status: 503 },
    );
  }
}
