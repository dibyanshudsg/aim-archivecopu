import { deliverCover } from '@/lib/cover-delivery';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return deliverCover(request, (await params).id, true);
}
export const HEAD = GET;
