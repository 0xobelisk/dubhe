import 'dotenv/config';
import { Transaction } from '@mysten/sui/transactions';
import { deriveObjectId } from '../utils/derive-object-id';
import {
  GAME_CHARACTER_B_ID,
  GATE_ITEM_ID_1,
  GATE_ITEM_ID_2,
  CLOCK_OBJECT_ID
} from '../utils/constants';
import type { Network } from '../utils/config';
import { handleError, hydrateWorldConfig, initializeContext, requireEnv } from '../utils/helper';
import { resolveSmartGateExtensionIdsFromEnv } from './extension-ids';
import { MODULE } from './modules';

async function issueJumpPermit(
  ctx: ReturnType<typeof initializeContext>,
  sourceGateItemId: bigint,
  destinationGateItemId: bigint,
  characterItemId: bigint
) {
  const { client, keypair, config } = ctx;

  const { builderPackageId, extensionConfigId } = resolveSmartGateExtensionIdsFromEnv();

  const sourceGateId = deriveObjectId(config.objectRegistry, sourceGateItemId, config.packageId);
  const destinationGateId = deriveObjectId(
    config.objectRegistry,
    destinationGateItemId,
    config.packageId
  );
  const characterId = deriveObjectId(config.objectRegistry, characterItemId, config.packageId);

  const tx = new Transaction();
  tx.moveCall({
    target: `${builderPackageId}::${MODULE.TRIBE_PERMIT}::issue_jump_permit`,
    arguments: [
      tx.object(extensionConfigId),
      tx.object(sourceGateId),
      tx.object(destinationGateId),
      tx.object(characterId),
      tx.object(CLOCK_OBJECT_ID)
    ]
  });

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true, showObjectChanges: true, showEvents: true }
  });

  console.log('JumpPermit issued!');
  console.log('Transaction digest:', result.digest);
}

async function main() {
  console.log('============= Issue Tribe Jump Permit ==============\n');
  try {
    const network = (process.env.SUI_NETWORK as Network) || 'localnet';
    const playerKey = requireEnv('PLAYER_B_PRIVATE_KEY');
    const ctx = initializeContext(network, playerKey);
    await hydrateWorldConfig(ctx);
    await issueJumpPermit(ctx, GATE_ITEM_ID_1, GATE_ITEM_ID_2, BigInt(GAME_CHARACTER_B_ID));
  } catch (error) {
    handleError(error);
  }
}

main();
