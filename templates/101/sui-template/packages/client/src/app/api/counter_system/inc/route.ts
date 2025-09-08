import { NextRequest, NextResponse } from 'next/server';

import { Transaction, SuiTransactionBlockResponse } from '@0xobelisk/sui-client';

import { dubheClient } from '@/lib/dubhe-client';
import { ApiTransactionResponse } from '../../types';

export async function POST(req: NextRequest) {
  try {
    const { contract, dubheSchemaId } = dubheClient;

    let response: ApiTransactionResponse = {
      digest: '',
      success: false,
      error: ''
    };

    const tx = new Transaction();
    (await contract.tx.counter_system.inc({
      tx,
      params: [tx.object(dubheSchemaId), tx.pure.u32(1)],
      onSuccess: (result) => {
        response.digest = result.digest;
        response.success = true;
      },
      onError: (error) => {
        response.error = error.message;
      }
    })) as SuiTransactionBlockResponse;

    if (response.success) {
      return NextResponse.json(response);
    } else {
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error: unknown) {
    console.error(error);

    return NextResponse.json(
      {
        digest: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
