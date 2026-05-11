import { Pool } from 'pg';

// Database table structure interface
export interface TableField {
  field_name: string;
  field_type: string;
  field_index: number | null;
  is_key: boolean;
}

export interface DynamicTable {
  table_name: string;
  fields: TableField[];
}

/**
 * Maps system table name → store_dubhe_* view name.
 * Views are created with store_dubhe_ prefix so PostGraphile discovers them
 * automatically via the store_* scan, and SimpleNamingPlugin strips `store`
 * to produce dubhe-prefixed GraphQL field names (e.g. dubheMarketplaceListings).
 * The dubhe_ segment guarantees no collision with user-defined store_* tables.
 */
const SYSTEM_TABLE_VIEWS: Record<string, string> = {
  marketplace_listings: 'store_dubhe_marketplace_listings',
  sessions: 'store_dubhe_sessions',
  user_storages: 'store_dubhe_user_storages',
  dapp_runtime_state: 'store_dubhe_dapp_runtime_state',
  dapp_marketplace_fees: 'store_dubhe_dapp_marketplace_fees',
  dapp_fee_state: 'store_dubhe_dapp_fee_state',
  dapp_revenue_state: 'store_dubhe_dapp_revenue_state',
  object_storages: 'store_dubhe_object_storages',
  object_storage_fields: 'store_dubhe_object_storage_fields',
  scene_storages: 'store_dubhe_scene_storages',
  scene_storage_fields: 'store_dubhe_scene_storage_fields',
  scene_permits: 'store_dubhe_scene_permits',
  scene_permit_participants: 'store_dubhe_scene_permit_participants',
  storage_schemas: 'store_dubhe_storage_schemas',
  storage_schema_fields: 'store_dubhe_storage_schema_fields'
  // table_fields is already discovered by getStoreTables via store_* but exposed
  // differently; skip it here to avoid a duplicate view.
};

/**
 * Pre-computed JOIN views that are already created by create_indexer_tables_sql().
 * These views live in the database as first-class objects (not SELECT * aliases),
 * so we only need to verify they exist and expose them to PostGraphile – no DDL here.
 *
 * Naming follows the same store_dubhe_* convention so PostGraphile picks them up
 * automatically alongside the plain system-table views above.
 */
const JOIN_VIEWS: string[] = [
  'store_dubhe_listing_with_fees', // marketplace_listings ⋈ dapp_marketplace_fees
  'store_dubhe_object_with_fields', // object_storages ⋈ object_storage_fields (JSONB)
  'store_dubhe_user_with_session', // user_storages ⋈ sessions (active only)
  'store_dubhe_scene_with_permit' // scene_storages ⋈ scene_permits
];

// Scan database table structure
export class DatabaseIntrospector {
  constructor(private pool: Pool, private schema: string = 'public') {}

  /**
   * Create store_dubhe_* views for all Dubhe system tables that exist in the DB.
   * Safe to call on every startup (uses CREATE OR REPLACE VIEW).
   * PostGraphile discovers these views exactly like regular store_* tables.
   *
   * Also verifies that the pre-computed JOIN views (created by create_indexer_tables_sql)
   * are present, and logs a warning when any are missing so operators know to re-run
   * the indexer migration.
   */
  async ensureSystemViews(): Promise<void> {
    const created: string[] = [];
    for (const [sourceTable, viewName] of Object.entries(SYSTEM_TABLE_VIEWS)) {
      try {
        const exists = await this.pool.query(
          `SELECT 1 FROM information_schema.tables
           WHERE table_schema = $1 AND table_name = $2`,
          [this.schema, sourceTable]
        );
        if (exists.rows.length === 0) continue;

        // Check if view already exists to avoid spammy CREATE OR REPLACE logs
        const viewExists = await this.pool.query(
          `SELECT 1 FROM information_schema.views
           WHERE table_schema = $1 AND table_name = $2`,
          [this.schema, viewName]
        );
        const isNew = viewExists.rows.length === 0;

        await this.pool.query(
          `CREATE OR REPLACE VIEW ${this.schema}.${viewName} AS SELECT * FROM ${this.schema}.${sourceTable}`
        );

        if (isNew) {
          created.push(viewName);
          console.log(`[introspector] ✨ new system view created: ${viewName} → ${sourceTable}`);
        }
      } catch (err) {
        console.warn(`[introspector] could not create view ${viewName}:`, err);
      }
    }
    if (created.length > 0) {
      console.log(
        `[introspector] watchPg will now auto-refresh GraphQL schema for: ${created.join(', ')}`
      );
    }

    // Verify pre-computed JOIN views (created by create_indexer_tables_sql, not here).
    const missingJoinViews: string[] = [];
    for (const viewName of JOIN_VIEWS) {
      try {
        const viewExists = await this.pool.query(
          `SELECT 1 FROM information_schema.views
           WHERE table_schema = $1 AND table_name = $2`,
          [this.schema, viewName]
        );
        if (viewExists.rows.length === 0) {
          missingJoinViews.push(viewName);
        } else {
          console.log(`[introspector] ✅ join view ready: ${viewName}`);
        }
      } catch (err) {
        console.warn(`[introspector] could not verify join view ${viewName}:`, err);
      }
    }
    if (missingJoinViews.length > 0) {
      console.warn(
        `[introspector] ⚠️  missing join views (re-run indexer migration to create them): ${missingJoinViews.join(
          ', '
        )}`
      );
    }
  }

  // Get all dynamically created store_* tables (includes store_dubhe_* views)
  async getStoreTables(): Promise<string[]> {
    const result = await this.pool.query(
      `
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_schema = $1 
				AND table_name LIKE 'store_%'
			ORDER BY table_name
		`,
      [this.schema]
    );

    return result.rows.map((row) => row.table_name);
  }

  // Get dynamic table field information from table_fields table
  async getDynamicTableFields(tableName: string): Promise<TableField[]> {
    // For store_dubhe_* views, look up the underlying table name
    const baseTableName = tableName.replace(/^store_dubhe_/, '').replace(/^store_/, '');

    const result = await this.pool.query(
      `
			SELECT field_name, field_type, field_index, is_key
			FROM table_fields 
			WHERE table_name = $1
			ORDER BY is_key DESC, field_index ASC
		`,
      [baseTableName]
    );

    // If no schema metadata found (system tables don't register in table_fields),
    // fall back to reading columns from information_schema
    if (result.rows.length === 0) {
      return this.getSystemTableFields(tableName);
    }

    return result.rows;
  }

  // Get field information directly from information_schema (used for system tables)
  async getSystemTableFields(tableName: string): Promise<TableField[]> {
    const result = await this.pool.query(
      `
			SELECT 
				column_name as field_name,
				data_type as field_type,
				ordinal_position as field_index,
				CASE WHEN column_name = 'entity_id' THEN true ELSE false END as is_key
			FROM information_schema.columns 
			WHERE table_schema = $1 AND table_name = $2
			ORDER BY ordinal_position
		`,
      [this.schema, tableName]
    );

    return result.rows;
  }

  // Get complete information for all tables
  async getAllTables(): Promise<DynamicTable[]> {
    const storeTables = await this.getStoreTables();
    const allTables: DynamicTable[] = [];

    for (const tableName of storeTables) {
      const fields = await this.getDynamicTableFields(tableName);
      allTables.push({ table_name: tableName, fields });
    }

    return allTables;
  }

  // Test database connection
  async testConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT NOW() as current_time');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}
