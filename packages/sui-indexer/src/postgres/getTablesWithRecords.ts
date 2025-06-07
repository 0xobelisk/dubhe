import { and, eq, desc } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Hex } from 'viem';
import { SyncFilter, TableWithRecords } from '@latticexyz/store-sync';
import { dubheStoreSchemas } from './tables';

/**
 * Get tables and records information from the database - PostgreSQL version
 */
export async function getTablesWithRecords(
  database: PostgresJsDatabase<Record<string, unknown>>,
  {
    chainId,
    address,
    filters = []
  }: {
    readonly chainId: number;
    readonly address?: Hex;
    readonly filters?: readonly SyncFilter[];
  }
): Promise<{ blockNumber: bigint | null; tables: readonly TableWithRecords[] }> {
  // Get the latest block number - in actual implementation, this should be retrieved from a configuration table
  const blockNumber = BigInt(chainId);

  // Process filters
  const tableIds = Array.from(new Set(filters.map((filter) => filter.tableId)));

  // Construct table name query conditions
  const conditions = [];

  if (tableIds.length > 0) {
    // In actual implementation, appropriate filter conditions should be constructed
    conditions.push(eq(dubheStoreSchemas.name, tableIds[0]));
  }

  // Query the database
  let query = database.select().from(dubheStoreSchemas);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const schemas = await query.orderBy(desc(dubheStoreSchemas.created_at)).execute();

  // Construct table structure - first cast to unknown type then to TableWithRecords
  const tablesWithRecords = schemas.map((schema) => {
    // Create a table structure for each schema
    const tableData = {
      id: schema.id,
      name: schema.name,
      address: address || ('0x' as Hex),
      tableId: schema.name as Hex,
      namespace: '', // Add missing namespace property
      keySchema: { key1: 'bytes32', key2: 'bytes32' },
      valueSchema: { value: 'bytes' },
      type: 'schema' as string,
      schema: {
        key1: { type: 'bytes32', internalType: 'bytes32' },
        key2: { type: 'bytes32', internalType: 'bytes32' },
        value: { type: 'bytes', internalType: 'bytes' }
      },
      key: ['key1', 'key2'],
      records: [
        {
          key: { key1: schema.key1, key2: schema.key2 },
          value: { value: schema.value },
          fields: {
            key1: schema.key1,
            key2: schema.key2,
            value: schema.value
          }
        }
      ]
    };

    return tableData as unknown as TableWithRecords;
  });

  return {
    blockNumber,
    tables: tablesWithRecords
  };
}
