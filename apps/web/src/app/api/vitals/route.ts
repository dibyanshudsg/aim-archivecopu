import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_ENABLE_WEB_VITALS !== 'true') return new NextResponse(null, { status: 204 });
  if (request.headers.get('origin') !== request.nextUrl.origin) return new NextResponse(null, { status: 403 });
  if (Number(request.headers.get('content-length') || 0) > 512) return new NextResponse(null, { status: 413 });
  // The body reader is bounded even if Content-Length was omitted.
  const reader = request.body?.getReader();
  if (!reader) return new NextResponse(null, { status: 400 });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 512) { await reader.cancel(); return new NextResponse(null, { status: 413 }); }
      chunks.push(value);
    }
    const metric = JSON.parse(Buffer.concat(chunks).toString());
    if (!['CLS', 'LCP', 'INP', 'FCP', 'TTFB'].includes(metric.name) || typeof metric.value !== 'number' || !Number.isFinite(metric.value) || metric.value < 0 || !['good', 'needs-improvement', 'poor'].includes(metric.rating)) {
      return new NextResponse(null, { status: 400 });
    }
    console.info('web-vital', { name: metric.name, value: metric.value, rating: metric.rating });
    return new NextResponse(null, { status: 204 });
  } catch { return new NextResponse(null, { status: 400 }); }
  finally { reader.releaseLock(); }
}
