import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { SuiClient } from '@mysten/sui/client';
import { setupManagedE2EServices, type ManagedE2EServices } from './services.js';

function hasCommand(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const autoServices = process.env.DUBHE_E2E_AUTO_SERVICES === '1';
const canRun = autoServices && hasCommand('docker') && hasCommand('sui');

describe.skipIf(!canRun)('Integration: managed e2e services', () => {
  let services: ManagedE2EServices;

  beforeAll(async () => {
    services = await setupManagedE2EServices({
      localnet: true,
      postgres: true
    });
  }, 120_000);

  afterAll(async () => {
    await services?.teardown();
  }, 30_000);

  it('starts or reuses localnet and Postgres for indexer tests', async () => {
    const client = new SuiClient({ url: 'http://127.0.0.1:9000' });
    const chainIdentifier = await client.getChainIdentifier();

    expect(chainIdentifier).toBeTruthy();
    expect(services.checkpointUrl).toBeTruthy();
    expect(services.databaseUrl).toContain('postgres://');
  });
});
