#!/usr/bin/env node

/**
 * Simple resource0 table test script
 * For quickly testing basic gRPC client functionality
 */

import { DubheGrpcClient, FilterOperator, SortDirection } from '../src/index';
import type { QueryRequest } from '../src/index';

// Configuration
const GRPC_CONFIG = {
  baseUrl: process.env.GRPC_URL || 'http://localhost:8080'
};

const TABLE_NAME = 'counter0';

// Create client
const client = new DubheGrpcClient(GRPC_CONFIG);

// Simple color output
const log = {
  info: (msg: string) => console.log(`ℹ️ ${msg}`),
  success: (msg: string) => console.log(`✅ ${msg}`),
  error: (msg: string) => console.log(`❌ ${msg}`),
  warn: (msg: string) => console.log(`⚠️ ${msg}`),
  data: (msg: string) => console.log(`📊 ${msg}`)
};

// Simple query test
async function simpleQuery() {
  log.info('Starting simple query test...');

  try {
    const request: QueryRequest = {
      tableName: TABLE_NAME,
      selectFields: [],
      filters: [],
      sorts: [],
      includeTotalCount: true,
      pagination: {
        page: 1,
        pageSize: 5
      }
    };

    const response = await client.dubheGrpcClient.queryTable(request);
    console.log(response);
    const result = response.response;

    log.success(`Query successful! Returned ${result.rows.length} rows of data`);

    if (result.pagination) {
      log.data(`Total records: ${result.pagination.totalItems}`);
      log.data(`Total pages: ${result.pagination.totalPages}`);
    }

    // Show first row of data as example
    if (result.rows.length > 0) {
      log.data('First row data:');
      console.log(JSON.stringify(result.rows[0].fields, null, 2));
    }
  } catch (error) {
    log.error(`Query failed: ${error}`);
    throw error;
  }
}

// Filtered query test
async function filteredQuery() {
  log.info('Starting filtered query test...');

  try {
    // Using a generic filter condition here, you may need to modify based on actual table structure
    const request: QueryRequest = {
      tableName: TABLE_NAME,
      selectFields: [],
      filters: [
        {
          fieldName: 'value', // Assuming there is a value field
          operator: FilterOperator.GREATER_THAN,
          value: {
            value: {
              oneofKind: 'intValue',
              intValue: BigInt(0)
            }
          }
        }
      ],
      sorts: [
        {
          fieldName: 'value',
          direction: SortDirection.DESCENDING
        }
      ],
      includeTotalCount: true,
      pagination: {
        page: 1,
        pageSize: 3
      }
    };

    const response = await client.dubheGrpcClient.queryTable(request);
    const result = response.response;

    log.success(`Filtered query successful! Returned ${result.rows.length} rows of data`);

    if (result.rows.length > 0) {
      log.data('First few rows of filtered data:');
      result.rows.forEach((row, index) => {
        console.log(`Row ${index + 1}:`, JSON.stringify(row.fields, null, 2));
      });
    }
  } catch (error) {
    log.error(`Filtered query failed: ${error}`);
  }
}

// Main function
async function main() {
  console.log('🚀 Dubhe gRPC Client Test');
  console.log(`🔗 Connecting to: ${GRPC_CONFIG.baseUrl}`);
  console.log(`📋 Test table: ${TABLE_NAME}`);
  console.log('='.repeat(50));

  try {
    // Run tests
    await simpleQuery();
    console.log('='.repeat(50));
    await filteredQuery();

    log.success('All tests completed!');
  } catch (error) {
    log.error(`Error occurred during testing: ${error}`);
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  main().catch(console.error);
}
