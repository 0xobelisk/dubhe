import { DubheCliError } from './errors';
import {delay, getSchemaId} from './utils';
import { DubheConfig } from '@0xobelisk/sui-common';
import {getFullnodeUrl, SuiClient, SuiTransactionBlockResponse} from "@mysten/sui/client";
import sqlite3 from 'sqlite3';
import {Database, open} from 'sqlite';
import chalk from "chalk";

let sqliteDB: Database;

const createDB = async (name: string) => {
	sqliteDB = await open({
		filename: `./${name}.db`,
		driver: sqlite3.Database
	});
	await createTable(sqliteDB, name);
	await createTxsTable(sqliteDB);
	return sqliteDB;
}
const createTable = async (sqliteDB: Database, name: string) => {
	let sql = `
        CREATE TABLE IF NOT EXISTS ${name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            last_update_checkpoint TEXT,
            last_update_digest TEXT,
            name TEXT,
            key1 TEXT,
            key2 TEXT,
            value TEXT,
            is_removed BOOLEAN DEFAULT FALSE
        )`;
	await sqliteDB.exec(sql);
}

const createTxsTable = async (sqliteDB: Database) => {
	let sql = `
        CREATE TABLE IF NOT EXISTS dapp_transaction (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            checkpoint TEXT,
            digest TEXT
        )
    `
	await sqliteDB.exec(sql);
}

type SetRecord = {
	name: string,
	key1: string | object,
	key2: string | object,
	value: string | object
}

type RemoveRecord = {
	name: string,
	key1: string | object,
	key2: string | object,
}

const processSetRecord = async (sqliteDB: Database, dbName: string, checkpoint: string, digest: string, event: unknown) => {
	let res = event as SetRecord;
	if ((typeof res.key1 === 'object' && res.key1 !== null) || Array.isArray(res.key1)) {
		res.key1 = serializeData(res.key1);
	} else if ((typeof res.key2 === 'object' && res.key2 !== null) || Array.isArray(res.key2)) {
		res.key2 = serializeData(res.key2);
	} else if (typeof res.value === 'object' || Array.isArray(res.value)) {
		res.value = serializeData(res.value);
	}
	await insertData(sqliteDB, dbName, {
		checkpoint: checkpoint,
		digest: digest,
		event: res
	});
}

const processRemoveRecord = async (sqliteDB: Database, dbName: string, checkpoint: string, digest: string, event: unknown) => {
	let res = event as RemoveRecord;
	if ((typeof res.key1 === 'object' && res.key1 !== null) || Array.isArray(res.key1)) {
		res.key1 = serializeData(res.key1);
	} else if ((typeof res.key2 === 'object' && res.key2 !== null) || Array.isArray(res.key2)) {
		res.key2 = serializeData(res.key2);
	}
	await removeData(sqliteDB, dbName, {
		checkpoint: checkpoint,
		digest: digest,
		event: res
	});
}

type SetData = {
	checkpoint: string,
	digest: string,
	event: SetRecord
}

type RemoveData = {
	checkpoint: string,
	digest: string,
	event: RemoveRecord
}

const serializeData = (data: object): string => {
	if (data.hasOwnProperty("fields")) {
		// @ts-ignore
		return JSON.stringify(data["fields"]);
	}
	return JSON.stringify(data);
};

async function insertData(sqliteDB: Database, dbName: string, data: SetData) {
	const { checkpoint, digest, event } = data;

	let sql = `
        INSERT OR REPLACE INTO ${dbName} (id, last_update_checkpoint, last_update_digest, name, key1, key2, value)
        VALUES (
        (SELECT id FROM ${dbName} WHERE name = ? AND (key1 = ? OR key1 IS NULL) AND (key2 = ? OR key2 IS NULL)),
        ?, ?, ?, ?, ?, ?
        )
    `;

	const values = [event.name, event.key1, event.key2, checkpoint, digest, event.name, event.key1, event.key2, event.value];

	await sqliteDB.run(sql, values);
	console.log("Insert or update data: ", checkpoint, digest, dbName, data);
}

async function removeData(sqliteDB: Database, dbName: string, data: RemoveData) {
	const { checkpoint, digest, event } = data;

	let sql = `
        UPDATE ${dbName}
        SET is_removed = TRUE
        WHERE name = ? AND (key1 = ? OR key1 IS NULL) AND (key2 = ? OR key2 IS NULL)
    `;

	await sqliteDB.run(sql, [event.name, event.key1, event.key2]);
	console.log("Remove data: ", checkpoint, digest, dbName, data);
}

async function insertTx(sqliteDB: Database, checkpoint: string, digest: string) {
	let sql = `
        INSERT INTO dapp_transaction (checkpoint, digest)
        VALUES (?, ?)
    `;

	await sqliteDB.run(sql, [checkpoint, digest]);
	console.log("Insert transaction: ", checkpoint, digest);
}

async function getLastDigest(sqliteDB: Database): Promise<string | null> {
	const row = await sqliteDB.get(`
        SELECT digest FROM dapp_transaction
        ORDER BY id DESC
        LIMIT 1
    `);

	return row ? row.digest : null;
}

export async function indexerHandler(
	dubheConfig: DubheConfig,
	network: 		'mainnet' | 'testnet' | 'devnet' | 'localnet',
	db: 			string,
	schemaId: 		string | undefined,
) {
	const path = process.cwd();
	const projectPath = `${path}/contracts/${dubheConfig.name}`;

	schemaId = schemaId || (await getSchemaId(projectPath, network));

	console.log('\n🚀 Sqlite Started');
	console.log(`  ├─ Project: ${projectPath}`);
	console.log(`  ├─ Network: ${network}`);
	console.log(`  ├─ Database: ${db}`);
	console.log(`  ├─ Schema ID: ${schemaId}`);

	if (!schemaId) {
		throw new DubheCliError(
			`Schema ID not found. Please provide a schema ID with the --schemaId flag.`
		);
	}
	const client = new SuiClient({url: getFullnodeUrl(network) });

	if(db === 'sqlite') {
		sqliteDB = await createDB(dubheConfig.name);
		while (true) {
			await delay(2000);
			const cursor = await getLastDigest(sqliteDB)
			const response = await client.queryTransactionBlocks({
				filter: {
					// Transaction: 'FD43PRNS2PyNcYExFxwuouLqTVvonTd6NtDYMiVB7ZxZ'
					// MoveFunction: {
					//     package: '0x2dd117c4f48a6be9d2dd20eff67903ebf07080c7e259c7c589078fe21bb78471',
					//     module: 'message_system',
					//     function: 'send'
					// }
					ChangedObject: schemaId
				},
				order: "ascending",
				cursor: cursor,
				// limit: 2,
				options: {
					showEvents: true
				}
			});
			const txs = response.data as SuiTransactionBlockResponse[]
			// console.log("New Transactions: ", txs);
			for (const tx of txs) {
				await insertTx(sqliteDB, tx.checkpoint?.toString() as string, tx.digest);
				if (tx.events) {
					for (const event of tx.events) {
						// @ts-ignore
						if (event.parsedJson.hasOwnProperty("value")) {
							await processSetRecord(sqliteDB, dubheConfig.name, tx.checkpoint?.toString() as string, tx.digest, event.parsedJson);
						} else {
							await processRemoveRecord(sqliteDB, dubheConfig.name, tx.checkpoint?.toString() as string, tx.digest, event.parsedJson);
						}
					}
				}
			}
		};
	} else {
		throw new DubheCliError(
			`Database "${db}" not supported. Supported databases: sqlite`
		);
	}
}

process.on('SIGINT', async () => {
	await sqliteDB.close();
	console.log(chalk.green('✅ Sqlite Stopped'));
	process.exit();
});
