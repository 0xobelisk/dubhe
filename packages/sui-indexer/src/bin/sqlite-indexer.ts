#!/usr/bin/env node
import 'dotenv/config';
// import fs from "node:fs";
// import { eq } from "drizzle-orm";
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
// import { webSocket, http, Transport } from "viem";
import Koa from 'koa';
import cors from '@koa/cors';
import { createKoaMiddleware } from 'trpc-koa-adapter';
// import { createAppRouter } from "@latticexyz/store-sync/trpc-indexer";
// import { chainState, schemaVersion, syncToSqlite } from "@latticexyz/store-sync/sqlite";
import { createQueryAdapter } from '../sqlite/createQueryAdapter';
// import { isDefined } from "@latticexyz/common/utils";
// import { combineLatest, filter, first } from "rxjs";
import { healthcheck } from '../koa-middleware/healthcheck';
import { helloWorld } from '../koa-middleware/helloWorld';
import { apiRoutes } from '../sqlite/apiRoutes';
import { sentry } from '../koa-middleware/sentry';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import {
	dubheStoreEvents,
	dubheStoreTransactions,
	insertTx,
	OperationType,
	syncToSqlite,
} from '../utils/tables';
import { desc, sql } from 'drizzle-orm';
import { metrics } from '../koa-middleware/metrics';
import { createAppRouter } from '../sqlite/createAppRouter';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getSchemaId } from '../utils/read-history';
import { loadConfig, DubheConfig } from '@0xobelisk/sui-common';

const argv = await yargs(hideBin(process.argv))
	.option('network', {
		type: 'string',
		choices: ['mainnet', 'testnet', 'localnet'],
		default: 'localnet',
		desc: 'Node network (mainnet/testnet/localnet)',
	})
	.option('config-path', {
		type: 'string',
		default: 'dubhe.config.ts',
		desc: 'Configuration file path',
	})
	.option('schema-id', {
		type: 'string',
		description: 'Schema ID to filter transactions',
		// demandOption: true,
	})
	.option('host', {
		type: 'string',
		description: 'Host to listen on',
		default: '0.0.0.0',
	})
	.option('port', {
		type: 'number',
		description: 'Port to listen on',
		default: 3001,
	})
	.option('sqlite-filename', {
		type: 'string',
		description: 'SQLite database filename',
		default: './indexer.db',
	})
	.option('sync-limit', {
		type: 'number',
		description: 'Number of transactions to sync per time',
		default: 50,
	})
	.option('default-page-size', {
		type: 'number',
		description: 'Default page size for pagination',
		default: 10,
	})
	.option('pagination-limit', {
		type: 'number',
		description: 'Maximum pagination limit',
		default: 100,
	})
	.option('sentry-dsn', {
		type: 'string',
		description: 'Sentry DSN for error tracking',
	})
	.help().argv;

// console.log(argv);

// const transports: Transport[] = [
//   // prefer WS when specified
//   env.RPC_WS_URL ? webSocket(env.RPC_WS_URL) : undefined,
//   // otherwise use or fallback to HTTP
//   env.RPC_HTTP_URL ? http(env.RPC_HTTP_URL) : undefined,
// ].filter(isDefined);

const publicClient = new SuiClient({
	url: getFullnodeUrl(argv.network as any),
});

const chainId = await publicClient.getChainIdentifier();
console.log('chainId', chainId);
const database = drizzle(new Database(argv.sqliteFilename));

database.run(
	sql`CREATE TABLE IF NOT EXISTS __dubheStoreTransactions (id INTEGER PRIMARY KEY AUTOINCREMENT, checkpoint INTEGER, digest TEXT, created_at TEXT)`
);
database.run(sql`
        CREATE TABLE IF NOT EXISTS __dubheStoreSchemas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            last_update_checkpoint TEXT,
            last_update_digest TEXT,
            name TEXT,
            key1 TEXT,
            key2 TEXT,
            value TEXT,
            is_removed BOOLEAN DEFAULT FALSE,
			created_at TEXT,
			updated_at TEXT
        )`);
database.run(sql`
        CREATE TABLE IF NOT EXISTS __dubheStoreEvents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            checkpoint TEXT,
            digest TEXT,
            name TEXT,
            value TEXT,
			created_at TEXT
        )`);

async function getLastTxRecord(
	sqliteDB: BetterSQLite3Database
): Promise<string | undefined> {
	const txRecord = await sqliteDB
		.select()
		.from(dubheStoreTransactions)
		.orderBy(desc(dubheStoreTransactions.id))
		.limit(1)
		.execute();
	if (txRecord.length === 0) {
		return undefined;
	} else {
		return txRecord[0].digest;
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
		isReady: () => isCaughtUp,
	})
);
app.use(
	metrics({
		isHealthy: () => true,
		isReady: () => isCaughtUp,
		followBlockTag: 'latest',
	})
);
app.use(helloWorld());
app.use(apiRoutes(database, argv.defaultPageSize, argv.paginationLimit));

app.use(
	createKoaMiddleware({
		prefix: '/trpc',
		router: createAppRouter(),
		createContext: async () => ({
			queryAdapter: await createQueryAdapter(database),
		}),
	})
);

const subscriptions = new Map<WebSocket, string[]>();

wss.on('connection', ws => {
	console.log('New client connected');

	ws.on('message', message => {
		const parsedMessage = JSON.parse(message.toString());
		if (parsedMessage.type === 'subscribe' && parsedMessage.names) {
			subscriptions.set(ws, parsedMessage.names);
			console.log(`Client subscribed to event: ${parsedMessage.names}`);
		}
	});

	ws.on('close', () => {
		subscriptions.delete(ws);
		console.log('Client disconnected');
	});
});

server.listen({ host: argv.host, port: argv.port });
console.log(`sqlite indexer frontend exposed on port ${argv.port}`);
console.log(`  - HTTP:   http://${argv.host}:${argv.port}`);
console.log(`  - WS:     ws://${argv.host}:${argv.port}`);
console.log(`  - GraphQL:   http://${argv.host}:${argv.port}/graphql`);
const dubheConfig = (await loadConfig(argv.configPath)) as DubheConfig;

const path = process.cwd();
const projectPath = `${path}/contracts/${dubheConfig.name}`;

const schemaId =
	argv.schemaId || (await getSchemaId(projectPath, argv.network));

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

while (true) {
	await delay(2000);
	const lastTxRecord = await getLastTxRecord(database);
	const response = await publicClient.queryTransactionBlocks({
		filter: {
			ChangedObject: schemaId,
		},
		order: 'ascending',
		cursor: lastTxRecord,
		limit: argv.syncLimit,
		options: {
			showEvents: true,
		},
	});
	const txs = response.data;
	for (const tx of txs) {
		await insertTx(
			database,
			tx.checkpoint?.toString() as string,
			tx.digest,
			tx.timestampMs?.toString() as string
		);
		if (tx.events) {
			for (const event of tx.events) {
				// console.log("EventData: ", event);
				console.log('EventData: ', event.parsedJson);

				// @ts-ignore
				const name: string = event.parsedJson['name'];
				if (name.endsWith('_event')) {
					await database.insert(dubheStoreEvents).values({
						checkpoint: tx.checkpoint?.toString() as string,
						digest: tx.digest,
						created_at: tx.timestampMs?.toString() as string,
						name: name,
						// @ts-ignore
						value: event.parsedJson['value'],
					});
					// Broadcast the event to subscribed WebSocket clients
					wss.clients.forEach(client => {
						if (
							client.readyState === client.OPEN &&
							subscriptions.get(client)?.includes(name)
						) {
							// @ts-ignore
							const value = event.parsedJson['value'];
							if (typeof value === 'object') {
								client.send(JSON.stringify(value['fields']));
							} else {
								client.send(JSON.stringify(value));
							}
						}
					});
					// @ts-ignore
				} else if (event.parsedJson.hasOwnProperty('value')) {
					await syncToSqlite(
						database,
						tx.checkpoint?.toString() as string,
						tx.digest,
						tx.timestampMs?.toString() as string,
						event.parsedJson,
						OperationType.Set
					);
					// Broadcast the event to subscribed WebSocket clients
					wss.clients.forEach(client => {
						if (
							client.readyState === client.OPEN &&
							subscriptions.get(client)?.includes(name)
						) {
							client.send(JSON.stringify(event.parsedJson));
						}
					});
				} else {
					await syncToSqlite(
						database,
						tx.checkpoint?.toString() as string,
						tx.digest,
						tx.timestampMs?.toString() as string,
						event.parsedJson,
						OperationType.Remove
					);
					// Broadcast the event to subscribed WebSocket clients
					wss.clients.forEach(client => {
						if (
							client.readyState === client.OPEN &&
							subscriptions.get(client)?.includes(name)
						) {
							client.send(JSON.stringify(event.parsedJson));
						}
					});
				}
			}
		}
	}
}
