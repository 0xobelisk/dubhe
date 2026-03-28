import 'dotenv/config';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { MODULES } from '../utils/config';
import { deriveObjectId } from '../utils/derive-object-id';
import {
  GAME_CHARACTER_B_ID,
  GATE_ITEM_ID_1,
  GATE_ITEM_ID_2,
  CLOCK_OBJECT_ID
} from '../utils/constants';
import {
  extractEvent,
  getEnvConfig,
  handleError,
  hydrateWorldConfig,
  initializeContext,
  requireEnv
} from '../utils/helper';
import { keypairFromPrivateKey } from '../utils/config';
import { executeSponsoredTransaction } from '../utils/transaction';

async function getOwnedJumpPermitId(
  client: SuiJsonRpcClient,
  owner: string,
  worldPackageId: string
): Promise<string | null> {
  const type = `${worldPackageId}::${MODULES.GATE}::JumpPermit`;
  const res = await client.getOwnedObjects({
    owner,
    filter: { StructType: type },
    limit: 1
  });
  const first = res.data?.[0]?.data;
  return first?.objectId ?? null;
}

async function jumpWithPermit(
  ctx: ReturnType<typeof initializeContext>,
  characterItemId: bigint,
  sourceGateItemId: bigint,
  destinationGateItemId: bigint,
  playerAddress: string,
  adminAddress: string,
  adminKeypair: ReturnType<typeof keypairFromPrivateKey>
) {
  const { client, keypair, config, address } = ctx;

  const characterId = deriveObjectId(config.objectRegistry, characterItemId, config.packageId);
  const sourceGateId = deriveObjectId(config.objectRegistry, sourceGateItemId, config.packageId);
  const destinationGateId = deriveObjectId(
    config.objectRegistry,
    destinationGateItemId,
    config.packageId
  );

  const jumpPermitId = await getOwnedJumpPermitId(client, address, config.packageId);
  if (!jumpPermitId) {
    throw new Error('You should own a JumpPermit object. Run issue-tribe-jump-permit first.');
  }

  const tx = new Transaction();
  tx.setSender(playerAddress);
  tx.setGasOwner(adminAddress);

  tx.moveCall({
    target: `${config.packageId}::${MODULES.GATE}::jump_with_permit`,
    arguments: [
      tx.object(sourceGateId),
      tx.object(destinationGateId),
      tx.object(characterId),
      tx.object(jumpPermitId),
      tx.object(config.adminAcl),
      tx.object(CLOCK_OBJECT_ID)
    ]
  });

  const result = await executeSponsoredTransaction(
    tx,
    client,
    keypair,
    adminKeypair,
    playerAddress,
    adminAddress
  );

  console.log('JumpPermit:', jumpPermitId);
  console.log('Transaction digest:', result.digest);

  const jumpEvent = extractEvent<{
    source_gate_id: string;
    destination_gate_id: string;
    character_id: string;
  }>(result, '::gate::JumpEvent');

  if (jumpEvent) {
    console.log('JumpEvent:', jumpEvent);
  }
}

async function main() {
  console.log('============= Jump With Permit ==============\n');
  try {
    const env = getEnvConfig();
    const playerKey = requireEnv('PLAYER_B_PRIVATE_KEY');
    const playerCtx = initializeContext(env.network, playerKey);
    await hydrateWorldConfig(playerCtx);
    const adminKeypair = keypairFromPrivateKey(env.adminExportedKey);
    const adminAddress = adminKeypair.getPublicKey().toSuiAddress();

    await jumpWithPermit(
      playerCtx,
      BigInt(GAME_CHARACTER_B_ID),
      GATE_ITEM_ID_1,
      GATE_ITEM_ID_2,
      playerCtx.address,
      adminAddress,
      adminKeypair
    );
  } catch (error) {
    handleError(error);
  }
}

main();
