import { Dubhe, Transaction } from '@0xobelisk/sui-client';
import { getRuntimeConfig, parseBooleanEnv, parseU64Env, requireValue, scriptDir } from './shared';

const runtime = getRuntimeConfig(scriptDir(import.meta.url));
const privateKey = requireValue('PRIVATE_KEY', runtime.privateKey);
const packageId = requireValue('EXTENSION_PACKAGE_ID or generated PACKAGE_ID', runtime.packageId);
const dappHubId = requireValue('DUBHE_SCHEMA_ID or generated DUBHE_SCHEMA_ID', runtime.dappHubId);

const maxUnits = parseU64Env('MAX_UNITS_PER_CALL', 50n);
const actionUnits = parseU64Env('ACTION_UNITS', 10n);
const nonce = parseU64Env('ACTION_NONCE', BigInt(Date.now()));
const shouldInit = parseBooleanEnv('FLOW_INIT', true);
const ignoreInitError = parseBooleanEnv('FLOW_IGNORE_INIT_ERROR', true);
const waitForConfirmation = parseBooleanEnv('FLOW_WAIT_CONFIRM', true);
const maxAttempts = Math.max(1, Number.parseInt(process.env.FLOW_MAX_ATTEMPTS ?? '3', 10) || 3);
const retryDelayMs = Math.max(
  0,
  Number.parseInt(process.env.FLOW_RETRY_DELAY_MS ?? '800', 10) || 800
);
const postTxDelayMs = Math.max(
  0,
  Number.parseInt(process.env.FLOW_POST_TX_DELAY_MS ?? '250', 10) || 250
);

const dubhe = new Dubhe({
  networkType: runtime.network,
  fullnodeUrls: [runtime.rpcUrl],
  secretKey: privateKey
});

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return JSON.stringify(error);
}

function isRetryableError(error: unknown): boolean {
  const msg = extractErrorMessage(error).toLowerCase();
  return (
    msg.includes('could not automatically determine a budget') ||
    msg.includes('is not available for consumption') ||
    msg.includes('transaction is rejected as invalid by more than 1/3') ||
    msg.includes('failed to send transaction with all fullnodes')
  );
}

async function runCall(
  label: string,
  target: `${string}::${string}::${string}`,
  buildArgs: (tx: Transaction) => any[]
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const tx = new Transaction();
      const args = buildArgs(tx);
      tx.moveCall({
        target,
        arguments: args
      });

      const result = await dubhe.signAndSendTxn({ tx });
      const status = result.effects?.status.status;
      console.log(
        `[${label}] digest=${result.digest} status=${status} attempt=${attempt}/${maxAttempts}`
      );

      if (status !== 'success') {
        throw new Error(`[${label}] failed: ${result.effects?.status.error ?? 'unknown error'}`);
      }

      if (waitForConfirmation) {
        await dubhe.waitForTransaction(result.digest);
      }
      if (postTxDelayMs > 0) {
        await delay(postTxDelayMs);
      }

      return result;
    } catch (error) {
      if (attempt >= maxAttempts || !isRetryableError(error)) {
        throw error;
      }
      const waitMs = retryDelayMs * attempt;
      console.warn(
        `[${label}] transient error, retrying in ${waitMs}ms (${attempt}/${
          maxAttempts - 1
        } retries): ${extractErrorMessage(error)}`
      );
      await delay(waitMs);
    }
  }

  throw new Error(`[${label}] exhausted retries`);
}

console.log(`network: ${runtime.network}`);
console.log(`rpc: ${runtime.rpcUrl}`);
console.log(`sender: ${dubhe.getAddress()}`);
console.log(`packageId: ${packageId}`);
console.log(`dappHub: ${dappHubId}`);

if (shouldInit) {
  try {
    await runCall('initialize', `${packageId}::extension_system::initialize`, (tx) => [
      tx.object(dappHubId),
      tx.pure.u64(maxUnits)
    ]);
  } catch (error) {
    if (!ignoreInitError) {
      throw error;
    }
    console.warn(`[initialize] ignored error: ${(error as Error).message}`);
  }
}

await runCall('update_config', `${packageId}::extension_system::update_config`, (tx) => [
  tx.object(dappHubId),
  tx.pure.bool(false),
  tx.pure.u64(maxUnits)
]);

const actionResult = await runCall(
  'record_action',
  `${packageId}::extension_system::record_action`,
  (tx) => [tx.object(dappHubId), tx.pure.u64(actionUnits), tx.pure.u64(nonce)]
);

const actionEvents = (actionResult.events ?? []).filter((event: { type: string }) =>
  event.type.endsWith('::ActionRecorded')
);
console.log(`recorded events: ${actionEvents.length}`);
if (actionEvents.length > 0) {
  console.log(
    JSON.stringify(
      actionEvents.map((event: { parsedJson?: unknown }) => event.parsedJson),
      null,
      2
    )
  );
}
