import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { getConfig, MODULES } from '../utils/config';
import { bcs } from '@mysten/sui/bcs';
import { devInspectMoveCallFirstReturnValueBytes } from '../utils/dev-inspect';

export async function getCharacterOwnerCap(
  characterId: string,
  client: SuiJsonRpcClient,
  config: ReturnType<typeof getConfig>,
  senderAddress?: string
): Promise<string | null> {
  try {
    const bytes = await devInspectMoveCallFirstReturnValueBytes(client, {
      target: `${config.packageId}::${MODULES.CHARACTER}::owner_cap_id`,
      senderAddress,
      arguments: (tx) => [tx.object(characterId)]
    });

    if (!bytes) {
      console.warn('Error checking character ownercap id');
      return null;
    }
    return bcs.Address.parse(bytes);
  } catch (error) {
    console.warn(
      'Failed to get character ownerCap:',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}
