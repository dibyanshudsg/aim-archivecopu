import { deliverPdf } from '@/lib/pdf-delivery';
import { publicRateLimit } from '@/lib/rate-limit';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await publicRateLimit(request, 'pdf');
  if (limited) return limited;
  return deliverPdf(request, (await params).id, 'grant');
}
