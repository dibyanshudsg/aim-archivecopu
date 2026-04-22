import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const CONTENT_ROOT = path.resolve(process.cwd(), '../../');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const filePath = path.join(CONTENT_ROOT, ...segments);

  if (!filePath.endsWith('.pdf') || !existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Ensure path stays within content root
  if (!filePath.startsWith(CONTENT_ROOT)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const file = await readFile(filePath);

  return new NextResponse(file, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${segments[segments.length - 1]}"`,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
