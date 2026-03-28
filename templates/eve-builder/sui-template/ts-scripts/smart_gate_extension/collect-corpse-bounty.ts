import 'dotenv/config';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { MODULES } from '../utils/config';
import { deriveObjectId } from '../utils/derive-object-id';
import {
  GATE_ITEM_ID_1,
  GATE_ITEM_ID_2,
  CLOCK_OBJECT_ID,
  ITEM_A_TYPE_ID,
  STORAGE_A_ITEM_ID,
  GAME_CHARACTER_B_ID
} from '../utils/constants';
import {
  getEnvConfig,
  handleError,
  hydrateWorldConfig,
  initializeContext,
  requireEnv
} from '../utils/helper';
import { resolveSmartGateExtensionIds } from './extension-ids';
import { MODULE } from './modules';
import { getCharacterOwnerCap } from '../helpers/character';
import { executeSponsoredTransaction } from '../utils/transaction';

async function collectCorpseBounty(
  ctx: ReturnType<typeof initializeContext>,
  adminKeypair: Ed25519Keypair,
  adminAddress: string,
  sourceGateItemId: bigint,
  destinationGateItemId: bigint,
  storageUnitItemId: bigint,
  characterItemId: bigint
) {
  const { client, keypair, config, address } = ctx;

  const { builderPackageId, extensionConfigId } = await resolveSmartGateExtensionIds(
    client,
    requireEnv('ADMIN_ADDRESS')
  );

  const sourceGateId = deriveObjectId(config.objectRegistry, sourceGateItemId, config.packageId);
  const destinationGateId = deriveObjectId(
    config.objectRegistry,
    destinationGateItemId,
    config.packageId
  );
  const characterId = deriveObjectId(config.objectRegistry, characterItemId, config.packageId);
  const storageUnitId = deriveObjectId(config.objectRegistry, storageUnitItemId, config.packageId);

  const playerOwnerCapId = await getCharacterOwnerCap(characterId, client, config, address);
  if (!playerOwnerCapId) {
    throw new Error(`OwnerCap not found for ${characterId}`);
  }

  const tx = new Transaction();
  tx.setSender(address);
  tx.setGasOwner(adminAddress);

  const [ownerCap, returnReceipt] = tx.moveCall({
    target: `${config.packageId}::${MODULES.CHARACTER}::borrow_owner_cap`,
    typeArguments: [`${config.packageId}::${MODULES.CHARACTER}::Character`],
    arguments: [tx.object(characterId), tx.object(playerOwnerCapId)]
  });

  tx.moveCall({
    target: `${builderPackageId}::${MODULE.CORPSE_GATE_BOUNTY}::collect_corpse_bounty`,
    typeArguments: [`${config.packageId}::${MODULES.CHARACTER}::Character`],
    arguments: [
      tx.object(extensionConfigId),
      tx.object(storageUnitId),
      tx.object(sourceGateId),
      tx.object(destinationGateId),
      tx.object(characterId),
      ownerCap,
      tx.pure.u64(ITEM_A_TYPE_ID),
      tx.pure.u32(1),
      tx.object(CLOCK_OBJECT_ID)
    ]
  });

  tx.moveCall({
    target: `${config.packageId}::${MODULES.CHARACTER}::return_owner_cap`,
    typeArguments: [`${config.packageId}::${MODULES.CHARACTER}::Character`],
    arguments: [tx.object(characterId), ownerCap, returnReceipt]
  });

  const result = await executeSponsoredTransaction(
    tx,
    client,
    keypair,
    adminKeypair,
    address,
    adminAddress,
    { showEffects: true, showObjectChanges: true, showEvents: true }
  );

  console.log('Corpse bounty collected + JumpPermit issued!');
  console.log('Transaction digest:', result.digest);
}

async function main() {
  console.log('============= Collect Corpse Bounty ==============\n');
  try {
    const env = getEnvConfig();
    const adminCtx = initializeContext(env.network, env.adminExportedKey);
    await hydrateWorldConfig(adminCtx);

    const playerKey = requireEnv('PLAYER_B_PRIVATE_KEY');
    const playerCtx = initializeContext(env.network, playerKey);
    playerCtx.config = adminCtx.config;

    const adminKeypair = adminCtx.keypair;
    const adminAddress = adminKeypair.getPublicKey().toSuiAddress();

    await collectCorpseBounty(
      playerCtx,
      adminKeypair,
      adminAddress,
      GATE_ITEM_ID_1,
      GATE_ITEM_ID_2,
      STORAGE_A_ITEM_ID,
      BigInt(GAME_CHARACTER_B_ID)
    );
  } catch (error) {
    handleError(error);
  }
}

main();
