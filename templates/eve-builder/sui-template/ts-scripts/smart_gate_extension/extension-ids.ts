import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { requireEnv } from '../utils/helper';
import { MODULE } from './modules';

export type SmartGateExtensionIds = {
  builderPackageId: string;
  adminCapId: string;
  extensionConfigId: string;
};

export function requireBuilderPackageId(): string {
  return requireEnv('BUILDER_PACKAGE_ID');
}

/**
 * Resolve builder package and extension config IDs from env only (no AdminCap).
 * Use for entry points that don't need admin, e.g. issue_jump_permit.
 */
export function resolveSmartGateExtensionIdsFromEnv(): {
  builderPackageId: string;
  extensionConfigId: string;
} {
  return {
    builderPackageId: requireBuilderPackageId(),
    extensionConfigId: requireEnv('EXTENSION_CONFIG_ID')
  };
}

/**
 * Resolve smart_gate_extension IDs (env + AdminCap for the given owner).
 * BUILDER_PACKAGE_ID and EXTENSION_CONFIG_ID come from .env (set after publishing).
 */
export async function resolveSmartGateExtensionIds(
  client: SuiJsonRpcClient,
  ownerAddress: string
): Promise<SmartGateExtensionIds> {
  const { builderPackageId, extensionConfigId } = resolveSmartGateExtensionIdsFromEnv();
  const adminCapType = `${builderPackageId}::${MODULE.CONFIG}::AdminCap`;
  const result = await client.getOwnedObjects({
    owner: ownerAddress,
    filter: { StructType: adminCapType },
    limit: 1
  });

  const adminCapId = result.data[0]?.data?.objectId;
  if (!adminCapId) {
    throw new Error(
      `AdminCap not found for ${ownerAddress}. ` +
        `Make sure this address published the smart_gate_extension package.`
    );
  }

  return { builderPackageId, adminCapId, extensionConfigId };
}
