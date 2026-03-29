import { bcs } from '@mysten/sui/bcs';
import { deriveObjectID } from '@mysten/sui/utils';
import { TENANT } from './constants';

const TenantItemId = bcs.struct('TenantItemId', {
  id: bcs.u64(),
  tenant: bcs.string()
});

export function deriveObjectId(
  registryId: string,
  itemId: number | bigint,
  packageId: string
): string {
  const TenantItemIdValue = {
    id: BigInt(itemId),
    tenant: TENANT
  };
  const serializedKey = TenantItemId.serialize(TenantItemIdValue).toBytes();
  const TenantItemIdTypeTag = `${packageId}::in_game_id::TenantItemId`;

  return deriveObjectID(registryId, TenantItemIdTypeTag, serializedKey);
}
