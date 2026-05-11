/**
 * Query dapp_revenue balance stored in DappStorage as a dynamic field.
 *
 * Run:
 *   cd templates/nextjs/sui-farm/packages/contracts
 *   npx tsx scripts/query-dapp-revenue.ts
 */

import { SuiClient } from '@0xobelisk/sui-client';
import { Network, DappStorageId, FrameworkPackageId } from './config.ts';

const RPC: Record<string, string> = {
  localnet: 'http://127.0.0.1:9000',
  devnet: 'https://fullnode.devnet.sui.io',
  testnet: 'https://fullnode.testnet.sui.io',
  mainnet: 'https://fullnode.mainnet.sui.io'
};

const COIN_SUI = '0x2::sui::SUI';

async function queryDappRevenue() {
  const client = new SuiClient({ url: RPC[Network] ?? RPC.localnet });

  console.log(`Network  : ${Network}`);
  console.log(`Storage  : ${DappStorageId}`);
  console.log(`Framework: ${FrameworkPackageId}`);
  console.log('');

  if (!FrameworkPackageId) {
    console.error('FrameworkPackageId is undefined in deployment.ts');
    process.exit(1);
  }

  // ── 1. Query dapp_revenue via getDynamicFieldObject ────────────────────────
  const revenueKeyType = `${FrameworkPackageId}::dapp_service::DappRevenueKey<${COIN_SUI}>`;

  let revenueBalance = 0n;
  try {
    const result = await client.getDynamicFieldObject({
      parentId: DappStorageId,
      name: {
        // Sui serializes empty structs with a synthetic dummy_field: bool
        type: revenueKeyType,
        value: { dummy_field: false }
      }
    });

    if (result.error) {
      // Field not yet created → balance is 0
      console.log('dapp_revenue field not found (no fees collected yet)');
    } else {
      const fields = (result.data?.content as any)?.fields;
      // Balance<SUI> is a struct with field `value: u64`
      revenueBalance = BigInt(fields?.value ?? fields?.balance ?? 0);
    }
  } catch (e: any) {
    // 404 / field not found → balance is 0
    if (!e?.message?.includes('not found') && !e?.message?.includes('dynamic field')) {
      throw e;
    }
    console.log('dapp_revenue dynamic field does not exist yet (0 revenue)');
  }

  const mist = revenueBalance;
  const sui = Number(mist) / 1e9;

  console.log(`─── DApp Revenue Balance ──────────────`);
  console.log(`  ${mist} MIST`);
  console.log(`  ${sui.toFixed(9)} SUI`);
  console.log('');

  // ── 2. Also read DappStorage basic info ───────────────────────────────────
  const storageObj = await client.getObject({
    id: DappStorageId,
    options: { showContent: true }
  });
  const sf = (storageObj.data?.content as any)?.fields ?? {};

  const creditPool = BigInt(sf.credit_pool ?? 0);
  const freeCredit = BigInt(sf.free_credit ?? 0);
  const totalSettled = BigInt(sf.total_settled ?? 0);
  const settlementMode = Number(sf.settlement_mode ?? 0);

  console.log(`─── DApp Storage Summary ───────────────`);
  console.log(
    `  settlement_mode  : ${settlementMode === 0 ? '0 (DAPP_SUBSIDIZES)' : '1 (USER_PAYS)'}`
  );
  console.log(`  credit_pool      : ${Number(creditPool) / 1e9} SUI  (${creditPool} MIST)`);
  console.log(`  free_credit      : ${Number(freeCredit) / 1e9} SUI  (${freeCredit} MIST)`);
  console.log(`  total_settled    : ${Number(totalSettled) / 1e9} SUI  (${totalSettled} MIST)`);
  console.log(`  paused           : ${sf.paused}`);
  console.log(`  version          : ${sf.version}`);
}

queryDappRevenue().catch(console.error);
