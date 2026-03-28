import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { getConfig, MODULES } from '../utils/config';
import { bcs } from '@mysten/sui/bcs';
import { devInspectMoveCallFirstReturnValueBytes } from '../utils/dev-inspect';

export async function getOwnerCap(
  storageUnitId: string,
  client: SuiJsonRpcClient,
  config: ReturnType<typeof getConfig>,
  senderAddress?: string
): Promise<string | null> {
  try {
    const bytes = await devInspectMoveCallFirstReturnValueBytes(client, {
      target: `${config.packageId}::${MODULES.STORAGE_UNIT}::owner_cap_id`,
      senderAddress,
      arguments: (tx) => [tx.object(storageUnitId)]
    });

    if (!bytes) {
      console.warn('Error checking storage unit extension ownercap id');
      return null;
    }
    return bcs.Address.parse(bytes);
  } catch (error) {
    console.warn(
      'Failed to get storage unit extension ownerCap:',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}
