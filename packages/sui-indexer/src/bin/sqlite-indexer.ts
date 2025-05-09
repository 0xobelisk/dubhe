#!/usr/bin/env node
import 'dotenv/config';
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import Koa from 'koa';
import cors from '@koa/cors';
import { createKoaMiddleware } from 'trpc-koa-adapter';
import { createQueryAdapter } from '../sqlite/createQueryAdapter';
import { healthcheck } from '../koa-middleware/healthcheck';
import { helloWorld } from '../koa-middleware/helloWorld';
import { apiRoutes } from '../sqlite/apiRoutes';
import { sentry } from '../koa-middleware/sentry';
import { SuiClient } from '@mysten/sui/client';
import {
  clearDatabase,
  dubheStoreEvents,
  dubheStoreTransactions,
  insertTx,
  OperationType,
  setupDatabase,
  syncToSqlite
} from '../utils/tables';
import { desc } from 'drizzle-orm';
import { metrics } from '../koa-middleware/metrics';
import { createAppRouter } from '../sqlite/createAppRouter';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getSchemaId } from '../utils/read-history';
import {
  DubheConfig,
  loadConfig,
  parseData,
  SubscribableType,
  SubscriptionKind
} from '@0xobelisk/sui-common';
import fs from 'fs';
import pathModule from 'path';
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
  .option('sqlite-filename', {
    type: 'string',
    description: 'SQLite database filename',
    default: '.data/indexer.db'
  })
  .option('sync-limit', {
    type: 'number',
    description: 'Number of transactions to sync per time',
    default: 50
  })
  .option('sync-interval', {
    type: 'number',
    description: 'Number of milliseconds to wait between syncs',
    default: 2000
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

const ensureDirectoryExists = function (filePath: string) {
  const dir = pathModule.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDirectoryExists(argv.sqliteFilename);
const database = drizzle(new Database(argv.sqliteFilename));
if (argv.forceRegenesis) {
  clearDatabase(database);
}
setupDatabase(database);

async function getLastTxRecord(
  sqliteDB: BetterSQLite3Database
): Promise<{ cursor: string | undefined; checkpoint: string | undefined }> {
  const txRecord = await sqliteDB
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
logger.info(`sqlite indexer frontend exposed on port ${argv.port}`);
logger.info(`  - HTTP:   http://${argv.host}:${argv.port}`);
logger.info(`  - WS:     ws://${argv.host}:${argv.port}`);
logger.info(`  - GraphQL:   http://${argv.host}:${argv.port}/graphql`);
const dubheConfig = (await loadConfig(argv.configPath)) as DubheConfig;

const path = process.cwd();
const projectPath = `${path}/src/${dubheConfig.name}`;

const schemaId = argv.schemaId || (await getSchemaId(projectPath, argv.network));

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const syncInterval = argv.network === 'localnet' ? 500 : argv.syncInterval;

while (true) {
  const lastTxRecord = await getLastTxRecord(database);
  await delay(syncInterval);
  if (argv.debug) {
    logger.info('Syncing transactions...');
  }
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

  const txs = response.data.map((tx) => ({
    ...tx,
    cursor: tx.digest,
    sender: tx.transaction?.data?.sender
  }));

  for (const tx of txs) {
    if (tx.events && tx.events.length !== 0) {
      // @ts-ignore
    for (const moveCall  of tx.transaction?.data?.transaction?.transactions) {
      if (moveCall.MoveCall) {
        await insertTx(
          database,
          // @ts-ignore
          tx.sender,
          tx.checkpoint?.toString() as string,
          tx.digest,
          moveCall.MoveCall.package,
          moveCall.MoveCall.module,
          moveCall.MoveCall.function,
          // @ts-ignore
          tx.transaction?.data?.transaction?.inputs,
          tx.cursor,
          tx.timestampMs?.toString() as string
        );
      }
    }

  if (tx.events) {
      for (const event of tx.events) {
        logger.info(`${JSON.stringify(event.parsedJson)}`);

        // @ts-ignore
        const name: string = event.parsedJson['name'];
        if (name.endsWith('_event')) {
          const eventData = parseData({
            sender: tx.sender,
            name,
            // @ts-ignore
            value: event.parsedJson['value']
          });
          // Broadcast the event to subscribed WebSocket clients
          wss.clients.forEach((client) => {
            if (client.readyState !== client.OPEN) return;
            const clientSubs = subscriptions.get(client);
            if (!clientSubs) return;
            clientSubs.forEach((sub) => {
              if (
                sub.kind === SubscriptionKind.Event &&
                (!sub.name || sub.name === name.replace('_event', '')) &&
                (!sub.sender || sub.sender === tx.sender)
              ) {
                eventData.name = sub.name || name.replace('_event', '');
                client.send(JSON.stringify(eventData));
              }
            });
          });
          await database.insert(dubheStoreEvents).values(
            parseData({
              sender: tx.sender,
              checkpoint: tx.checkpoint?.toString() as string,
              digest: tx.digest,
              created_at: tx.timestampMs?.toString() as string,
              name: name,
              // @ts-ignore
              value: event.parsedJson['value']
            })
          );
          // Handle schema set events
          // @ts-ignore
        } else if (event.parsedJson.hasOwnProperty('value')) {
          const schemaData = parseData(event.parsedJson);
          wss.clients.forEach((client) => {
            if (client.readyState !== client.OPEN) return;

            const clientSubs = subscriptions.get(client);
            if (!clientSubs) return;
            clientSubs.forEach((sub) => {
              if (sub.kind === SubscriptionKind.Schema && (!sub.name || sub.name === name)) {
                client.send(JSON.stringify(schemaData));
              }
            });
          });
          await syncToSqlite(
            database,
            tx.checkpoint?.toString() as string,
            tx.digest,
            tx.timestampMs?.toString() as string,
            event.parsedJson,
            OperationType.Set
          );
        } else {
          const schemaData = {
            // @ts-ignore
            ...event.parsedJson,
            value: null
          };
          wss.clients.forEach((client) => {
            if (client.readyState !== client.OPEN) return;

            const clientSubs = subscriptions.get(client);
            if (!clientSubs) return;

            clientSubs.forEach((sub) => {
              if (sub.kind === SubscriptionKind.Schema && (!sub.name || sub.name === name)) {
                client.send(JSON.stringify(schemaData));
              }
            });
          });

          await syncToSqlite(
            database,
            tx.checkpoint?.toString() as string,
            tx.digest,
            tx.timestampMs?.toString() as string,
            event.parsedJson,
            OperationType.Remove
          );
        }
      }
    }
    } else {
      logger.warn(`No events found for transaction ${tx.digest}`);
      logger.warn(`Please replace rpc-url to get events`);
      logger.warn(`Current rpc-url: ${rpcUrl}`);
    }
  }
}
