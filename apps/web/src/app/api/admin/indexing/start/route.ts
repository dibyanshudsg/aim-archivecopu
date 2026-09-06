import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { getDispatchState, startIndexing, releaseUnconfirmedStart } from '@/lib/indexing-dispatch';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return NextResponse.json({ error: 'Start indexing from this website.' }, { status: 403 });
  const raw = await request.text();
  let input: unknown;
  try {
    input = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ error: 'Choose a valid indexing action.' }, { status: 400 });
  }
  const parsed = z
    .object({ action: z.enum(['start', 'release']).optional() })
    .strict()
    .safeParse(input);
  if (!parsed.success)
    return NextResponse.json({ error: 'Choose a valid indexing action.' }, { status: 400 });
  try {
    return NextResponse.json(
      parsed.data.action === 'release'
        ? await releaseUnconfirmedStart()
        : await startIndexing(admin.id),
      { status: 202 },
    );
  } catch (error) {
    const message =
      error instanceof Error && /already|No eligible|not configured|Refresh/.test(error.message)
        ? error.message
        : 'Could not start indexing. Refresh before retrying.';
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
