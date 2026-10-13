import { deliverPdf } from '@/lib/pdf-delivery';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return deliverPdf(request, (await params).id, 'grant');
}
