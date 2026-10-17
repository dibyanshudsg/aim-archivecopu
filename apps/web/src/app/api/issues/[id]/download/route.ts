import { after, NextRequest } from 'next/server';
import { incrementIssueDownloadCount } from '@/lib/db';
import { deliverPdf } from '@/lib/pdf-delivery';
import { publicRateLimit } from '@/lib/rate-limit';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await publicRateLimit(_request, 'download');
  if (limited) return limited;
  const { id } = await params;
  const response = await deliverPdf(_request, id, 'download');
  if (response.status !== 307 || _request.method === 'HEAD') return response;

  after(async () => { try {
    await incrementIssueDownloadCount(id);
  } catch (incrementError) {
    console.error('Failed to increment download count:', incrementError);
  }
  });

  return response;
}
export const HEAD = GET;
