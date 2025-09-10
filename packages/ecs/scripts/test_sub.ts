/**
 * ECS Monster Hunter Test Script
 *
 * Test the monster_hunter game component queries using the latest Dubhe ECS system
 * Mainly test position and player component query functionality
 */

import { createDubheGraphqlClient } from '@0xobelisk/graphql-client';
import { createECSWorld, DubheECSWorld } from '../src';
import dubheMetadata from '../dubhe.config_1.json';

// GraphQL endpoint configuration
const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql';

/**
 * Main test function
 */
async function testMonsterHunterECS() {
  console.log('🎮 === Monster Hunter ECS Test ===\n');

  let world: DubheECSWorld | null = null;

  try {
    // 1. Create GraphQL client (using dubhe configuration)
    console.log('🔌 Creating GraphQL client...');
    const client = createDubheGraphqlClient({
      endpoint: GRAPHQL_ENDPOINT,
      dubheMetadata
    });

    // 2. Create ECS world (automatically uses dubhe-config mode)
    console.log('🌍 Creating ECS world...');
    world = createECSWorld(client);

    // 3. Use new Observable subscription mode
    console.log('📡 Starting component change subscription...');

    const subscription = world
      .onComponentChanged<any>('counter1', {
        initialEvent: true
        // debounceMs: 500, // 500ms debounce
      })
      .subscribe({
        next: (result: any) => {
          // More strictly check the structure of result object
          console.log(
            `📢 [${new Date().toLocaleTimeString()}] Entity ${
              result.entityId
            } counter1 component changed:`
          );
          console.log(`  - Change type: ${result.changeType}`);
          console.log(`  - Component data:`, result.data);
          console.log(`  - Timestamp: ${result.timestamp}`);
          console.log('---');
        },
        error: (error: any) => {
          console.error('❌ Subscription failed:', error);
        },
        complete: () => {
          console.log('✅ Subscription completed');
        }
      });

    // // 4. Query an entity as test
    // console.log('🔍 Querying entity data...');
    // try {
    //   const entity = await world.getEntity(
    //     '0xd7b69493da10a0e733b13d3213b20beb1630a50b949876b352b002f4818a9388'
    //   );
    //   console.log('📊 Entity data:', entity);
    // } catch (_error) {
    //   console.log('⚠️ Entity query failed, entity may not exist');
    // }

    // 5. Query all entities
    console.log('🔍 Querying all entities...');
    try {
      const entities = await world.getAllEntities();
      console.log(`📊 Found ${entities.length} entities`);
      if (entities.length > 0) {
        console.log('First few entity IDs:', entities.slice(0, 3));
      }
    } catch (_error) {
      console.log('⚠️ Entity list query failed');
    }

    // 6. Clean up after running for a while
    console.log('⏰ Subscription will automatically stop after 30 seconds...');
    setTimeout(() => {
      console.log('🛑 Stopping subscription...');
      subscription.unsubscribe();
      console.log('✅ Test completed');
      process.exit(0);
    }, 3000000);
  } catch (_error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Handle program exit
process.on('SIGINT', () => {
  console.log('\n🛑 Received exit signal, cleaning up resources...');
  process.exit(0);
});

console.log('🚀 Starting ECS subscription test...');
testMonsterHunterECS();
