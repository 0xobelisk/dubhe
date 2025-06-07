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
        
  // Add unique index to handle NULL values
  database.execute(sql`
    DO $$
    BEGIN
      BEGIN
        ALTER TABLE "__dubheStoreSchemas" 
        ADD CONSTRAINT IF NOT EXISTS unique_name_key1_key2 
        UNIQUE (name, COALESCE(key1, ''), COALESCE(key2, ''));
      EXCEPTION
        WHEN duplicate_constraint THEN
          NULL;
      END;
    END $$;
  `);
  
  // Add indexes to improve query performance
  database.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_schemas_name ON "__dubheStoreSchemas" (name);
    CREATE INDEX IF NOT EXISTS idx_schemas_name_keys ON "__dubheStoreSchemas" (name, key1, key2);
    CREATE INDEX IF NOT EXISTS idx_schemas_checkpoint ON "__dubheStoreSchemas" (last_update_checkpoint);
  `);
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

// Batch insert transactions
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

// Batch insert events
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

// Batch upsert schema (separate batch update for existing and batch insert for new)
export async function bulkUpsertSchemas(
  pgDB: ReturnType<typeof drizzle>,
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
  if (schemas.length === 0) return;

  // For high-throughput scenarios, use optimized approach
  // Direct bulk operations with optimal batch size
  const OPTIMAL_BATCH_SIZE = 100; // Optimal for ~100 records/second throughput
  
  // Separate records for deletion and normal updates
  const toRemove = schemas.filter(s => s.is_removed === true && s.value === null);
  const toUpsert = schemas.filter(s => !(s.is_removed === true && s.value === null));

  // Process deletion operations - optimized for large batches
  if (toRemove.length > 0) {
    // Create temporary table for deletion operations
    await pgDB.execute(sql`
      CREATE TEMPORARY TABLE temp_remove (
        name TEXT NOT NULL,
        key1 TEXT,
        key2 TEXT,
        updated_at TEXT NOT NULL
      ) ON COMMIT DROP;
    `);
    
    // Insert into temporary table in batches
    for (let i = 0; i < toRemove.length; i += OPTIMAL_BATCH_SIZE) {
      const batch = toRemove.slice(i, i + OPTIMAL_BATCH_SIZE);
      const valuesSql = batch.map(s => 
        `('${s.name}', ${s.key1 === null ? 'NULL' : `'${s.key1}'`}, ${s.key2 === null ? 'NULL' : `'${s.key2}'`}, '${s.updated_at}')`
      ).join(',');
      
      await pgDB.execute(sql`
        INSERT INTO temp_remove (name, key1, key2, updated_at)
        VALUES ${sql.raw(valuesSql)};
      `);
    }
    
    // Use COALESCE function to handle NULL value comparisons
    await pgDB.execute(sql`
      UPDATE "__dubheStoreSchemas" AS t SET
        is_removed = true,
        updated_at = tr.updated_at
      FROM temp_remove AS tr
      WHERE t.name = tr.name
        AND COALESCE(t.key1, '') = COALESCE(tr.key1, '')
        AND COALESCE(t.key2, '') = COALESCE(tr.key2, '');
    `);
  }

  // Process updates and insertions with high-performance approach
  if (toUpsert.length > 0) {
    // Create temporary table for upsert operations
    await pgDB.execute(sql`
      CREATE TEMPORARY TABLE temp_upsert (
        last_update_checkpoint TEXT NOT NULL,
        last_update_digest TEXT NOT NULL,
        name TEXT NOT NULL,
        key1 TEXT,
        key2 TEXT,
        value TEXT NOT NULL,
        is_removed BOOLEAN NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) ON COMMIT DROP;
    `);
    
    // Insert into temporary table in batches
    for (let i = 0; i < toUpsert.length; i += OPTIMAL_BATCH_SIZE) {
      const batch = toUpsert.slice(i, i + OPTIMAL_BATCH_SIZE);
      const valuesSql = batch.map(s => 
        `('${s.last_update_checkpoint}', '${s.last_update_digest}', '${s.name}', 
          ${s.key1 === null ? 'NULL' : `'${s.key1}'`}, 
          ${s.key2 === null ? 'NULL' : `'${s.key2}'`}, 
          '${s.value || ''}', ${s.is_removed}, '${s.created_at}', '${s.updated_at}')`
      ).join(',');
      
      await pgDB.execute(sql`
        INSERT INTO temp_upsert (
          last_update_checkpoint, last_update_digest, name, key1, key2, 
          value, is_removed, created_at, updated_at
        )
        VALUES ${sql.raw(valuesSql)};
      `);
    }
    
    // Use more efficient method supported by PostgreSQL 14
    // 1. First update existing records
    await pgDB.execute(sql`
      UPDATE "__dubheStoreSchemas" AS ds 
      SET
        last_update_checkpoint = tu.last_update_checkpoint,
        last_update_digest = tu.last_update_digest,
        value = tu.value,
        is_removed = tu.is_removed,
        updated_at = tu.updated_at
      FROM temp_upsert AS tu
      WHERE ds.name = tu.name
        AND COALESCE(ds.key1, '') = COALESCE(tu.key1, '')
        AND COALESCE(ds.key2, '') = COALESCE(tu.key2, '')
        AND tu.last_update_checkpoint::bigint > ds.last_update_checkpoint::bigint;
    `);
    
    // 2. Insert non-existing records
    await pgDB.execute(sql`
      INSERT INTO "__dubheStoreSchemas" (
        last_update_checkpoint, last_update_digest, name, key1, key2, 
        value, is_removed, created_at, updated_at
      )
      SELECT 
        tu.last_update_checkpoint, tu.last_update_digest, tu.name, tu.key1, tu.key2,
        tu.value, tu.is_removed, tu.created_at, tu.updated_at
      FROM temp_upsert tu
      WHERE NOT EXISTS (
        SELECT 1 FROM "__dubheStoreSchemas" ds 
        WHERE ds.name = tu.name
          AND COALESCE(ds.key1, '') = COALESCE(tu.key1, '')
          AND COALESCE(ds.key2, '') = COALESCE(tu.key2, '')
      );
    `);
  }
}