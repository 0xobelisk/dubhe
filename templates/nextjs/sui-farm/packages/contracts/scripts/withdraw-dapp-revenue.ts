/**
 * Flush accumulated DApp revenue from DappStorage to the DApp admin wallet.
 *
 * Calls: dapp_system::withdraw_dapp_revenue<DappKey, SUI>(dh, dapp_storage, ctx)
 * The Move function internally transfers the Coin to the stored dapp_admin address —
 * anyone can trigger this (permissionless), only gas is needed.
 *
 * Run:
 *   cd templates/nextjs/sui-farm/packages/contracts
 *   PRIVATE_KEY="suiprivkey1q..." npx tsx scripts/withdraw-dapp-revenue.ts
 */

import { Dubhe, NetworkType, Transaction } from '@0xobelisk/sui-client';
import { Network, DappHubId, DappStorageId, PackageId, FrameworkPackageId } from './config.ts';

const COIN_SUI = '0x2::sui::SUI';
const DAPP_KEY_TYPE = `${PackageId}::dapp_key::DappKey`;

async function main() {
  const secretKey = process.env.PRIVATE_KEY;
  if (!secretKey) {
    console.error('Error: set PRIVATE_KEY env var (any key with enough SUI for gas)');
    console.error('  PRIVATE_KEY="suiprivkey1q..." npx tsx scripts/withdraw-dapp-revenue.ts');
    process.exit(1);
  }

  const dubhe = new Dubhe({
    networkType: Network as NetworkType,
    packageId: PackageId,
    metadata: undefined,
    secretKey
  });

  console.log(`Caller address : ${dubhe.getAddress()}  (pays gas only)`);
  console.log(`DappStorageId  : ${DappStorageId}`);
  console.log('');

  // withdraw_dapp_revenue is void — the Move contract transfers funds to dapp_admin directly.
  const tx = new Transaction();
  tx.moveCall({
    target: `${FrameworkPackageId}::dapp_system::withdraw_dapp_revenue`,
    typeArguments: [DAPP_KEY_TYPE, COIN_SUI],
    arguments: [tx.object(DappHubId), tx.object(DappStorageId)]
  });

  console.log('Sending withdraw_dapp_revenue transaction...');
  const result = await dubhe.signAndSendTxn({ tx });

  if (result.effects?.status?.status === 'success') {
    console.log(`✅ Success! Digest: ${result.digest}`);
  } else {
    console.error('❌ Transaction failed:', result.effects?.status);
  }
}

main().catch(console.error);
