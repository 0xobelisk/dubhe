import * as process from 'process';
import dotenv from 'dotenv';
import { Dubhe, NetworkType, loadMetadata } from '../src/index';

dotenv.config();

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function optionalNumber(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim().length === 0) {
    return defaultValue;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    throw new Error(`Invalid numeric env: ${name}=${raw}`);
  }
  return value;
}

function toBytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

function u32Le(value: number): number[] {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return Array.from(bytes);
}

async function main() {
  const network = (process.env.NETWORK ?? 'testnet') as NetworkType;
  const frameworkPackageId = requiredEnv('FRAMEWORK_PACKAGE_ID');
  const appPackageId = process.env.APP_PACKAGE_ID ?? frameworkPackageId;
  const dappHubId = requiredEnv('DAPP_HUB_ID');
  const sessionRegistryId = requiredEnv('SESSION_REGISTRY_ID');
  const dappKeyType = process.env.DAPP_KEY_TYPE ?? `${appPackageId}::dapp_key::DappKey`;
  const recordKey = process.env.RECORD_KEY ?? 'session-demo';
  const recordValue = optionalNumber('RECORD_VALUE_U32', 1);

  const ownerSecretKey = process.env.OWNER_PRIVATE_KEY ?? process.env.PRIVATE_KEY;
  const delegateSecretKey = process.env.DELEGATE_PRIVATE_KEY ?? process.env.PRIVATE_KEY;
  if (!ownerSecretKey) {
    throw new Error('Missing OWNER_PRIVATE_KEY (or PRIVATE_KEY fallback).');
  }
  if (!delegateSecretKey) {
    throw new Error('Missing DELEGATE_PRIVATE_KEY (or PRIVATE_KEY fallback).');
  }

  const metadata = await loadMetadata(network, appPackageId);
  const ownerDubhe = new Dubhe({
    networkType: network,
    packageId: appPackageId,
    metadata,
    secretKey: ownerSecretKey
  });
  const delegateDubhe = new Dubhe({
    networkType: network,
    packageId: appPackageId,
    metadata,
    secretKey: delegateSecretKey
  });

  const ownerAddress = ownerDubhe.getAddress();
  const delegateAddress = process.env.DELEGATE_ADDRESS ?? delegateDubhe.getAddress();

  let sessionCapId = process.env.SESSION_CAP_ID;
  if (!sessionCapId) {
    const scopeMask = optionalNumber('SCOPE_MASK', 5);
    const maxUses = optionalNumber('MAX_USES', 20);
    const expiresInMinutes = optionalNumber('EXPIRES_IN_MINUTES', 10);

    const createResp = await ownerDubhe.createSessionCapWithLimits({
      frameworkPackageId,
      sessionRegistryId,
      dappKeyType,
      delegate: delegateAddress,
      scopeMask,
      expiresAtMs: Date.now() + expiresInMinutes * 60_000,
      maxUses
    });
    sessionCapId = ownerDubhe.getCreatedSessionCapId(createResp, { frameworkPackageId });
    if (!sessionCapId) {
      throw new Error('Failed to parse created SessionCap ID from create tx response.');
    }
    console.log('createSessionCapWithLimits digest:', createResp.digest);
    console.log('session cap id:', sessionCapId);
  }

  console.log('owner address:', ownerAddress);
  console.log('delegate address:', delegateAddress);

  const key = [toBytes(recordKey)];

  const nonceBefore = await delegateDubhe.getSessionCapNextNonce({
    frameworkPackageId,
    sessionCapId,
    refresh: true
  });
  console.log('session nonce before:', nonceBefore.toString());

  const setResp = await delegateDubhe.setRecordWithSessionCap({
    frameworkPackageId,
    dappHubId,
    dappKeyType,
    key,
    value: [u32Le(recordValue)],
    sessionRegistryId,
    sessionCapId,
    offchain: false
  });
  console.log('setRecord digest:', setResp.digest);

  const nonceAfterSet = await delegateDubhe.getSessionCapNextNonce({
    frameworkPackageId,
    sessionCapId,
    refresh: false
  });
  console.log('session nonce after setRecord:', nonceAfterSet.toString());

  const deleteResp = await delegateDubhe.deleteRecordWithSessionCap({
    frameworkPackageId,
    dappHubId,
    dappKeyType,
    key,
    sessionRegistryId,
    sessionCapId
  });
  console.log('deleteRecord digest:', deleteResp.digest);

  const nonceAfterDelete = await delegateDubhe.getSessionCapNextNonce({
    frameworkPackageId,
    sessionCapId,
    refresh: false
  });
  console.log('session nonce after deleteRecord:', nonceAfterDelete.toString());

  const revokeResp = await delegateDubhe.revokeSessionCap({
    frameworkPackageId,
    sessionCapId
  });
  console.log('revokeSessionCap digest:', revokeResp.digest);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
