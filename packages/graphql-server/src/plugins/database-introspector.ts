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

// Scan database table structure
export class DatabaseIntrospector {
  constructor(private pool: Pool, private schema: string = 'public') {}

  // Get all dynamically created store_* tables
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

  // Get system tables (dubhe related tables)
  async getSystemTables(): Promise<string[]> {
    const result = await this.pool.query(
      `
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_schema = $1 
				AND (table_name = 'table_fields')
			ORDER BY table_name
		`,
      [this.schema]
    );

    return result.rows.map((row) => row.table_name);
  }

  // Get dynamic table field information from table_fields table
  async getDynamicTableFields(tableName: string): Promise<TableField[]> {
    // Extract table name (remove store_ prefix)
    const baseTableName = tableName.replace('store_', '');

    const result = await this.pool.query(
      `
			SELECT field_name, field_type, field_index, is_key
			FROM table_fields 
			WHERE table_name = $1
			ORDER BY is_key DESC, field_index ASC
		`,
      [baseTableName]
    );

    return result.rows;
  }

  // Get field information from system tables
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
    const systemTables = await this.getSystemTables();
    const allTables: DynamicTable[] = [];

    // Process dynamic tables
    for (const tableName of storeTables) {
      const fields = await this.getDynamicTableFields(tableName);
      allTables.push({
        table_name: tableName,
        fields
      });
    }

    // Process system tables
    for (const tableName of systemTables) {
      const fields = await this.getSystemTableFields(tableName);
      allTables.push({
        table_name: tableName,
        fields
      });
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
