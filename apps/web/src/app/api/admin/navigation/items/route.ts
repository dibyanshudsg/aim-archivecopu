import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { createNavigationItemInDb } from '@/lib/db';
import { revalidateNavigationSurfaces } from '@/lib/navigation-revalidation';
import { formatZodError, navigationItemSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = navigationItemSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error), code: 'VALIDATION' }, { status: 400 });
  }

  try {
    const item = await createNavigationItemInDb(parsed.data, admin.id);
    revalidateNavigationSurfaces();
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create navigation item' }, { status: 500 });
  }
}
