import { spawn, execFileSync } from 'child_process';
import type { ChildProcess } from 'child_process';
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';

export type ManagedE2EServices = {
  checkpointUrl: string;
  databaseUrl: string;
  postgresContainerName: string;
  postgresDatabase: string;
  localnetStarted: boolean;
  postgresStarted: boolean;
  teardown: () => Promise<void>;
};

type SetupManagedServicesOptions = {
  localnet?: boolean;
  postgres?: boolean;
  forceLocalnet?: boolean;
  postgresContainerName?: string;
  postgresHostPort?: number;
  postgresDatabase?: string;
};

const LOCALNET_RPC = 'http://127.0.0.1:9000';
const LOCALNET_FAUCET = 'http://127.0.0.1:9123';

function commandExists(command: string): boolean {
  try {
    execFileSync('which', [command], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(
  label: string,
  check: () => Promise<boolean>,
  timeoutMs = 60_000,
  intervalMs = 1_000
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await check()) return;
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function isHttpReady(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function isLocalnetReady(): Promise<boolean> {
  try {
    const response = await fetch(LOCALNET_RPC, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sui_getChainIdentifier',
        params: []
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function isTcpPortOpen(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.setTimeout(1_000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function dockerContainerExists(containerName: string): boolean {
  try {
    execFileSync('docker', ['inspect', containerName], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function dockerContainerRunning(containerName: string): boolean {
  try {
    const output = execFileSync('docker', ['inspect', '-f', '{{.State.Running}}', containerName], {
      encoding: 'utf-8'
    }).trim();
    return output === 'true';
  } catch {
    return false;
  }
}

async function startPostgresDocker(options: Required<PostgresOptions>): Promise<boolean> {
  if (!commandExists('docker')) {
    throw new Error('Docker is required for managed Postgres e2e setup.');
  }

  if (dockerContainerExists(options.containerName)) {
    if (!dockerContainerRunning(options.containerName)) {
      execFileSync('docker', ['start', options.containerName], { stdio: 'inherit' });
    }
    await waitForPostgres(options);
    return false;
  }

  if (await isTcpPortOpen('127.0.0.1', options.hostPort)) {
    throw new Error(
      `Port ${options.hostPort} is already in use. Set DUBHE_E2E_POSTGRES_PORT to another port.`
    );
  }

  execFileSync(
    'docker',
    [
      'run',
      '-d',
      '--rm',
      '--name',
      options.containerName,
      '-e',
      'POSTGRES_HOST_AUTH_METHOD=trust',
      '-e',
      `POSTGRES_DB=${options.database}`,
      '-p',
      `${options.hostPort}:5432`,
      'postgres:16-alpine'
    ],
    { stdio: 'inherit' }
  );

  await waitForPostgres(options);
  return true;
}

type PostgresOptions = {
  containerName: string;
  hostPort: number;
  database: string;
};

async function waitForPostgres(options: Required<PostgresOptions>): Promise<void> {
  await waitFor(
    `Postgres container ${options.containerName}`,
    async () => {
      try {
        execFileSync(
          'docker',
          ['exec', options.containerName, 'pg_isready', '-U', 'postgres', '-d', options.database],
          { stdio: 'ignore' }
        );
        return true;
      } catch {
        return false;
      }
    },
    60_000,
    1_000
  );
}

async function startLocalnet(checkpointUrl: string, force: boolean): Promise<ChildProcess | null> {
  if (!commandExists('sui')) {
    throw new Error('sui CLI is required for managed localnet e2e setup.');
  }

  if (!force && (await isLocalnetReady())) {
    return null;
  }

  fs.rmSync(checkpointUrl, { recursive: true, force: true });
  fs.mkdirSync(checkpointUrl, { recursive: true });

  const logDir = path.join(os.tmpdir(), 'dubhe-e2e-services');
  fs.mkdirSync(logDir, { recursive: true });
  const out = fs.openSync(path.join(logDir, 'localnet.out.log'), 'a');
  const err = fs.openSync(path.join(logDir, 'localnet.err.log'), 'a');

  const args = [
    'start',
    '--with-faucet',
    '--force-regenesis',
    '--data-ingestion-dir',
    checkpointUrl
  ];
  const child = spawn('sui', args, {
    env: { ...process.env, RUST_LOG: 'off,sui_node=info' },
    stdio: ['ignore', out, err]
  });

  child.once('exit', (code) => {
    if (code !== null && code !== 0) {
      console.warn(`Managed localnet exited with code ${code}. See ${logDir}/localnet.err.log`);
    }
  });

  await waitFor('localnet RPC', isLocalnetReady, 90_000, 1_000);
  await waitFor('localnet faucet', () => isHttpReady(LOCALNET_FAUCET), 30_000, 1_000);
  return child;
}

function stopChild(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.killed) {
      resolve();
      return;
    }
    child.once('exit', () => resolve());
    child.kill('SIGTERM');
    setTimeout(() => {
      if (child.exitCode === null && !child.killed) child.kill('SIGKILL');
      resolve();
    }, 5_000).unref();
  });
}

export async function setupManagedE2EServices(
  options: SetupManagedServicesOptions = {}
): Promise<ManagedE2EServices> {
  const checkpointUrl =
    process.env.DUBHE_E2E_CHECKPOINT_DIR ?? path.join(os.tmpdir(), 'dubhe-e2e-chk');
  const postgresOptions = {
    containerName: options.postgresContainerName ?? 'dubhe-e2e-postgres',
    hostPort: options.postgresHostPort ?? Number(process.env.DUBHE_E2E_POSTGRES_PORT ?? 5433),
    database: options.postgresDatabase ?? process.env.DUBHE_E2E_POSTGRES_DB ?? 'dubhe_indexer_e2e'
  };
  const databaseUrl =
    process.env.DUBHE_E2E_DATABASE_URL ??
    `postgres://postgres@127.0.0.1:${postgresOptions.hostPort}/${postgresOptions.database}`;

  let localnetProcess: ChildProcess | null = null;
  let postgresStarted = false;

  if (options.postgres ?? true) {
    postgresStarted = await startPostgresDocker(postgresOptions);
  }

  if (options.localnet ?? true) {
    localnetProcess = await startLocalnet(
      checkpointUrl,
      options.forceLocalnet ?? process.env.DUBHE_E2E_FORCE_LOCALNET === '1'
    );
  }

  return {
    checkpointUrl,
    databaseUrl,
    postgresContainerName: postgresOptions.containerName,
    postgresDatabase: postgresOptions.database,
    localnetStarted: localnetProcess !== null,
    postgresStarted,
    teardown: async () => {
      if (localnetProcess) await stopChild(localnetProcess);
      if (postgresStarted) {
        execFileSync('docker', ['rm', '-f', postgresOptions.containerName], { stdio: 'ignore' });
      }
    }
  };
}
