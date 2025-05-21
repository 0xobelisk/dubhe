import { and, eq, getTableName, isNull, or, sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { parseData } from '@0xobelisk/sui-common';

export enum OperationType {
  Set = 'Set',
  Remove = 'Remove'
}

type EventData = {
  name: string;
  key1: string | object;
  key2: string | object;
  value: string | object;
};

export const setupDatabase = (database: ReturnType<typeof drizzle>) => {
  database.run(
    sql`CREATE TABLE IF NOT EXISTS __dubheStoreTransactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
	sender TEXT, 
	checkpoint INTEGER, 
	digest TEXT, 
  package TEXT,
  module TEXT,
  function TEXT,
  arguments TEXT,
	cursor TEXT, 
	created_at TEXT)`
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
			sender TEXT,
            checkpoint TEXT,
            digest TEXT,
            name TEXT,
            value TEXT,
			created_at TEXT
        )`);
};

export const clearDatabase = (database: ReturnType<typeof drizzle>) => {
  database.run(sql`DROP TABLE IF EXISTS __dubheStoreTransactions`);
  database.run(sql`DROP TABLE IF EXISTS __dubheStoreSchemas`);
  database.run(sql`DROP TABLE IF EXISTS __dubheStoreEvents`);
};

export const dubheStoreTransactions = sqliteTable('__dubheStoreTransactions', {
  id: integer('id').notNull().primaryKey().unique(),
  sender: text('sender').notNull(),
  checkpoint: text('checkpoint').notNull(),
  digest: text('digest').notNull(),
  package: text('package').notNull(),
  module: text('module').notNull(),
  function: text('function').notNull(),
  arguments: text('arguments', { mode: 'json' }).notNull(),
  cursor: text('cursor').notNull(),
  created_at: text('created_at').notNull()
});

export const dubheStoreSchemas = sqliteTable('__dubheStoreSchemas', {
  id: integer('id').notNull().primaryKey().unique(),
  name: text('name').notNull(),
  key1: text('key1', { mode: 'json' }),
  key2: text('key2', { mode: 'json' }),
  value: text('value', { mode: 'json' }).notNull(),
  last_update_checkpoint: text('last_update_checkpoint').notNull(),
  last_update_digest: text('last_update_digest').notNull(),
  is_removed: integer('is_removed', { mode: 'boolean' }).notNull().default(false),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull()
});

export const dubheStoreEvents = sqliteTable('__dubheStoreEvents', {
  id: integer('id').notNull().primaryKey().unique(),
  sender: text('sender').notNull(),
  name: text('name').notNull(),
  value: text('value', { mode: 'json' }).notNull(),
  checkpoint: text('checkpoint').notNull(),
  digest: text('digest').notNull(),
  created_at: text('created_at').notNull()
});

export async function insertTx(
  sqliteDB: ReturnType<typeof drizzle>,
  sender: string,
  checkpoint: string,
  digest: string,
  pkg: string,
  mod: string,
  func: string,
  args: string,
  cursor: string,
  created_at: string
) {
  await sqliteDB.insert(dubheStoreTransactions).values({
    sender,
    checkpoint,
    digest,
    cursor,
    package: pkg,
    module: mod,
    function: func,
    arguments: args,
    created_at
  });
}

export async function syncToSqlite(
  sqliteDB: ReturnType<typeof drizzle>,
  checkpoint: string,
  digest: string,
  created_at: string,
  event: unknown,
  operationType: OperationType
) {
  let res = event as EventData;
  if (operationType === OperationType.Remove) {
    sqliteDB
      .update(dubheStoreSchemas)
      .set({ is_removed: true })
      .where(
        and(
          eq(dubheStoreSchemas.name, res.name),
          and(or(eq(dubheStoreSchemas.key1, res.key1), isNull(dubheStoreSchemas.key1))),
          and(or(eq(dubheStoreSchemas.key2, res.key2), isNull(dubheStoreSchemas.key2)))
        )
      )
      .execute();
  } else {
    const existingRecord = await sqliteDB
      .select()
      .from(dubheStoreSchemas)
      .where(
        and(
          eq(dubheStoreSchemas.name, res.name),
          and(or(eq(dubheStoreSchemas.key1, res.key1), isNull(dubheStoreSchemas.key1))),
          and(or(eq(dubheStoreSchemas.key2, res.key2), isNull(dubheStoreSchemas.key2)))
        )
      )
      .execute();

    if (existingRecord.length > 0) {
      const id = existingRecord[0].id;
      await sqliteDB
        .update(dubheStoreSchemas)
        .set(
          parseData({
            last_update_checkpoint: checkpoint,
            last_update_digest: digest,
            value: res.value,
            is_removed: false,
            updated_at: created_at
          })
        )
        .where(eq(dubheStoreSchemas.id, id))
        .execute();
    } else {
      await sqliteDB
        .insert(dubheStoreSchemas)
        .values(
          parseData({
            last_update_checkpoint: checkpoint,
            last_update_digest: digest,
            name: res.name,
            key1: res.key1,
            key2: res.key2,
            value: res.value,
            is_removed: false,
            created_at,
            updated_at: created_at
          })
        )
        .execute();
    }
  }
}

export const internalTables = [dubheStoreTransactions, dubheStoreSchemas];
export const internalTableNames = internalTables.map(getTableName);
