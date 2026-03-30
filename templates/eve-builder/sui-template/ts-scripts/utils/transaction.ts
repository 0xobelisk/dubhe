import { Transaction } from '@mysten/sui/transactions';
import { SuiJsonRpcClient, ExecuteTransactionBlockParams } from '@mysten/sui/jsonRpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

export async function executeSponsoredTransaction(
  tx: Transaction,
  client: SuiJsonRpcClient,
  playerKeypair: Ed25519Keypair,
  adminKeypair: Ed25519Keypair,
  playerAddress: string,
  adminAddress: string,
  options?: ExecuteTransactionBlockParams['options']
) {
  const transactionKindBytes = await tx.build({ client, onlyTransactionKind: true });
  const gasCoins = await client.getCoins({
    owner: adminAddress,
    coinType: '0x2::sui::SUI',
    limit: 5
  });

  if (gasCoins.data.length === 0) {
    throw new Error('Admin has no SUI gas coins to sponsor the transaction');
  }

  const gasPayment = gasCoins.data.map((coin) => ({
    objectId: coin.coinObjectId,
    version: coin.version,
    digest: coin.digest
  }));

  const sponsoredTx = Transaction.fromKind(transactionKindBytes);
  sponsoredTx.setSender(playerAddress);
  sponsoredTx.setGasOwner(adminAddress);
  sponsoredTx.setGasPayment(gasPayment);
  const transactionBytes = await sponsoredTx.build({ client });

  const playerSignature = await playerKeypair.signTransaction(transactionBytes);
  const adminSignature = await adminKeypair.signTransaction(transactionBytes);

  return await client.executeTransactionBlock({
    transactionBlock: transactionBytes,
    signature: [playerSignature.signature, adminSignature.signature],
    options: options || { showObjectChanges: true, showEffects: true }
  });
}
