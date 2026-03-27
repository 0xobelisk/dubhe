import { NextRequest, NextResponse } from 'next/server';
import { buildWorkbenchSnapshot } from '@/lib/debug-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const contractsDir = request.nextUrl.searchParams.get('contractsDir') ?? undefined;
  const traceFileLimitRaw = request.nextUrl.searchParams.get('traceFileLimit');
  const traceFileLimit = traceFileLimitRaw ? Number.parseInt(traceFileLimitRaw, 10) : undefined;

  const snapshot = buildWorkbenchSnapshot({
    contractsDir,
    traceFileLimit: Number.isFinite(traceFileLimit ?? Number.NaN) ? traceFileLimit : undefined
  });

  return NextResponse.json(snapshot, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
}
