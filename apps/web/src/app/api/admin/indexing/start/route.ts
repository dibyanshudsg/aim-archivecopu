import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure } from '@/lib/admin-request';
import { getDispatchState, startIndexing, releaseUnconfirmedStart } from '@/lib/indexing-dispatch';
import { z } from 'zod';
import { beginAdminOperation, settleAdminOperation } from '@/lib/db/admin-accounts';
import { adminMutationRateLimit, adminReadRateLimit } from '@/lib/rate-limit';
import { boundedJson } from '@/lib/request-body';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin('indexing.view');
  if (!admin) return await adminAccessFailure();
  const limited = await adminReadRateLimit(request, admin.id);
  if (limited) return limited;
  try {
    return NextResponse.json(
      await getDispatchState(request.nextUrl.searchParams.get('refresh') === '1'),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'Could not check the indexing worker. Refresh to retry.' },
      { status: 503 },
    );
  }
}
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin('indexing.manage');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id, 'indexing');
  if (limited) return limited;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return NextResponse.json({ error: 'Start indexing from this website.' }, { status: 403 });
  const body = await boundedJson(request, 1024);
  if (!body.ok) return body.response;
  const input = body.value;
  const parsed = z
    .object({ action: z.enum(['start', 'release']).optional() })
    .strict()
    .safeParse(input);
  if (!parsed.success)
    return NextResponse.json({ error: 'Choose a valid indexing action.' }, { status: 400 });
  const action = parsed.data.action === 'release' ? 'indexing.released' : 'indexing.started';
  const operation = await beginAdminOperation(admin.id, action);
  try {
    const result = parsed.data.action === 'release' ? await releaseUnconfirmedStart() : await startIndexing(admin.id);
    await settleAdminOperation(operation, action, true);
    return NextResponse.json(result, { status: 202 });
  } catch {
    await settleAdminOperation(operation, action, false);
    return NextResponse.json({ error: 'Could not start indexing. Refresh before retrying.' }, { status: 409 });
  }
}
