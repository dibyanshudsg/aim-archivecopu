import { deliverCover } from '@/lib/cover-delivery';
import { publicRateLimit } from '@/lib/rate-limit';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await publicRateLimit(request, 'cover');
  if (limited) return limited;
  return deliverCover(request, (await params).id);
}
export const HEAD = GET;
