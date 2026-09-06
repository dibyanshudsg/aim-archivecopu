import { NextResponse } from 'next/server';
import { getPublicNavigationFromDb } from '@/lib/db';
import { defaultPublicNavigation } from '@/lib/navigation';

export async function GET() {
  try {
    return NextResponse.json(await getPublicNavigationFromDb(), {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch {
    return NextResponse.json(defaultPublicNavigation(), {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  }
}
