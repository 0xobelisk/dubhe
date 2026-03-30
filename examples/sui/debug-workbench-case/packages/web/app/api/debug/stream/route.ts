import { NextRequest } from 'next/server';
import { buildWorkbenchSnapshot } from '@/lib/debug-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();

function encodeSseEvent(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET(request: NextRequest) {
  const contractsDir = request.nextUrl.searchParams.get('contractsDir') ?? undefined;
  const traceFileLimitRaw = request.nextUrl.searchParams.get('traceFileLimit');
  const traceFileLimit = traceFileLimitRaw ? Number.parseInt(traceFileLimitRaw, 10) : undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let isClosed = false;
      let lastRevision = '';

      const close = () => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(watchTimer);
        clearInterval(heartbeatTimer);
        controller.close();
      };

      const emitRevision = () => {
        try {
          const snapshot = buildWorkbenchSnapshot({
            contractsDir,
            traceFileLimit: Number.isFinite(traceFileLimit ?? Number.NaN)
              ? traceFileLimit
              : undefined
          });

          if (snapshot.revision !== lastRevision) {
            lastRevision = snapshot.revision;
            controller.enqueue(
              encodeSseEvent('revision', {
                revision: snapshot.revision,
                generatedAt: snapshot.generatedAt
              })
            );
          }
        } catch (error) {
          controller.enqueue(
            encodeSseEvent('error', {
              message: error instanceof Error ? error.message : String(error)
            })
          );
        }
      };

      emitRevision();
      const watchTimer = setInterval(emitRevision, 1200);
      const heartbeatTimer = setInterval(() => {
        controller.enqueue(encodeSseEvent('ping', { at: new Date().toISOString() }));
      }, 15_000);

      if (request.signal.aborted) {
        close();
        return;
      }

      request.signal.addEventListener('abort', close);
    },
    cancel() {
      // Lifecycle cleanup is handled by request abort.
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Connection: 'keep-alive'
    }
  });
}
