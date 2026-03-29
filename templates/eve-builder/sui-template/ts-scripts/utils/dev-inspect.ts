import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';

function resolveDevInspectSender(senderAddress?: string): string {
  if (senderAddress) return senderAddress;
  return process.env.ADMIN_ADDRESS || '0x0';
}

export async function devInspectMoveCallFirstReturnValueBytes(
  client: SuiJsonRpcClient,
  params: {
    target: string;
    typeArguments?: string[];
    senderAddress?: string;
    arguments: (tx: Transaction) => any[];
  }
): Promise<Uint8Array | null> {
  const tx = new Transaction();
  tx.moveCall({
    target: params.target,
    typeArguments: params.typeArguments,
    arguments: params.arguments(tx)
  });

  const result = await client.devInspectTransactionBlock({
    sender: resolveDevInspectSender(params.senderAddress),
    transactionBlock: tx
  });

  if (result.effects?.status?.status !== 'success') {
    return null;
  }

  const returnValues = result.results?.[0]?.returnValues;
  if (!returnValues?.length) return null;

  const [valueBytes] = returnValues[0];
  return Uint8Array.from(valueBytes);
}
