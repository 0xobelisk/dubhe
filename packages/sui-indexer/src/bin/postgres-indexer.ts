#!/usr/bin/env node
import 'dotenv/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import Koa from 'koa';
import cors from '@koa/cors';
import { createKoaMiddleware } from 'trpc-koa-adapter';
import { createQueryAdapter } from '../postgres/createQueryAdapter';
import { healthcheck } from '../koa-middleware/healthcheck';
import { helloWorld } from '../koa-middleware/helloWorld';
import { apiRoutes } from '../postgres/apiRoutes';
import { sentry } from '../koa-middleware/sentry';
import { SuiClient } from '@mysten/sui/client';
import {
  // clearDatabase,
  dubheStoreTransactions,
  // OperationType,
  // setupDatabase,
  // syncToPostgres,
  bulkInsertTx,
  bulkInsertEvents,
  bulkUpsertSchemas
} from '../postgres/tables';
import { desc } from 'drizzle-orm';
import { metrics } from '../koa-middleware/metrics';
import { createAppRouter } from '../postgres/createAppRouter';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getSchemaId } from '../utils/read-history';
import { DubheConfig, loadConfig, parseData, SubscribableType } from '@0xobelisk/sui-common';
import pino, { Logger } from 'pino';

const argv = await yargs(hideBin(process.argv))
  .option('network', {
    type: 'string',
    choices: ['localnet', 'testnet', 'mainnet'],
    default: 'localnet',
    desc: 'Node network (mainnet/testnet/localnet)'
  })
  .option('config-path', {
    type: 'string',
    default: 'dubhe.config.ts',
    desc: 'Configuration file path'
  })
  .option('force-regenesis', {
    type: 'boolean',
    default: false,
    desc: 'Force regenesis'
  })
  .option('rpc-url', {
    type: 'string',
    description: 'Node URL'
  })
  .option('schema-id', {
    type: 'string',
    description: 'Schema ID to filter transactions'
  })
  .option('host', {
    type: 'string',
    description: 'Host to listen on',
    default: '0.0.0.0'
  })
  .option('port', {
    type: 'number',
    description: 'Port to listen on',
    default: 3001
  })
  .option('database-url', {
    type: 'string',
    description: 'Database URL',
    default: 'postgres://postgres:postgres@127.0.0.1:5432/postgres'
  })
  .option('sync-limit', {
    type: 'number',
    description: 'Number of transactions to sync per time (Max: 50)',
    default: 50
  })
  .option('sync-interval', {
    type: 'number',
    description: 'Number of milliseconds to wait between syncs',
    default: 1000
  })
  .option('default-page-size', {
    type: 'number',
    description: 'Default page size for pagination',
    default: 10
  })
  .option('pagination-limit', {
    type: 'number',
    description: 'Maximum pagination limit',
    default: 100
  })
  .option('sentry-dsn', {
    type: 'string',
    description: 'Sentry DSN for error tracking'
  })
  .option('debug', {
    type: 'boolean',
    description: 'Debug mode',
    default: false
  })
  .help('help')
  .alias('help', 'h').argv;

const logger: Logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss'
      // ignore: 'pid,hostname',
    }
  }
});

function getFullnodeUrl(network: 'mainnet' | 'testnet' | 'localnet'): string {
  switch (network) {
    case 'mainnet':
      return 'https://rpc-mainnet.suiscan.xyz/';
    case 'testnet':
      return 'https://rpc-testnet.suiscan.xyz/';
    case 'localnet':
      return 'http://127.0.0.1:9000/';
    default:
      throw new Error('Invalid network type');
  }
}

const rpcUrl = argv.rpcUrl || getFullnodeUrl(argv.network as 'mainnet' | 'testnet' | 'localnet');

const publicClient = new SuiClient({
  url: rpcUrl
});

const pgConnection = postgres(argv.databaseUrl, { prepare: false });
const database = drizzle(pgConnection, {
  logger: argv.debug
    ? {
        logQuery: (query, params) => {
          logger.info(`Executing SQL: ${query} - Params: ${JSON.stringify(params)}`);
        }
      }
    : undefined
});

// if (argv.forceRegenesis) {
//   clearDatabase(database);
// }
// setupDatabase(database);

async function getLastTxRecord(
  database: PostgresJsDatabase
): Promise<{ cursor: string | undefined; checkpoint: string | undefined }> {
  const txRecord = await database
    .select()
    .from(dubheStoreTransactions)
    .orderBy(desc(dubheStoreTransactions.id))
    .limit(1)
    .execute();
  if (txRecord.length === 0) {
    return { cursor: undefined, checkpoint: undefined };
  } else {
    return {
      cursor: txRecord[0].cursor,
      checkpoint: txRecord[0].checkpoint
    };
  }
}

let isCaughtUp = false;
// combineLatest([latestBlockNumber$, storedBlockLogs$])
//   .pipe(
//     filter(
//       ([latestBlockNumber, { blockNumber: lastBlockNumberProcessed }]) =>
//         latestBlockNumber === lastBlockNumberProcessed,
//     ),
//     first(),
//   )
//   .subscribe(() => {
//     isCaughtUp = true;
//     console.log("all caught up");
//   });

const app = new Koa();
const server = createServer(app.callback());
const wss = new WebSocketServer({ server });

if (argv.sentryDsn) {
  app.use(sentry(argv.sentryDsn));
}

app.use(cors());
app.use(
  healthcheck({
    isReady: () => isCaughtUp
  })
);
app.use(
  metrics({
    isHealthy: () => true,
    isReady: () => isCaughtUp,
    followBlockTag: 'latest'
  })
);
app.use(helloWorld());
app.use(apiRoutes(database, argv.defaultPageSize, argv.paginationLimit));

app.use(
  createKoaMiddleware({
    prefix: '/trpc',
    router: createAppRouter(),
    createContext: async () => ({
      queryAdapter: await createQueryAdapter(database)
    })
  })
);

const subscriptions = new Map<WebSocket, SubscribableType[]>();

wss.on('connection', (ws) => {
  logger.info('New client connected');

  ws.on('message', (message) => {
    const subs: SubscribableType[] = JSON.parse(message.toString());
    if (subs) {
      subscriptions.set(ws, subs);
      logger.info(`Client subscribed to event: ${message.toString()}`);
    }
  });

  ws.on('close', () => {
    subscriptions.delete(ws);
    logger.info('Client disconnected');
  });
});

server.listen({ host: argv.host, port: argv.port });
logger.info(`postgres indexer frontend exposed on port ${argv.port}`);
logger.info(`  - HTTP:   http://${argv.host}:${argv.port}`);
logger.info(`  - WS:     ws://${argv.host}:${argv.port}`);
logger.info(`  - GraphQL:   http://${argv.host}:${argv.port}/graphql`);
const dubheConfig = (await loadConfig(argv.configPath)) as DubheConfig;

const path = process.cwd();
const projectPath = `${path}/src/${dubheConfig.name}`;

const schemaId = argv.schemaId || (await getSchemaId(projectPath, argv.network));

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const syncInterval = argv.network === 'localnet' ? 500 : argv.syncInterval;

// Batch deduplication function, ensuring (name, key1, key2) uniqueness
// Optimized for high throughput (300+ records per second)
function deduplicateSchemas(
  schemas: Array<{
    last_update_checkpoint: string;
    last_update_digest: string;
    name: string;
    key1: string | null;
    key2: string | null;
    value: string | null;
    is_removed: boolean;
    created_at: string;
    updated_at: string;
  }>
) {
  // For high-throughput scenarios, use a more efficient approach
  // Pre-allocate result array to avoid resizing
  const resultArray = new Array(Math.floor(schemas.length * 0.75)); // Estimate 25% duplicates
  let resultCount = 0;

  // Use Map to store the latest records (determined by checkpoint value)
  // Pre-size the Map with expected capacity
  const map = new Map<string, number>(); // key -> index in resultArray

  for (let i = 0; i < schemas.length; i++) {
    const s = schemas[i];
    const key = `${s.name}|${s.key1 ?? ''}|${s.key2 ?? ''}`;

    const existingIndex = map.get(key);
    if (existingIndex === undefined) {
      // New entry
      if (resultCount < resultArray.length) {
        resultArray[resultCount] = s;
      } else {
        // Resize if needed (should be rare due to pre-allocation)
        resultArray.push(s);
      }
      map.set(key, resultCount);
      resultCount++;
    } else if (
      Number(s.last_update_checkpoint) > Number(resultArray[existingIndex].last_update_checkpoint)
    ) {
      // Update existing entry with newer data
      resultArray[existingIndex] = s;
    }
  }

  // Return only the used portion of the array
  return resultCount === resultArray.length ? resultArray : resultArray.slice(0, resultCount);
}

// Sync progress monitoring data
interface SyncProgress {
  startTime: number;
  startCheckpoint: number;
  lastCheckTime: number;
  lastCheckpoint: number;
  latestCheckpoint: number;
  syncRate: number; // checkpoints/second
}

const syncProgress: SyncProgress = {
  startTime: Date.now(),
  startCheckpoint: 0,
  lastCheckTime: Date.now(),
  lastCheckpoint: 0,
  latestCheckpoint: 0,
  syncRate: 0
};

// Update sync progress
async function updateSyncProgress(publicClient: SuiClient, currentCheckpoint: number) {
  const now = Date.now();

  // Check progress every 30 seconds
  const checkInterval = 120000;
  // Check progress every 120 seconds
  if (now - syncProgress.lastCheckTime < checkInterval) {
    return;
  }

  try {
    // Get the latest checkpoint from the chain
    const latestCheckpointData = await publicClient.getLatestCheckpointSequenceNumber();
    const latestCheckpoint = Number(latestCheckpointData);

    // Update progress data
    if (syncProgress.startCheckpoint === 0) {
      // Initialize starting values
      syncProgress.startCheckpoint = currentCheckpoint;
      syncProgress.lastCheckpoint = currentCheckpoint;
      syncProgress.latestCheckpoint = latestCheckpoint;
      syncProgress.lastCheckTime = now;
      return;
    }

    // Calculate sync rate (checkpoints/second)
    const elapsedSeconds = (now - syncProgress.lastCheckTime) / 1000;
    const checkpointsDone = currentCheckpoint - syncProgress.lastCheckpoint;

    if (elapsedSeconds > 0) {
      syncProgress.syncRate = checkpointsDone / elapsedSeconds;
    }

    // Calculate remaining time
    const remainingCheckpoints = latestCheckpoint - currentCheckpoint;
    let estimatedSeconds =
      syncProgress.syncRate > 0 ? remainingCheckpoints / syncProgress.syncRate : 0;

    // Format time in a human-readable format
    let timeRemaining = 'unknown';
    if (syncProgress.syncRate > 0) {
      const hours = Math.floor(estimatedSeconds / 3600);
      const minutes = Math.floor((estimatedSeconds % 3600) / 60);
      const seconds = Math.floor(estimatedSeconds % 60);

      timeRemaining =
        hours > 0
          ? `${hours}h ${minutes}m`
          : minutes > 0
            ? `${minutes}m ${seconds}s`
            : `${seconds}s`;
    }

    // Calculate progress percentage
    const totalToSync = latestCheckpoint - syncProgress.startCheckpoint;
    const syncedSoFar = currentCheckpoint - syncProgress.startCheckpoint;
    const progressPercent =
      totalToSync > 0 ? ((syncedSoFar / totalToSync) * 100).toFixed(2) : '0.00';

    // Output progress information
    logger.info(`========== Sync Progress Report ==========`);
    logger.info(
      `Current checkpoint: ${currentCheckpoint} / ${latestCheckpoint} (${progressPercent}%)`
    );
    logger.info(`Sync speed: ${(syncProgress.syncRate * 60).toFixed(2)} checkpoints/minute`);
    logger.info(`Estimated time remaining: ${timeRemaining}`);
    logger.info(`Distance to chain head: ${remainingCheckpoints} checkpoints`);
    logger.info(`==========================================`);

    // Update last check time and checkpoint
    syncProgress.lastCheckTime = now;
    syncProgress.lastCheckpoint = currentCheckpoint;
    syncProgress.latestCheckpoint = latestCheckpoint;
  } catch (error) {
    logger.error(`Error updating sync progress: ${error}`);
  }
}

while (true) {
  const lastTxRecord = await getLastTxRecord(database);
  await delay(syncInterval);
  if (argv.debug) {
    logger.info('Syncing transactions...');
  }

  // Get current checkpoint for progress tracking
  const currentCheckpoint = lastTxRecord.checkpoint ? Number(lastTxRecord.checkpoint) : 0;

  // Update sync progress
  await updateSyncProgress(publicClient, currentCheckpoint);

  // Record start time for processing
  const processingStartTime = Date.now();

  let response = await publicClient.queryTransactionBlocks({
    filter: {
      ChangedObject: schemaId
    },
    order: 'ascending',
    cursor: lastTxRecord.cursor,
    limit: argv.syncLimit,
    options: {
      showEvents: true,
      showInput: true
    }
  });

  const responseEndTime = Date.now();
  const responseTimeMs = responseEndTime - processingStartTime;

  logger.info(`==== Number of transactions fetched in this batch: ${response.data.length} ====`);

  // Pre-allocate arrays with optimal capacity for high throughput
  const txInserts: Array<{
    sender: string;
    checkpoint: string;
    digest: string;
    pkg: string;
    mod: string;
    func: string;
    args: string;
    cursor: string;
    created_at: string;
  }> = [];

  const eventInserts: Array<{
    sender: string;
    checkpoint: string;
    digest: string;
    name: string;
    value: string;
    created_at: string;
  }> = [];

  const schemaSetInserts: Array<{
    last_update_checkpoint: string;
    last_update_digest: string;
    name: string;
    key1: string | null;
    key2: string | null;
    value: string | null;
    is_removed: boolean;
    created_at: string;
    updated_at: string;
  }> = [];

  // Measure data extraction time
  const extractionStartTime = Date.now();

  // Process all transactions
  for (const tx of response.data as any[]) {
    const sender = tx.transaction?.data?.sender;
    const checkpoint = tx.checkpoint?.toString() ?? '0';
    const timestamp = tx.timestampMs?.toString() ?? Date.now().toString();

    if (argv.debug) {
      logger.info(`tx.digest: ${tx.digest}`);
      logger.info(`tx: ${JSON.stringify(tx)}`);
      logger.info(`tx.checkpoint: ${tx.checkpoint}`);
      logger.info(`tx.timestampMs: ${tx.timestampMs}`);
    }

    // Collect moveCalls
    const moveCalls: any[] = [];
    if (tx.transaction?.data?.transaction?.transactions) {
      for (const item of tx.transaction.data.transaction.transactions) {
        if (item.MoveCall) moveCalls.push(item.MoveCall);
      }
    }

    // Process MoveCalls
    for (const moveCall of moveCalls) {
      txInserts.push({
        sender,
        checkpoint,
        digest: tx.digest ?? '',
        pkg: moveCall.package,
        mod: moveCall.module,
        func: moveCall.function,
        args: JSON.stringify(tx.transaction?.data?.transaction?.inputs ?? []),
        cursor: tx.digest ?? '',
        created_at: timestamp
      });
    }

    // Process events if they exist
    const events: any[] = tx.events || [];
    for (const event of events) {
      const parsedJson = event.parsedJson as any;
      const name = parsedJson['name'];

      if (name && typeof name === 'string') {
        if (name.endsWith('_event')) {
          // Event processing
          let eventData = parseData({
            sender,
            name,
            value: parsedJson['value']
          });

          // Convert value to string if it's an object
          const eventValue =
            typeof eventData.value === 'object' ? JSON.stringify(eventData.value) : eventData.value;

          eventInserts.push({
            sender,
            checkpoint,
            digest: tx.digest ?? '',
            name,
            value: eventValue,
            created_at: timestamp
          });
        } else {
          // Schema processing
          const parsed = parseData(parsedJson);
          const hasValue = Object.prototype.hasOwnProperty.call(parsedJson, 'value');

          // Convert value to string if it's an object
          const schemaValue = hasValue
            ? typeof parsed.value === 'object'
              ? JSON.stringify(parsed.value)
              : parsed.value
            : null;

          schemaSetInserts.push({
            last_update_checkpoint: checkpoint,
            last_update_digest: tx.digest ?? '',
            name,
            key1: parsed.key1 ?? null,
            key2: parsed.key2 ?? null,
            value: schemaValue,
            is_removed: !hasValue,
            created_at: timestamp,
            updated_at: timestamp
          });
        }
      }
    }
  }

  // If no events were found in any transaction, continue to next batch
  if (txInserts.length === 0 && eventInserts.length === 0 && schemaSetInserts.length === 0) {
    logger.info('No events found in any transaction in this batch, continuing to next batch...');
    continue;
  }

  const extractionEndTime = Date.now();
  const extractionTimeMs = extractionEndTime - extractionStartTime;

  logger.info(`txInserts count: ${txInserts.length}`);
  logger.info(`eventInserts count: ${eventInserts.length}`);

  // Measure database operation time
  const dbStartTime = Date.now();

  // Optimize database write logic for high throughput
  await database.transaction(async (trx) => {
    // Process in parallel but with optimal batch sizes
    const operations = [];

    if (txInserts.length > 0) {
      operations.push(bulkInsertTx(trx, txInserts));
    }

    if (eventInserts.length > 0) {
      operations.push(bulkInsertEvents(trx, eventInserts));
    }

    if (schemaSetInserts.length > 0) {
      // Deduplicate schemas before writing to database
      const dedupedSchemaSetInserts = deduplicateSchemas(schemaSetInserts);
      logger.info(`dedupedSchemaSetInserts count: ${dedupedSchemaSetInserts.length}`);
      operations.push(bulkUpsertSchemas(trx, dedupedSchemaSetInserts));
    }

    // Execute all operations in parallel
    await Promise.all(operations);
  });

  const dbEndTime = Date.now();
  const dbOperationTimeMs = dbEndTime - dbStartTime;

  // Calculate total processing time
  const processingEndTime = Date.now();
  const totalProcessingTimeMs = processingEndTime - processingStartTime;

  // Log detailed timing information
  logger.info(`Response time: ${responseTimeMs}ms`);
  logger.info(`Data extraction time: ${extractionTimeMs}ms`);
  logger.info(`Database operation time: ${dbOperationTimeMs}ms`);
  logger.info(`Total processing time: ${totalProcessingTimeMs}ms`);
  logger.info(`====================================`);

  // Help garbage collection by clearing large arrays
  txInserts.length = 0;
  eventInserts.length = 0;
  schemaSetInserts.length = 0;
}
