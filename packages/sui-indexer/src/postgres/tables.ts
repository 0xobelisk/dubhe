import { and, eq, getTableName, sql } from 'drizzle-orm';
import { pgTable, serial, text, boolean } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
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
  database.execute(
    sql`CREATE TABLE IF NOT EXISTS "__dubheStoreTransactions" (
    id SERIAL PRIMARY KEY, 
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
  database.execute(sql`
        CREATE TABLE IF NOT EXISTS "__dubheStoreSchemas" (
            id SERIAL PRIMARY KEY,
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
  database.execute(sql`
        CREATE TABLE IF NOT EXISTS "__dubheStoreEvents" (
            id SERIAL PRIMARY KEY,
			sender TEXT,
            checkpoint TEXT,
            digest TEXT,
            name TEXT,
            value TEXT,
			created_at TEXT
        )`);
};

export const clearDatabase = (database: ReturnType<typeof drizzle>) => {
  database.execute(sql`DROP TABLE IF EXISTS "__dubheStoreTransactions"`);
  database.execute(sql`DROP TABLE IF EXISTS "__dubheStoreSchemas"`);
  database.execute(sql`DROP TABLE IF EXISTS "__dubheStoreEvents"`);
};

export const dubheStoreTransactions = pgTable('__dubheStoreTransactions', {
  id: serial('id').primaryKey().notNull(),
  sender: text('sender').notNull(),
  checkpoint: text('checkpoint').notNull(),
  digest: text('digest').notNull(),
  package: text('package').notNull(),
  module: text('module').notNull(),
  function: text('function').notNull(),
  arguments: text('arguments').notNull(),
  cursor: text('cursor').notNull(),
  created_at: text('created_at').notNull()
});

export const dubheStoreSchemas = pgTable('__dubheStoreSchemas', {
  id: serial('id').primaryKey().notNull(),
  name: text('name').notNull(),
  key1: text('key1'),
  key2: text('key2'),
  value: text('value').notNull(),
  last_update_checkpoint: text('last_update_checkpoint').notNull(),
  last_update_digest: text('last_update_digest').notNull(),
  is_removed: boolean('is_removed').notNull().default(false),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull()
});

export const dubheStoreEvents = pgTable('__dubheStoreEvents', {
  id: serial('id').primaryKey().notNull(),
  sender: text('sender').notNull(),
  name: text('name').notNull(),
  value: text('value').notNull(),
  checkpoint: text('checkpoint').notNull(),
  digest: text('digest').notNull(),
  created_at: text('created_at').notNull()
});

export async function insertTx(
  pgDB: ReturnType<typeof drizzle>,
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
  await pgDB.insert(dubheStoreTransactions).values({
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

export async function syncToPostgres(
  pgDB: ReturnType<typeof drizzle>,
  checkpoint: string,
  digest: string,
  created_at: string,
  event: unknown,
  operationType: OperationType
) {
  let res = event as EventData;

  if (operationType === OperationType.Remove) {
    await pgDB
      .update(dubheStoreSchemas)
      .set({ is_removed: true })
      .where(
        and(
          eq(dubheStoreSchemas.name, res.name),
          sql`((${dubheStoreSchemas.key1} IS NULL) OR (${dubheStoreSchemas.key1} = ${typeof res.key1 === 'object' ? JSON.stringify(res.key1) : res.key1?.toString() || null}))`,
          sql`((${dubheStoreSchemas.key2} IS NULL) OR (${dubheStoreSchemas.key2} = ${typeof res.key2 === 'object' ? JSON.stringify(res.key2) : res.key2?.toString() || null}))`
        )
      )
      .execute();
  } else {
    const existingRecord = await pgDB
      .select()
      .from(dubheStoreSchemas)
      .where(
        and(
          eq(dubheStoreSchemas.name, res.name),
          sql`((${dubheStoreSchemas.key1} IS NULL) OR (${dubheStoreSchemas.key1} = ${typeof res.key1 === 'object' ? JSON.stringify(res.key1) : res.key1?.toString() || null}))`,
          sql`((${dubheStoreSchemas.key2} IS NULL) OR (${dubheStoreSchemas.key2} = ${typeof res.key2 === 'object' ? JSON.stringify(res.key2) : res.key2?.toString() || null}))`
        )
      )
      .execute();

    if (existingRecord.length > 0) {
      const id = existingRecord[0].id;

      let updateData = parseData({
        last_update_checkpoint: checkpoint,
        last_update_digest: digest,
        value: res.value,
        is_removed: false,
        updated_at: created_at
      });

      updateData.value =
        typeof updateData.value === 'object' ? JSON.stringify(updateData.value) : updateData.value;

      const updateQuery = pgDB
        .update(dubheStoreSchemas)
        .set(updateData)
        .where(eq(dubheStoreSchemas.id, id));

      await updateQuery.execute();
    } else {
      let insertData = parseData({
        last_update_checkpoint: checkpoint,
        last_update_digest: digest,
        name: res.name,
        key1: res.key1,
        key2: res.key2,
        value: res.value,
        is_removed: false,
        created_at,
        updated_at: created_at
      });

      insertData.value =
        typeof insertData.value === 'object' ? JSON.stringify(insertData.value) : insertData.value;

      const insertQuery = pgDB.insert(dubheStoreSchemas).values(insertData);

      await insertQuery.execute();
    }
  }
}

export const internalTables = [dubheStoreTransactions, dubheStoreSchemas, dubheStoreEvents];
export const internalTableNames = internalTables.map(getTableName);
