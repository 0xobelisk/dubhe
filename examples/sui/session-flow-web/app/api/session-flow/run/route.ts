import { NextRequest, NextResponse } from 'next/server';
import { runSessionFlow, SessionFlowInput } from '@/lib/session-flow';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SessionFlowInput;
    const result = await runSessionFlow(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: message
      },
      { status: 400 }
    );
  }
}
