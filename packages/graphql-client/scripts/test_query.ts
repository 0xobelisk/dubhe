import { createDubheGraphqlClient } from '../src';
import dubheMetadata from '../dubhe.config_1.json';

const CONFIG = {
  endpoint: 'http://localhost:4000/graphql',
  // Only set subscription endpoint when WebSocket is supported
  subscriptionEndpoint: 'ws://localhost:4000/graphql',
  headers: {
    'Content-Type': 'application/json'
  },
  dubheMetadata
};

// Main function
async function main() {
  console.log('🔍 Checking runtime environment...');
  console.log(`📍 Node.js environment: ${typeof window === 'undefined' ? 'Yes' : 'No'}`);

  const client = createDubheGraphqlClient(CONFIG);

  // Test using client subscription methods (only runs when WebSocket is supported)
  console.log('\n🔔 === Testing Client Subscription Methods ===');

  console.log('Using subscribeToTableChanges method to subscribe...');

  // Call subscribe() directly to start subscription, callbacks are already handled in options
  const data = await client.getAllTables('counter1', {
    first: 10
  });
  // .subscribe({}); // Pass empty object to satisfy linter requirements
  console.log(JSON.stringify(data, null, 2));

  const data1 = await client.getTableByCondition('counter1', {
    entityId: '0xd7b69493da10a0e733b13d3213b20beb1630a50b949876b352b002f4818a9388'
  });
  // Save subscription reference
  console.log(JSON.stringify(data1, null, 2));

  console.log('🎯 Subscription started successfully! Waiting for data updates...');
  console.log(
    '💡 Tip: You can modify the database in another terminal to trigger subscription events'
  );
}

main();
