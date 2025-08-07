#!/usr/bin/env node

/**
 * resource0 table subscription test script
 * Used to test gRPC client subscription functionality, monitoring real-time data changes in resource0 table
 */

import { DubheGrpcClient } from '../src/index';
import type { SubscribeRequest, TableChange } from '../src/index';

// Configuration
const GRPC_CONFIG = {
  baseUrl: process.env.GRPC_URL || 'http://127.0.0.1:8084'
};

const TABLE_NAME = 'resource0';

// Create client
const client = new DubheGrpcClient(GRPC_CONFIG);

// Color output and logging tools
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const log = {
  info: (msg: string) => colorLog(`ℹ️ ${msg}`, 'blue'),
  success: (msg: string) => colorLog(`✅ ${msg}`, 'green'),
  error: (msg: string) => colorLog(`❌ ${msg}`, 'red'),
  warn: (msg: string) => colorLog(`⚠️ ${msg}`, 'yellow'),
  data: (msg: string) => colorLog(`📊 ${msg}`, 'cyan'),
  change: (msg: string) => colorLog(`🔄 ${msg}`, 'magenta')
};

// Statistics information
interface SubscriptionStats {
  totalChanges: number;
  startTime: Date;
  lastChangeTime: Date | null;
  changeTypes: Map<string, number>;
}

const stats: SubscriptionStats = {
  totalChanges: 0,
  startTime: new Date(),
  lastChangeTime: null,
  changeTypes: new Map()
};

// Process table change data
function processTableChange(change: TableChange): void {
  stats.totalChanges++;
  stats.lastChangeTime = new Date();

  // Record change type (if available)
  if (change.data?.fields) {
    const changeType = 'data_change'; // Can be subdivided based on actual data structure
    stats.changeTypes.set(changeType, (stats.changeTypes.get(changeType) || 0) + 1);
  }

  // Display change information
  log.change(`Change #${stats.totalChanges}`);
  console.log(`  📅 Time: ${stats.lastChangeTime.toISOString()}`);
  console.log(`  📋 Table ID: ${change.tableId}`);

  if (change.data?.fields) {
    console.log(`  📝 Data:`);
    console.log(JSON.stringify(change.data.fields, null, 4));
  } else {
    console.log(`  📝 Data: No data fields`);
  }

  console.log(`  📊 Total changes: ${stats.totalChanges}`);
  console.log('-'.repeat(60));
}

// Show statistics information
function showStats(): void {
  const duration = new Date().getTime() - stats.startTime.getTime();
  const durationSeconds = Math.round(duration / 1000);

  console.log('\n' + '='.repeat(60));
  log.data('📈 Subscription Statistics');
  console.log(`  🕐 Runtime: ${durationSeconds} seconds`);
  console.log(`  📊 Total changes: ${stats.totalChanges}`);
  console.log(`  🕒 Start time: ${stats.startTime.toISOString()}`);

  if (stats.lastChangeTime) {
    console.log(`  🕓 Last change: ${stats.lastChangeTime.toISOString()}`);
    const avgInterval =
      stats.totalChanges > 1
        ? (stats.lastChangeTime.getTime() - stats.startTime.getTime()) /
          (stats.totalChanges - 1) /
          1000
        : 0;
    console.log(`  ⚡ Average interval: ${avgInterval.toFixed(2)} seconds/change`);
  } else {
    console.log(`  🕓 Last change: No changes`);
  }

  if (stats.changeTypes.size > 0) {
    console.log(`  📋 Change types:`);
    stats.changeTypes.forEach((count, type) => {
      console.log(`    - ${type}: ${count} times`);
    });
  }
  console.log('='.repeat(60));
}

// Main subscription function
async function subscribeToResource0(): Promise<void> {
  log.info('🚀 Starting subscription to resource0 table changes...');
  console.log(`🔗 Connecting to: ${GRPC_CONFIG.baseUrl}`);
  console.log(`📋 Subscribing table: ${TABLE_NAME}`);
  console.log(`💡 Press Ctrl+C to stop subscription\n`);

  const subscribeRequest: SubscribeRequest = {
    tableIds: [TABLE_NAME]
  };

  let subscription: any = null;
  let isRunning = true;

  // Graceful exit handling
  const gracefulExit = () => {
    if (isRunning) {
      isRunning = false;
      log.info('🛑 Stopping subscription...');

      if (subscription) {
        subscription.close();
      }

      showStats();
      log.success('👋 Subscription stopped');
      process.exit(0);
    }
  };

  // Register signal handlers
  process.on('SIGINT', gracefulExit);
  process.on('SIGTERM', gracefulExit);

  // Periodically show statistics (every 30 seconds)
  const statsInterval = setInterval(() => {
    if (isRunning) {
      showStats();
    }
  }, 30000);

  try {
    subscription = client.dubheGrpcClient.subscribeTable(subscribeRequest);
    log.success('✅ Subscription established, waiting for data changes...');
    console.log('-'.repeat(60));

    // Listen for changes
    for await (const change of subscription.responses) {
      if (!isRunning) break;

      try {
        processTableChange(change);
      } catch (error) {
        log.error(`Error processing change data: ${error}`);
      }
    }
  } catch (error) {
    log.error(`Error occurred during subscription: ${error}`);

    // If it's a connection error, provide some help information
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch')) {
        log.warn('💡 Connection refused, please check:');
        console.log('   - Whether gRPC server is running');
        console.log('   - Whether server address is correct');
        console.log('   - Whether network connection is normal');
      }
    }

    throw error;
  } finally {
    clearInterval(statsInterval);
    if (subscription) {
      subscription.close();
    }
  }
}

// Simple function to test connection
async function testConnection(): Promise<boolean> {
  try {
    log.info('🔍 Testing connection...');

    // Use a simple query to test connection
    const testQuery = {
      tableName: TABLE_NAME,
      selectFields: [],
      filters: [],
      sorts: [],
      includeTotalCount: false,
      pagination: {
        page: 1,
        pageSize: 1
      }
    };

    await client.dubheGrpcClient.queryTable(testQuery);
    log.success('✅ Connection test successful');
    return true;
  } catch (error) {
    log.error(`❌ Connection test failed: ${error}`);
    return false;
  }
}

// Main function
async function main(): Promise<void> {
  colorLog('🎯 Dubhe gRPC Subscription Test Tool', 'magenta');
  console.log('='.repeat(60));

  try {
    // Test connection first
    const connectionOk = await testConnection();
    if (!connectionOk) {
      log.error('Connection failed, cannot continue subscription test');
      process.exit(1);
    }

    console.log(''); // Empty line

    // Start subscription
    await subscribeToResource0();
  } catch (error) {
    log.error(`Error occurred during testing: ${error}`);
    showStats();
    process.exit(1);
  }
}

// If running this file directly, execute the main function
if (require.main === module) {
  main().catch((error) => {
    console.error('Uncaught error:', error);
    process.exit(1);
  });
}

// Export functions for use by other files
export { subscribeToResource0, testConnection, showStats };
