import { NextResponse } from 'next/server';

export class RequestBodyError extends Error {
  constructor(public readonly status: 400 | 413) { super(status === 413 ? 'Request body is too large.' : 'Invalid JSON request body.'); }
}

/** Bound the actual bytes read; Content-Length alone is not trustworthy. */
export async function readJsonBody(request: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new RequestBodyError(413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError(400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new RequestBodyError(413); }
      chunks.push(value);
    }
    if (size === 0) return {};
    const parsed: unknown = JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new RequestBodyError(400);
    return parsed;
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError(400);
  } finally { reader.releaseLock(); }
}

export function requestBodyFailure(error: unknown) {
  const bodyError = error instanceof RequestBodyError ? error : new RequestBodyError(400);
  return NextResponse.json({ error: bodyError.message }, { status: bodyError.status, headers: { 'Cache-Control': 'no-store' } });
}

export async function boundedJson(request: Request, maxBytes = 64 * 1024): Promise<
  { ok: true; value: unknown } | { ok: false; response: NextResponse }
> {
  try { return { ok: true, value: await readJsonBody(request, maxBytes) }; }
  catch (error) { return { ok: false, response: requestBodyFailure(error) }; }
}
