import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { QueryAdapter } from './common';
import { getTablesWithRecords } from './getTablesWithRecords';
import { tablesWithRecordsToLogs } from '@latticexyz/store-sync';

/**
 * Creates a storage adapter for the tRPC server/client to query data from PostgreSQL.
 *
 * @param {PostgresJsDatabase<Record<string, unknown>>} database PostgreSQL database object from Drizzle
 * @returns {Promise<QueryAdapter>} A set of methods used by tRPC endpoints.
 */
export async function createQueryAdapter(
  database: PostgresJsDatabase<Record<string, unknown>>
): Promise<QueryAdapter> {
  const adapter: QueryAdapter = {
    async getLogs(opts) {
      const { blockNumber, tables } = await getTablesWithRecords(database, opts);
      const logs = tablesWithRecordsToLogs(tables);
      return { blockNumber: blockNumber ?? 0n, logs };
    },
    async findAll(opts) {
      return getTablesWithRecords(database, opts);
    }
  };
  return adapter;
}
