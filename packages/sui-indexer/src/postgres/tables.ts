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

// 批量插入交易
export async function bulkInsertTx(
  pgDB: ReturnType<typeof drizzle>,
  txs: Array<{
    sender: string;
    checkpoint: string;
    digest: string;
    pkg: string;
    mod: string;
    func: string;
    args: string;
    cursor: string;
    created_at: string;
  }>
) {
  if (txs.length === 0) return;
  await pgDB.insert(dubheStoreTransactions).values(
    txs.map((tx) => ({
      sender: tx.sender,
      checkpoint: tx.checkpoint,
      digest: tx.digest,
      package: tx.pkg,
      module: tx.mod,
      function: tx.func,
      arguments: tx.args,
      cursor: tx.cursor,
      created_at: tx.created_at
    }))
  );
}

// 批量插入事件
export async function bulkInsertEvents(
  pgDB: ReturnType<typeof drizzle>,
  events: Array<{
    sender: string;
    checkpoint: string;
    digest: string;
    name: string;
    value: string;
    created_at: string;
  }>
) {
  if (events.length === 0) return;
  await pgDB.insert(dubheStoreEvents).values(events);
}

// 批量 upsert schema（分为批量 update 已存在的和批量 insert 新的）
export async function bulkUpsertSchemas(
  pgDB: ReturnType<typeof drizzle>,
  schemas: Array<{
    last_update_checkpoint: string;
    last_update_digest: string;
    name: string;
    key1: string | null;
    key2: string | null;
    value: string;
    is_removed: boolean;
    created_at: string;
    updated_at: string;
  }>
) {
  if (schemas.length === 0) return;
  // 先查出已存在的（根据 name, key1, key2 唯一索引）
  const existing = await pgDB
    .select({
      name: dubheStoreSchemas.name,
      key1: dubheStoreSchemas.key1,
      key2: dubheStoreSchemas.key2
    })
    .from(dubheStoreSchemas)
    .where(
      sql`(${dubheStoreSchemas.name}, ${dubheStoreSchemas.key1}, ${dubheStoreSchemas.key2}) in (${sql.raw(schemas.map((s) => `('${s.name}',${s.key1 ? `'${s.key1}'` : 'NULL'},${s.key2 ? `'${s.key2}'` : 'NULL'})`).join(', '))})`
    )
    .execute();
  const existSet = new Set(existing.map((e) => `${e.name}|${e.key1}|${e.key2}`));
  const toUpdate = schemas.filter((s) => existSet.has(`${s.name}|${s.key1}|${s.key2}`));
  const toInsert = schemas.filter((s) => !existSet.has(`${s.name}|${s.key1}|${s.key2}`));
  // 批量 update
  for (const s of toUpdate) {
    await pgDB
      .update(dubheStoreSchemas)
      .set({
        last_update_checkpoint: s.last_update_checkpoint,
        last_update_digest: s.last_update_digest,
        value: s.value,
        is_removed: s.is_removed,
        updated_at: s.updated_at
      })
      .where(
        and(
          eq(dubheStoreSchemas.name, s.name),
          s.key1 ? eq(dubheStoreSchemas.key1, s.key1) : sql`${dubheStoreSchemas.key1} IS NULL`,
          s.key2 ? eq(dubheStoreSchemas.key2, s.key2) : sql`${dubheStoreSchemas.key2} IS NULL`
        )
      )
      .execute();
  }
  // 批量 insert
  if (toInsert.length > 0) {
    await pgDB.insert(dubheStoreSchemas).values(toInsert);
  }
}

// 批量 remove schema（批量 update is_removed）
export async function bulkRemoveSchemas(
  pgDB: ReturnType<typeof drizzle>,
  schemas: Array<{
    name: string;
    key1: string | null;
    key2: string | null;
    updated_at: string;
  }>
) {
  if (schemas.length === 0) return;
  for (const s of schemas) {
    await pgDB
      .update(dubheStoreSchemas)
      .set({ is_removed: true, updated_at: s.updated_at })
      .where(
        and(
          eq(dubheStoreSchemas.name, s.name),
          s.key1 ? eq(dubheStoreSchemas.key1, s.key1) : sql`${dubheStoreSchemas.key1} IS NULL`,
          s.key2 ? eq(dubheStoreSchemas.key2, s.key2) : sql`${dubheStoreSchemas.key2} IS NULL`
        )
      )
      .execute();
  }
}
