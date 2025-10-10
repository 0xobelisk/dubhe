import { gql } from '@apollo/client';
import { createDubheGraphqlClient, DubheGraphqlClient } from '../src';

// Type definitions
interface EncounterNode {
  catchAttempts?: number;
  exists?: boolean;
  monster?: string;
  nodeId: string;
  player?: string;
}

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

interface EncountersConnection {
  nodes: EncounterNode[];
  totalCount: number;
  pageInfo: PageInfo;
}

interface QueryResult {
  encounters: EncountersConnection;
}

interface SubscriptionResult {
  encountersChanged: EncounterNode;
}

// Check if ws module is available
function checkWebSocketSupport(): boolean {
  try {
    if (typeof window !== 'undefined') {
      // Browser environment, has native WebSocket
      return true;
    } else {
      // Node.js environment, need to check ws module
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('ws');
      return true;
    }
  } catch (_error) {
    return false;
  }
}

// Configuration
const hasWebSocketSupport = checkWebSocketSupport();

const CONFIG = {
  endpoint: 'http://localhost:4000/graphql',
  // Only set subscription endpoint when WebSocket is supported
  ...(hasWebSocketSupport && {
    subscriptionEndpoint: 'ws://localhost:4000/graphql'
  }),
  headers: {
    'Content-Type': 'application/json'
  }
};

// Test query
const TEST_QUERY = gql`
  query MyQuery {
    encounters {
      nodes {
        catchAttempts
        exists
        monster
        nodeId
        player
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

// Test subscription (only used when WebSocket is supported)
const TEST_SUBSCRIPTION = gql`
  subscription MySubscription {
    encounters {
      nodes {
        player
        monster
        catchAttempts
        exists
      }
    }
  }
`;

// Simple query
const SIMPLE_QUERY = gql`
  query SimpleQuery($first: Int) {
    encounters(first: $first) {
      nodes {
        player
      }
      totalCount
    }
  }
`;

class GraphQLTester {
  private client: DubheGraphqlClient;
  private supportsSubscriptions: boolean;

  constructor() {
    console.log('🚀 Initializing GraphQL client...');

    this.supportsSubscriptions = hasWebSocketSupport;

    if (!this.supportsSubscriptions) {
      console.log(
        '⚠️  Warning: WebSocket support not available, subscription functionality tests will be skipped'
      );
      console.log(
        '💡 To enable subscription functionality, please install ws module: npm install ws'
      );
    }

    this.client = createDubheGraphqlClient(CONFIG);
  }

  // Test basic query
  async testBasicQuery() {
    console.log('\n📊 === Testing Basic Query ===');

    try {
      console.log('Sending query request...');
      const result = await this.client.query(TEST_QUERY);

      if (result.error) {
        console.error('❌ Query error:', result.error.message);
        return;
      }

      console.log('✅ Query successful!');

      // Type assertion
      const data = result.data as QueryResult;

      console.log('📈 Data statistics:');
      console.log(`  - Total count: ${data?.encounters?.totalCount || 0}`);
      console.log(`  - Current page count: ${data?.encounters?.nodes?.length || 0}`);
      console.log(`  - Has next page: ${data?.encounters?.pageInfo?.hasNextPage || false}`);

      if (data?.encounters?.nodes?.length > 0) {
        console.log('\n📋 First few records:');
        data.encounters.nodes.slice(0, 3).forEach((node: EncounterNode, index: number) => {
          console.log(`  ${index + 1}. Player: ${node.player || 'N/A'}`);
          console.log(`     Monster: ${node.monster || 'N/A'}`);
          console.log(`     Catch Attempts: ${node.catchAttempts || 0}`);
          console.log(`     Exists: ${node.exists}`);
          console.log('     ---');
        });
      } else {
        console.log('📝 Data is empty, you may need to run indexer first to sync data');
      }
    } catch (error) {
      console.error('❌ Query exception:', error);
    }
  }

  // Test parameterized query
  async testParameterizedQuery() {
    console.log('\n🔍 === Testing Parameterized Query ===');

    try {
      console.log('Sending parameterized query request (first: 5)...');
      const result = await this.client.query(SIMPLE_QUERY, { first: 5 });

      if (result.error) {
        console.error('❌ Query error:', result.error.message);
        return;
      }

      console.log('✅ Parameterized query successful!');

      // Type assertion
      const data = result.data as QueryResult;

      console.log(`📊 Returned data count: ${data?.encounters?.nodes?.length || 0}`);
      console.log(`📈 Total count: ${data?.encounters?.totalCount || 0}`);
    } catch (error) {
      console.error('❌ Parameterized query exception:', error);
    }
  }

  // Test using client wrapped methods
  async testClientMethods() {
    console.log('\n⚡ === Testing Client Wrapped Methods ===');

    try {
      console.log('Using getAllTables method to query encounters...');
      const result = await this.client.getAllTables('encounters', {
        first: 3,
        orderBy: [{ field: 'player', direction: 'ASC' }],
        fields: ['nodeId', 'player', 'monster', 'catchAttempts', 'exists'] // Specify needed fields
      });

      console.log('✅ getAllTables query successful!');
      console.log(`📊 Returned data count: ${result.edges?.length || 0}`);

      if (result.edges?.length > 0) {
        console.log('\n📋 Data details:');
        result.edges.forEach((edge: any, index: number) => {
          console.log(`  ${index + 1}. Player: ${edge.node.player || 'N/A'}`);
          console.log(`     Monster: ${edge.node.monster || 'N/A'}`);
          console.log(`     NodeId: ${edge.node.nodeId || 'N/A'}`);
        });
      }

      // Test other tables
      console.log('\nTrying to query other tables...');

      // Test accounts table
      try {
        const accounts = await this.client.getAllTables('accounts', {
          first: 2,
          fields: ['nodeId', 'assetId', 'account', 'balance'] // Specify accounts table fields
        });
        console.log(
          `✅ accounts table query successful, data count: ${accounts.edges?.length || 0}`
        );
      } catch (error) {
        console.log(`ℹ️ accounts table may be empty or not exist:`, (error as Error).message);
      }

      // Test positions table
      try {
        const positions = await this.client.getAllTables('positions', {
          first: 2,
          fields: ['nodeId', 'account', 'x', 'y'] // Specify positions table fields
        });
        console.log(
          `✅ positions table query successful, data count: ${positions.edges?.length || 0}`
        );
      } catch (error) {
        console.log(`ℹ️ positions table may be empty or not exist:`, (error as Error).message);
      }

      // Test mapConfigs table
      try {
        const mapConfigs = await this.client.getAllTables('mapConfigs', {
          first: 2,
          fields: ['nodeId', 'key', 'value'] // Specify mapConfigs table fields
        });
        console.log(
          `✅ mapConfigs table query successful, data count: ${mapConfigs.edges?.length || 0}`
        );
      } catch (error) {
        console.log(`ℹ️ mapConfigs table may be empty or not exist:`, (error as Error).message);
      }
    } catch (error) {
      console.error('❌ Client method test exception:', error);
    }
  }

  // Test subscription functionality (only runs when WebSocket is supported)
  async testSubscription() {
    console.log('\n🔔 === Testing Subscription Functionality ===');

    if (!this.supportsSubscriptions) {
      console.log('⚠️  Skipping subscription test: WebSocket support not available');
      console.log('💡 To enable subscription functionality, please run: npm install ws');
      return;
    }

    return new Promise<void>((resolve) => {
      let messageCount = 0;
      const maxMessages = 3; // Wait for maximum 3 messages
      const timeout = 15000; // 15 second timeout

      console.log('Starting subscription to encounters data changes...');
      console.log(`⏱️ Will wait for ${timeout / 1000} seconds or ${maxMessages} messages`);

      try {
        const subscription = this.client.subscribe(TEST_SUBSCRIPTION);

        const timer = setTimeout(() => {
          console.log(`⏰ ${timeout / 1000} second timeout, ending subscription test`);
          sub.unsubscribe();
          resolve();
        }, timeout);

        const sub = subscription.subscribe({
          next: (result: any) => {
            messageCount++;
            console.log(`\n📨 Received subscription message #${messageCount}:`);

            if (result.error) {
              console.error('❌ Subscription error:', result.error.message);
            } else if (result.data) {
              const subscriptionData = result.data as SubscriptionResult;
              console.log('✅ Subscription data:', JSON.stringify(subscriptionData, null, 2));
            } else {
              console.log('📭 Received empty data packet');
            }

            if (messageCount >= maxMessages) {
              console.log(`✅ Received ${maxMessages} messages, ending subscription test`);
              clearTimeout(timer);
              sub.unsubscribe();
              resolve();
            }
          },
          error: (error: any) => {
            console.error('❌ Subscription connection error:', error);
            clearTimeout(timer);
            resolve();
          },
          complete: () => {
            console.log('✅ Subscription connection completed');
            clearTimeout(timer);
            resolve();
          }
        });

        console.log('🟢 Subscription started, waiting for data changes...');
        console.log(
          '💡 Tip: You can trigger data changes through indexer to test subscription functionality'
        );
      } catch (error) {
        console.error('❌ Subscription startup failed:', error);
        resolve();
      }
    });
  }

  // Test using client subscription methods (only runs when WebSocket is supported)
  async testClientSubscription() {
    console.log('\n🔔 === Testing Client Subscription Methods ===');

    if (!this.supportsSubscriptions) {
      console.log('⚠️  Skipping client subscription test: WebSocket support not available');
      return;
    }

    return new Promise<void>((resolve) => {
      const timeout = 10000; // 10 second timeout

      console.log('Using subscribeToTableChanges method to subscribe...');

      try {
        const subscription = this.client.subscribeToTableChanges('encounters', {
          onData: (data: any) => {
            console.log('✅ Received subscription data:', data);
          },
          onError: (error: any) => {
            console.error('❌ Subscription error:', error);
          },
          onComplete: () => {
            console.log('✅ Subscription completed');
          },
          fields: ['nodeId', 'player', 'monster', 'catchAttempts', 'exists'] // Specify fields to subscribe to
        });

        const timer = setTimeout(() => {
          console.log('⏰ 10 second timeout, ending client subscription test');
          sub.unsubscribe();
          resolve();
        }, timeout);

        const sub = subscription.subscribe({
          next: (result: any) => {
            if (result.data) {
              console.log('📨 Client subscription received data:', result.data);
            }
          },
          error: (error: any) => {
            console.error('❌ Client subscription error:', error);
            clearTimeout(timer);
            resolve();
          }
        });

        console.log('🟢 Client subscription started');
      } catch (error) {
        console.error('❌ Client subscription startup failed:', error);
        resolve();
      }
    });
  }

  // Test single data query
  async testSingleDataQuery() {
    console.log('\n🔍 === Testing Single Data Query ===');

    try {
      // Method 1: Use getTableByCondition (recommended)
      console.log('Method 1: Using getTableByCondition to query single encounter by player...');

      try {
        const singleEncounter = await this.client.getTableByCondition(
          'encounters',
          {
            player: '0x0000000000000000000000000000000000000000000000000000000000000001'
          },
          ['nodeId', 'player', 'monster', 'catchAttempts', 'exists']
        );

        if (singleEncounter) {
          console.log('✅ Found single record:');
          console.log(`  Player: ${singleEncounter.player}`);
          console.log(`  Monster: ${singleEncounter.monster}`);
          console.log(`  Catch Attempts: ${singleEncounter.catchAttempts}`);
          console.log(`  NodeId: ${singleEncounter.nodeId}`);
        } else {
          console.log('❌ No matching record found');
        }
      } catch (error) {
        console.log(
          'ℹ️ getTableByCondition may not be supported, error:',
          (error as Error).message
        );
      }

      // Method 2: Use getAllTables limit to 1
      console.log('\nMethod 2: Using getAllTables first: 1 to query single record...');

      const result = await this.client.getAllTables('encounters', {
        first: 1,
        filter: {
          player: {
            equalTo: '0x0000000000000000000000000000000000000000000000000000000000000002'
          }
        },
        fields: ['nodeId', 'player', 'monster', 'catchAttempts', 'exists']
      });

      if (result.edges.length > 0) {
        const encounter = result.edges[0].node;
        console.log('✅ Queried single record through first: 1:');
        console.log(`  Player: ${encounter.player}`);
        console.log(`  Monster: ${encounter.monster}`);
        console.log(`  Catch Attempts: ${encounter.catchAttempts}`);
        console.log(`  NodeId: ${encounter.nodeId}`);
      } else {
        console.log('❌ No matching record found');
      }

      // Method 3: Test querying non-existent record
      console.log('\nMethod 3: Testing query for non-existent record...');

      const notFound = await this.client.getAllTables('encounters', {
        first: 1,
        filter: {
          player: { equalTo: '0xnonexistent' }
        },
        fields: ['nodeId', 'player']
      });

      if (notFound.edges.length === 0) {
        console.log('✅ Correctly handled non-existent record, returned empty result');
      } else {
        console.log('⚠️ Unexpectedly found record');
      }

      // Method 4: Test exact query (if table supports other field queries)
      console.log('\nMethod 4: Testing query using other conditions...');

      const catchAttemptsResult = await this.client.getAllTables('encounters', {
        first: 1,
        filter: {
          catchAttempts: { equalTo: '5' }
        },
        fields: ['nodeId', 'player', 'monster', 'catchAttempts']
      });

      if (catchAttemptsResult.edges.length > 0) {
        const encounter = catchAttemptsResult.edges[0].node;
        console.log('✅ Queried record by catchAttempts:');
        console.log(`  Player: ${encounter.player}`);
        console.log(`  Catch Attempts: ${encounter.catchAttempts}`);
      } else {
        console.log('ℹ️ No record found with catchAttempts = 5');
      }
    } catch (error) {
      console.error('❌ Single data query test exception:', error);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🎯 === Starting comprehensive GraphQL test ===\n');

    await this.testBasicQuery();
    await this.testParameterizedQuery();
    await this.testClientMethods();
    await this.testSingleDataQuery();

    if (this.supportsSubscriptions) {
      await this.testSubscription();
      await this.testClientSubscription();
    }

    console.log('\n🎉 === All tests completed ===');
    console.log('\n💡 Tips:');
    console.log('  1. Ensure GraphQL server is running at: http://localhost:4000/graphql');
    console.log('  2. Check if there is data in the database');
    console.log('  3. For subscription tests, you can trigger data changes through indexer');
    console.log(
      '  4. If encountering WebSocket errors, ensure ws module is installed: npm install ws'
    );

    // Close client connection
    this.client.close();
  }
}

// Main function
async function main() {
  console.log('🚀 === DubheGraphqlClient Apollo Integration Test ===\n');

  try {
    const tester = new GraphQLTester();
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise rejection:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Run test
if (require.main === module) {
  main();
}

export { GraphQLTester, main };
