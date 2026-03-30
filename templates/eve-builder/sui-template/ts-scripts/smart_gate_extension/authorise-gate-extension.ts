import 'dotenv/config';
import { Transaction } from '@mysten/sui/transactions';
import { MODULES } from '../utils/config';
import { deriveObjectId } from '../utils/derive-object-id';
import { GAME_CHARACTER_ID, GATE_ITEM_ID_1, GATE_ITEM_ID_2 } from '../utils/constants';
import {
  getEnvConfig,
  handleError,
  hydrateWorldConfig,
  initializeContext,
  requireEnv,
  delay,
  DELAY_MS
} from '../utils/helper';
import { requireBuilderPackageId } from './extension-ids';
import { getOwnerCap as getGateOwnerCap } from '../helpers/gate';
import { MODULE } from './modules';

async function authoriseGate(
  ctx: ReturnType<typeof initializeContext>,
  gateItemId: bigint,
  characterItemId: bigint
) {
  const { client, keypair, config, address } = ctx;
  const builderPackageId = requireBuilderPackageId();

  const characterId = deriveObjectId(config.objectRegistry, characterItemId, config.packageId);
  const gateId = deriveObjectId(config.objectRegistry, gateItemId, config.packageId);

  const gateOwnerCapId = await getGateOwnerCap(gateId, client, config, address);
  if (!gateOwnerCapId) {
    throw new Error(`OwnerCap not found for gate ${gateId}`);
  }

  const authType = `${builderPackageId}::${MODULE.CONFIG}::XAuth`;

  const tx = new Transaction();

  const [gateOwnerCap, returnReceipt] = tx.moveCall({
    target: `${config.packageId}::${MODULES.CHARACTER}::borrow_owner_cap`,
    typeArguments: [`${config.packageId}::${MODULES.GATE}::Gate`],
    arguments: [tx.object(characterId), tx.object(gateOwnerCapId)]
  });

  tx.moveCall({
    target: `${config.packageId}::${MODULES.GATE}::authorize_extension`,
    typeArguments: [authType],
    arguments: [tx.object(gateId), gateOwnerCap]
  });

  tx.moveCall({
    target: `${config.packageId}::${MODULES.CHARACTER}::return_owner_cap`,
    typeArguments: [`${config.packageId}::${MODULES.GATE}::Gate`],
    arguments: [tx.object(characterId), gateOwnerCap, returnReceipt]
  });

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true, showObjectChanges: true, showEvents: true }
  });

  console.log('Extension authorized on gate!', gateId);
  console.log('Auth type:', authType);
  console.log('Transaction digest:', result.digest);
}

async function main() {
  console.log('============= Authorise Gate Extension ==============\n');
  try {
    const env = getEnvConfig();
    const playerKey = requireEnv('PLAYER_A_PRIVATE_KEY');
    const ctx = initializeContext(env.network, playerKey);
    await hydrateWorldConfig(ctx);
    await authoriseGate(ctx, GATE_ITEM_ID_1, BigInt(GAME_CHARACTER_ID));
    await delay(DELAY_MS);
    await authoriseGate(ctx, GATE_ITEM_ID_2, BigInt(GAME_CHARACTER_ID));
  } catch (error) {
    handleError(error);
  }
}

main();
