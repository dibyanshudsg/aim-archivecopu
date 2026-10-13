import { PDF_HEADERS } from '@/lib/pdf-access';

export const dynamic = 'force-dynamic';

// Retired workspace-file endpoint. Never resolve paths or read local files here,
// including in development. Use the catalogue-authorized issue/admin routes.
export function GET() {
  return new Response(null, { status: 404, headers: PDF_HEADERS });
}

export const HEAD = GET;
