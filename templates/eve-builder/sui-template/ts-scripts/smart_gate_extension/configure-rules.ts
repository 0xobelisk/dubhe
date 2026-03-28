import 'dotenv/config';
import { Transaction } from '@mysten/sui/transactions';
import { getEnvConfig, handleError, hydrateWorldConfig, initializeContext } from '../utils/helper';
import { resolveSmartGateExtensionIds } from './extension-ids';
import { ITEM_A_TYPE_ID } from '../utils/constants';
import { MODULE } from './modules';

async function main() {
  console.log('============= Configure Smart Gate Rules ==============\n');

  try {
    const env = getEnvConfig();
    const ctx = initializeContext(env.network, env.adminExportedKey);
    const { client, keypair, address } = ctx;
    await hydrateWorldConfig(ctx);

    const { builderPackageId, adminCapId, extensionConfigId } = await resolveSmartGateExtensionIds(
      client,
      address
    );

    const tx = new Transaction();

    // Set tribe config: tribe = 100, expiry = 1 hour
    tx.moveCall({
      target: `${builderPackageId}::${MODULE.TRIBE_PERMIT}::set_tribe_config`,
      arguments: [
        tx.object(extensionConfigId),
        tx.object(adminCapId),
        tx.pure.u32(100),
        tx.pure.u64(3600000)
      ]
    });

    // Set bounty config: bounty type = ITEM_A_TYPE_ID, expiry = 1 hour
    tx.moveCall({
      target: `${builderPackageId}::${MODULE.CORPSE_GATE_BOUNTY}::set_bounty_config`,
      arguments: [
        tx.object(extensionConfigId),
        tx.object(adminCapId),
        tx.pure.u64(ITEM_A_TYPE_ID),
        tx.pure.u64(3600000)
      ]
    });

    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: { showEffects: true, showObjectChanges: true }
    });

    console.log('Smart gate rules configured!');
    console.log('Transaction digest:', result.digest);
  } catch (error) {
    handleError(error);
  }
}

main();
