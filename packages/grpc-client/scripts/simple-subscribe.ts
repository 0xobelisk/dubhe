#!/usr/bin/env node

/**
 * Simple resource0 table subscription test
 * Basic subscription functionality test, suitable for quick verification
 */

import { DubheGrpcClient } from '../src/index';
import type { SubscribeRequest } from '../src/index';

// Configuration
const GRPC_URL = process.env.GRPC_URL || 'http://localhost:8080';
const TABLE_NAME = 'resource0';

// Create client
const client = new DubheGrpcClient({ baseUrl: GRPC_URL });

async function simpleSubscribe(): Promise<void> {
  console.log('🚀 Starting simple subscription test');
  console.log(`📡 Server: ${GRPC_URL}`);
  console.log(`📋 Table name: ${TABLE_NAME}`);
  console.log('Press Ctrl+C to stop\n');

  const subscribeRequest: SubscribeRequest = {
    tableIds: [TABLE_NAME]
  };

  let changeCount = 0;
  const maxChanges = 10; // Maximum 10 changes to display

  try {
    const subscription = client.dubheGrpcClient.subscribeTable(subscribeRequest);

    console.log('✅ Subscription successful, listening for data changes...\n');

    // Listen for changes
    for await (const change of subscription.responses) {
      changeCount++;

      console.log(`🔄 Change #${changeCount}:`);
      console.log(`   Table ID: ${change.tableId}`);
      console.log(`   Time: ${new Date().toISOString()}`);

      if (change.data?.fields) {
        console.log(`   Data: ${JSON.stringify(change.data.fields, null, 2)}`);
      } else {
        console.log(`   Data: None`);
      }

      console.log('-'.repeat(50));

      // Stop after reaching maximum count
      if (changeCount >= maxChanges) {
        console.log(`\n📊 Received ${maxChanges} changes, stopping subscription`);
        break;
      }
    }

    console.log(`\n✅ Subscription ended, total ${changeCount} changes received`);
  } catch (error) {
    console.error(`❌ Subscription failed: ${error}`);

    // Provide troubleshooting suggestions
    console.log('\n💡 Troubleshooting suggestions:');
    console.log('1. Check if gRPC server is running');
    console.log('2. Verify server address and port');
    console.log('3. Confirm table name is correct');
    console.log(`4. Try setting environment variable: export GRPC_URL=${GRPC_URL}`);
  }
}

// Run
if (require.main === module) {
  simpleSubscribe().catch(console.error);
}
