import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/admin-auth';
import { extractPdfText } from '@/lib/pdf-extract';
import { indexIssue } from '@/lib/search-indexer';
import { generateThumbnailFromUrl } from '@/lib/pdf-thumbnail';

export const runtime = 'nodejs';

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Reindex a single issue's OCR + (if missing) cover thumbnail.
 *
 * Streams NDJSON progress events to the client. Each event is one JSON object
 * on its own line. Event shapes:
 *   { type: 'status',   message: string }
 *   { type: 'progress', page: number, total: number }
 *   { type: 'done',     pagesIndexed: number, thumbnailUrl: string | null }
 *   { type: 'error',    message: string }
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = await params;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };

      try {
        const supabase = getClient();

        const { data: issue, error } = await supabase
          .from('issues')
          .select('id, title, pdf_url, cover_image_url')
          .eq('id', id)
          .single();
        if (error || !issue) {
          send({ type: 'error', message: 'Issue not found' });
          controller.close();
          return;
        }

        send({ type: 'status', message: 'Downloading PDF…' });

        const response = await fetch(issue.pdf_url);
        if (!response.ok) {
          send({ type: 'error', message: `Failed to download PDF: HTTP ${response.status}` });
          controller.close();
          return;
        }
        const buffer = Buffer.from(await response.arrayBuffer());

        send({ type: 'status', message: 'Loading OCR engine…' });

        const pages = await extractPdfText(buffer, (page, total) => {
          send({ type: 'progress', page, total });
        });

        send({ type: 'status', message: 'Writing search index…' });

        const pagesIndexed = await indexIssue(supabase, id, pages);

        // Regenerate thumbnail only if missing — don't overwrite a custom cover
        let thumbnailUrl: string | null = issue.cover_image_url;
        if (!issue.cover_image_url) {
          try {
            send({ type: 'status', message: 'Generating cover thumbnail…' });
            const url = new URL(issue.pdf_url);
            const storagePath = url.pathname.split('/storage/v1/object/public/magazines/')[1];
            if (storagePath) {
              thumbnailUrl = await generateThumbnailFromUrl(
                supabase,
                issue.pdf_url,
                decodeURIComponent(storagePath),
              );
              await supabase
                .from('issues')
                .update({ cover_image_url: thumbnailUrl })
                .eq('id', issue.id);
            }
          } catch (thumbErr) {
            console.error('Thumbnail generation failed (non-blocking):', thumbErr);
          }
        }

        send({ type: 'done', pagesIndexed, thumbnailUrl });
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        send({ type: 'error', message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
