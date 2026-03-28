import {
  Dubhe,
  NetworkType,
  SuiTransactionBlockResponse,
  loadMetadata
} from '@0xobelisk/sui-client';

export type SessionFlowMode = 'mock' | 'live';

export interface SessionFlowConfig {
  networkType: NetworkType;
  frameworkPackageId: string;
  appPackageId: string;
  dappHubId: string;
  sessionRegistryId: string;
  dappKeyType?: string;
  ownerSecretKey: string;
  delegateSecretKey: string;
  delegateAddress?: string;
  sessionCapId?: string;
  scopeMask?: number;
  maxUses?: number;
  expiresInMinutes?: number;
  recordKey?: string;
  recordValueU32?: number;
}

export interface SessionFlowInput {
  mode?: SessionFlowMode;
  config?: Partial<SessionFlowConfig>;
}

export interface SessionFlowStep {
  name: string;
  ok: boolean;
  digest?: string;
  detail?: string;
}

export interface SessionFlowResult {
  mode: SessionFlowMode;
  ownerAddress: string;
  delegateAddress: string;
  frameworkPackageId: string;
  appPackageId: string;
  sessionCapId: string;
  dappKeyType: string;
  nonceBeforeSet: string;
  nonceAfterSet: string;
  nonceAfterDelete: string;
  steps: SessionFlowStep[];
}

function toBytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

function u32Le(value: number): number[] {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return Array.from(bytes);
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  return value.trim();
}

function requireNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new Error(`Invalid number field: ${fieldName}`);
  }
  return value;
}

function pickMode(input: SessionFlowInput): SessionFlowMode {
  return input.mode ?? 'mock';
}

function mockResult(): SessionFlowResult {
  const sessionCapId = '0xmocked_session_cap';
  return {
    mode: 'mock',
    ownerAddress: '0xowner_mock',
    delegateAddress: '0xdelegate_mock',
    frameworkPackageId: '0xframework_mock',
    appPackageId: '0xapp_mock',
    sessionCapId,
    dappKeyType: '0xapp_mock::dapp_key::DappKey',
    nonceBeforeSet: '0',
    nonceAfterSet: '1',
    nonceAfterDelete: '2',
    steps: [
      { name: 'createSessionCapWithLimits', ok: true, digest: 'mock-create-digest' },
      { name: 'setRecordWithSessionCap', ok: true, digest: 'mock-set-digest' },
      { name: 'deleteRecordWithSessionCap', ok: true, digest: 'mock-delete-digest' },
      { name: 'revokeSessionCap', ok: true, digest: 'mock-revoke-digest' }
    ]
  };
}

function parseCreatedSessionCapId(
  response: SuiTransactionBlockResponse,
  frameworkPackageId: string
): string | undefined {
  for (const change of response.objectChanges ?? []) {
    if (change.type !== 'created') {
      continue;
    }
    if (change.objectType === `${frameworkPackageId}::session_cap::SessionCap`) {
      return change.objectId;
    }
  }
  return undefined;
}

function normalizeLiveConfig(input: SessionFlowInput): SessionFlowConfig {
  const cfg = input.config ?? {};
  const networkType = requireString(cfg.networkType, 'config.networkType') as NetworkType;
  const frameworkPackageId = requireString(cfg.frameworkPackageId, 'config.frameworkPackageId');
  const appPackageId = cfg.appPackageId?.trim() || frameworkPackageId;

  return {
    networkType,
    frameworkPackageId,
    appPackageId,
    dappHubId: requireString(cfg.dappHubId, 'config.dappHubId'),
    sessionRegistryId: requireString(cfg.sessionRegistryId, 'config.sessionRegistryId'),
    dappKeyType: cfg.dappKeyType?.trim(),
    ownerSecretKey: requireString(cfg.ownerSecretKey, 'config.ownerSecretKey'),
    delegateSecretKey: requireString(cfg.delegateSecretKey, 'config.delegateSecretKey'),
    delegateAddress: cfg.delegateAddress?.trim(),
    sessionCapId: cfg.sessionCapId?.trim(),
    scopeMask: cfg.scopeMask ?? 5,
    maxUses: cfg.maxUses ?? 20,
    expiresInMinutes: cfg.expiresInMinutes ?? 10,
    recordKey: cfg.recordKey?.trim() || 'session-demo',
    recordValueU32: cfg.recordValueU32 ?? 1
  };
}

export async function runSessionFlow(input: SessionFlowInput): Promise<SessionFlowResult> {
  const mode = pickMode(input);
  if (mode === 'mock') {
    return mockResult();
  }

  const config = normalizeLiveConfig(input);
  const metadata = await loadMetadata(config.networkType, config.appPackageId);

  const ownerDubhe = new Dubhe({
    networkType: config.networkType,
    packageId: config.appPackageId,
    metadata,
    secretKey: config.ownerSecretKey
  });
  const delegateDubhe = new Dubhe({
    networkType: config.networkType,
    packageId: config.appPackageId,
    metadata,
    secretKey: config.delegateSecretKey
  });

  const ownerAddress = ownerDubhe.getAddress();
  const delegateAddress = config.delegateAddress || delegateDubhe.getAddress();
  const dappKeyType =
    config.dappKeyType && config.dappKeyType.length > 0
      ? config.dappKeyType
      : `${config.appPackageId}::dapp_key::DappKey`;

  const scopeMask = requireNumber(config.scopeMask, 'config.scopeMask');
  const maxUses = requireNumber(config.maxUses, 'config.maxUses');
  const expiresInMinutes = requireNumber(config.expiresInMinutes, 'config.expiresInMinutes');
  const recordValueU32 = requireNumber(config.recordValueU32, 'config.recordValueU32');

  const steps: SessionFlowStep[] = [];

  let sessionCapId = config.sessionCapId;
  if (!sessionCapId) {
    const expiresAtMs = Date.now() + expiresInMinutes * 60_000;
    const createResponse = await ownerDubhe.createSessionCapWithLimits({
      frameworkPackageId: config.frameworkPackageId,
      sessionRegistryId: config.sessionRegistryId,
      dappKeyType,
      delegate: delegateAddress,
      scopeMask,
      expiresAtMs,
      maxUses
    });
    steps.push({
      name: 'createSessionCapWithLimits',
      ok: createResponse.effects?.status.status === 'success',
      digest: createResponse.digest
    });
    sessionCapId =
      ownerDubhe.getCreatedSessionCapId(createResponse, {
        frameworkPackageId: config.frameworkPackageId
      }) || parseCreatedSessionCapId(createResponse, config.frameworkPackageId);
    if (!sessionCapId) {
      throw new Error('Unable to extract created session cap object id from transaction response.');
    }
  }

  const key = [toBytes(config.recordKey || 'session-demo')];

  const nonceBeforeSet = await delegateDubhe.getSessionCapNextNonce({
    frameworkPackageId: config.frameworkPackageId,
    sessionCapId,
    refresh: true
  });

  const setResponse = await delegateDubhe.setRecordWithSessionCap({
    frameworkPackageId: config.frameworkPackageId,
    dappHubId: config.dappHubId,
    dappKeyType,
    key,
    value: [u32Le(recordValueU32)],
    sessionRegistryId: config.sessionRegistryId,
    sessionCapId,
    offchain: false
  });
  steps.push({
    name: 'setRecordWithSessionCap',
    ok: setResponse.effects?.status.status === 'success',
    digest: setResponse.digest
  });

  const nonceAfterSet = await delegateDubhe.getSessionCapNextNonce({
    frameworkPackageId: config.frameworkPackageId,
    sessionCapId,
    refresh: false
  });

  const deleteResponse = await delegateDubhe.deleteRecordWithSessionCap({
    frameworkPackageId: config.frameworkPackageId,
    dappHubId: config.dappHubId,
    dappKeyType,
    key,
    sessionRegistryId: config.sessionRegistryId,
    sessionCapId
  });
  steps.push({
    name: 'deleteRecordWithSessionCap',
    ok: deleteResponse.effects?.status.status === 'success',
    digest: deleteResponse.digest
  });

  const nonceAfterDelete = await delegateDubhe.getSessionCapNextNonce({
    frameworkPackageId: config.frameworkPackageId,
    sessionCapId,
    refresh: false
  });

  const revokeResponse = await delegateDubhe.revokeSessionCap({
    frameworkPackageId: config.frameworkPackageId,
    sessionCapId
  });
  steps.push({
    name: 'revokeSessionCap',
    ok: revokeResponse.effects?.status.status === 'success',
    digest: revokeResponse.digest,
    detail: 'Session cap is owned by delegate in this flow, so delegate submits revoke.'
  });

  return {
    mode,
    ownerAddress,
    delegateAddress,
    frameworkPackageId: config.frameworkPackageId,
    appPackageId: config.appPackageId ?? config.frameworkPackageId,
    sessionCapId,
    dappKeyType,
    nonceBeforeSet: nonceBeforeSet.toString(),
    nonceAfterSet: nonceAfterSet.toString(),
    nonceAfterDelete: nonceAfterDelete.toString(),
    steps
  };
}
