/** Each attempt starts at the catalogue gate, never at a persisted signed URL. */
export async function fetchPublicPdf(url: string, signal?: AbortSignal): Promise<Response> {
  if (!/^\/api\/issues\/[a-zA-Z0-9_-]+\/pdf$/.test(url)) throw new Error('Unsupported PDF address');
  for (let attempt = 0; attempt < 2; attempt++) {
    signal?.throwIfAborted();
    try {
      const response = await fetch(url, { signal, cache: 'no-store', referrerPolicy: 'no-referrer' });
      if (attempt === 0 && [403, 502, 503, 504].includes(response.status)) {
        await response.body?.cancel();
        continue;
      }
      return response;
    } catch (error) {
      if (signal?.aborted || attempt !== 0) throw error;
    }
  }
  throw new Error('PDF unavailable');
}
