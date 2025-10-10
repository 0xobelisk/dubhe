import { makeExtendSchemaPlugin, gql } from 'postgraphile';
import { subscriptionLogger } from './utils/logger';

// Database table information interface
interface TableInfo {
  tableName: string;
  fullTableName: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
  statistics?: {
    rowCount: number;
    totalSize: string;
    tableSize: string;
  };
  generatedAt?: string;
}

interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  defaultValue?: any;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

// Cached table information
let cachedTables: Record<string, TableInfo> = {};
let schemaGenerated = false;

/**
 * Dynamically retrieve schema information for all store tables
 */
async function discoverStoreTables(pgClient: any): Promise<Record<string, TableInfo>> {
  if (schemaGenerated && Object.keys(cachedTables).length > 0) {
    return cachedTables;
  }

  try {
    subscriptionLogger.info('Starting discovery of database store table structure...');

    // 1. Get all store_* tables
    const tablesResult = await pgClient.query(`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name LIKE 'store_%'
			ORDER BY table_name
		`);

    const tables: Record<string, TableInfo> = {};

    // 2. Get detailed information for each table
    for (const tableRow of tablesResult.rows) {
      const fullTableName = tableRow.table_name;
      const tableName = fullTableName.replace(/^store_/, '');

      const tableInfo = await getTableInfo(pgClient, fullTableName);
      tables[tableName] = tableInfo;
    }

    cachedTables = tables;
    schemaGenerated = true;

    subscriptionLogger.info(
      `Discovered ${Object.keys(tables).length} store tables: ${Object.keys(tables).join(', ')}`
    );
    return tables;
  } catch (error) {
    subscriptionLogger.error('Failed to discover store tables', error);
    return {};
  }
}

/**
 * Generate pre-built table information - called at server startup
 */
export async function generateStoreTablesInfo(pgPool: any): Promise<Record<string, TableInfo>> {
  const pgClient = await pgPool.connect();
  try {
    const tables = await discoverStoreTables(pgClient);
    subscriptionLogger.info(
      `Pre-generated schema information for ${Object.keys(tables).length} tables`
    );
    return tables;
  } finally {
    pgClient.release();
  }
}

/**
 * Simplified tools plugin - only provides basic query functionality, let PostGraphile's built-in listen subscriptions work normally
 */
export function createUniversalSubscriptionsPlugin(preGeneratedTables?: Record<string, TableInfo>) {
  return makeExtendSchemaPlugin((_build) => {
    subscriptionLogger.info(
      'Enabling simplified tools plugin - only keeping basic query functionality'
    );

    // Use pre-generated table information if available
    if (preGeneratedTables && Object.keys(preGeneratedTables).length > 0) {
      cachedTables = preGeneratedTables;
      schemaGenerated = true;
    }

    const tableNames = Object.keys(cachedTables);
    subscriptionLogger.info(`Discovered store tables: ${tableNames.join(', ')}`);

    return {
      typeDefs: gql`
        extend type Query {
          """
          Get Schema information for all store tables
          """
          storeSchema: JSON

          """
          Query data from specified store table
          """
          storeData(table: String!): JSON

          """
          Get list of all available store table names
          """
          availableStoreTables: [String!]!
        }

        # Removed custom subscription types, now only use PostGraphile's built-in listen subscriptions
      `,

      resolvers: {
        Query: {
          storeSchema: async (root: any, args: any, context: any, _info: any) => {
            const { pgClient } = context;
            try {
              const tables = await discoverStoreTables(pgClient);
              return {
                tables,
                generatedAt: new Date().toISOString()
              };
            } catch (error) {
              return {
                error: (error as Error).message,
                tables: {}
              };
            }
          },

          storeData: async (root: any, args: any, context: any, _info: any) => {
            return await executeTableQuery(context, args.table);
          },

          availableStoreTables: async (root: any, args: any, context: any, _info: any) => {
            const { pgClient } = context;
            try {
              const tables = await discoverStoreTables(pgClient);
              return Object.keys(tables);
            } catch (error) {
              subscriptionLogger.error('Failed to get available table list', error);
              return [];
            }
          }
        }
      }
    };
  });
}

// Default plugin export (for backward compatibility)
export const UniversalSubscriptionsPlugin = createUniversalSubscriptionsPlugin();

// =========================
// Database query functions
// =========================

/**
 * Get detailed table information (columns, primary keys, data statistics, etc.)
 */
async function getTableInfo(pgClient: any, fullTableName: string): Promise<TableInfo> {
  const tableName = fullTableName.replace(/^store_/, '');

  // 1. Get column information
  const columnsResult = await pgClient.query(
    `
		SELECT 
			column_name,
			data_type,
			is_nullable,
			column_default,
			character_maximum_length,
			numeric_precision,
			numeric_scale
		FROM information_schema.columns 
		WHERE table_name = $1 
		ORDER BY ordinal_position
	`,
    [fullTableName]
  );

  // 2. Get primary key information
  const primaryKeysResult = await pgClient.query(
    `
		SELECT column_name
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu 
			ON tc.constraint_name = kcu.constraint_name
		WHERE tc.table_name = $1 
		AND tc.constraint_type = 'PRIMARY KEY'
		ORDER BY kcu.ordinal_position
	`,
    [fullTableName]
  );

  // 3. Try to get primary key information from table_fields table (if exists)
  let tableFieldsKeys: string[] = [];
  try {
    const tableFieldsResult = await pgClient.query(
      `
			SELECT field_name 
			FROM table_fields 
			WHERE table_name = $1 AND is_key = true 
			ORDER BY field_name
		`,
      [tableName]
    );
    tableFieldsKeys = tableFieldsResult.rows.map((row: any) => row.field_name);
  } catch (_e) {
    // table_fields table may not exist, ignore error
  }

  // 4. Get data statistics
  const statsResult = await pgClient.query(`
		SELECT count(*) as row_count 
		FROM ${fullTableName}
	`);

  // 5. Get table size information
  const sizeResult = await pgClient.query(
    `
		SELECT 
			pg_size_pretty(pg_total_relation_size($1)) as total_size,
			pg_size_pretty(pg_relation_size($1)) as table_size
	`,
    [fullTableName]
  );

  const columns: ColumnInfo[] = columnsResult.rows.map((row: any) => ({
    columnName: row.column_name,
    dataType: row.data_type,
    isNullable: row.is_nullable === 'YES',
    defaultValue: row.column_default,
    maxLength: row.character_maximum_length,
    precision: row.numeric_precision,
    scale: row.numeric_scale
  }));

  const primaryKeys = primaryKeysResult.rows.map((row: any) => row.column_name);

  return {
    tableName,
    fullTableName,
    columns,
    primaryKeys: primaryKeys.length > 0 ? primaryKeys : tableFieldsKeys,
    statistics: {
      rowCount: parseInt(statsResult.rows[0]?.row_count || '0'),
      totalSize: sizeResult.rows[0]?.total_size || 'unknown',
      tableSize: sizeResult.rows[0]?.table_size || 'unknown'
    },
    generatedAt: new Date().toISOString()
  };
}

/**
 * Dynamically execute table queries
 */
async function executeTableQuery(context: any, tableName: string): Promise<any> {
  const { pgClient } = context;
  const fullTableName = `store_${tableName}`;

  try {
    subscriptionLogger.debug(`Executing table query: ${fullTableName}`);

    // 1. Get table information
    const tableInfo = cachedTables[tableName] || (await getTableInfo(pgClient, fullTableName));

    if (tableInfo.columns.length === 0) {
      return {
        nodes: [],
        totalCount: 0,
        tableName,
        generatedAt: new Date().toISOString()
      };
    }

    // 2. Build dynamic nodeId expression
    const nodeIdExpression = buildNodeIdExpression(tableInfo);

    // 3. Build query fields
    const columnFields = tableInfo.columns
      .map((col) => `'${col.columnName}', ${col.columnName}`)
      .join(', ');

    // 4. Build WHERE condition
    const whereCondition = buildWhereCondition(tableInfo);

    // 5. Execute query
    const sql = `
			SELECT 
				COALESCE(
					json_agg(
						json_build_object(
							'nodeId', ${nodeIdExpression},
							${columnFields}
						) 
					), 
					'[]'::json
				) as nodes,
				count(*) as total_count
			FROM ${fullTableName}
			WHERE ${whereCondition}
		`;

    subscriptionLogger.debug(`Executing SQL: ${sql}`);
    const result = await pgClient.query(sql);

    const row = result.rows[0];
    const data = {
      nodes: row?.nodes || [],
      totalCount: parseInt(row?.total_count || '0'),
      tableName,
      generatedAt: new Date().toISOString()
    };

    subscriptionLogger.debug(`Query result: ${fullTableName} found ${data.totalCount} records`);
    return data;
  } catch (error) {
    subscriptionLogger.error(`Failed to query ${fullTableName}`, error);
    return {
      nodes: [],
      totalCount: 0,
      tableName,
      generatedAt: new Date().toISOString(),
      error: (error as Error).message
    };
  }
}

/**
 * Dynamically build NodeId expression
 */
function buildNodeIdExpression(tableInfo: TableInfo): string {
  const { tableName, primaryKeys, columns } = tableInfo;

  if (primaryKeys.length > 0) {
    // Use primary keys to build nodeId
    const keyExpression = primaryKeys
      .map((key) => `COALESCE(${key}::text, 'null')`)
      .join(" || ':' || ");
    return `encode(('${tableName}:' || ${keyExpression})::bytea, 'base64')`;
  }

  // If no primary key, use first column
  const firstColumn = columns[0]?.columnName || 'unknown';
  return `encode(('${tableName}:' || COALESCE(${firstColumn}::text, 'unknown'))::bytea, 'base64')`;
}

/**
 * Dynamically build WHERE condition - completely generic, no hardcoded field names
 */
function buildWhereCondition(tableInfo: TableInfo): string {
  const { primaryKeys, columns } = tableInfo;

  // 1. Prioritize primary key fields as filter conditions (most reliable)
  if (primaryKeys.length > 0) {
    const conditions = primaryKeys.map((key) => `${key} IS NOT NULL`);
    return conditions.join(' AND ');
  }

  // 2. If no primary key, find first non-null field (reduce empty data)
  const nonNullableColumns = columns.filter((col) => !col.isNullable);
  if (nonNullableColumns.length > 0) {
    return `${nonNullableColumns[0].columnName} IS NOT NULL`;
  }

  // 3. If all fields can be null, use first field for basic filtering
  if (columns.length > 0) {
    return `${columns[0].columnName} IS NOT NULL`;
  }

  // 4. Final fallback - return all rows (no filtering)
  return 'true';
}

// Removed getLatestInsertedData function, now only use listen subscriptions

// Removed getLatestInsertedDataSince function, now only use simple listen subscriptions
