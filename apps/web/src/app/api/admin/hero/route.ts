import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { adminAccessFailure, adminApiFailure } from '@/lib/admin-request';
import { boundedJson } from '@/lib/request-body';
import { adminMutationRateLimit } from '@/lib/rate-limit';
import { getHeroSchedule, updateHeroSetting } from '@/lib/hero-issues';
import { refreshPublicArchiveCaches } from '@/lib/public-cache';
import { auditAdmin } from '@/lib/db/admin-accounts';
import { z } from 'zod';

const schema = z.object({
  action: z.enum(['hide', 'show', 'select', 'schedule']),
  magazineId: z.string().min(1).max(128),
  issueId: z.string().min(1).max(128).optional(),
  selection: z.enum(['automatic', 'previous', 'archive']).optional(),
  nextChoice: z.enum(['automatic', 'current_year', 'previous_year', 'keep']).optional(),
});

export async function GET() {
  const admin = await verifyAdmin('dashboard.view');
  if (!admin) return await adminAccessFailure();
  try { return NextResponse.json(await getHeroSchedule(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return adminApiFailure(error, 'Could not load hero schedule'); }
}

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin('catalogue.publish');
  if (!admin) return await adminAccessFailure();
  const limited = await adminMutationRateLimit(request, admin.id);
  if (limited) return limited;
  const body = await boundedJson(request, 2048);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid hero selection' }, { status: 400 });
  try {
    const { action, magazineId, issueId, selection, nextChoice } = parsed.data;
    await updateHeroSetting(admin.id, action, magazineId, issueId, selection, nextChoice);
    refreshPublicArchiveCaches(issueId);
    await auditAdmin(admin.id, 'hero.updated', issueId);
    return NextResponse.json(await getHeroSchedule(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return adminApiFailure(error, 'Could not update hero'); }
}
