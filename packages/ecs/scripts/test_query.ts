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

  // 1. Create GraphQL client (using dubhe configuration)
  console.log('🔌 Creating GraphQL client...');
  const client = createDubheGraphqlClient({
    endpoint: GRAPHQL_ENDPOINT,
    dubheMetadata
  });

  // 2. Create ECS world (automatically uses dubhe-config mode)
  console.log('🌍 Creating ECS world...');
  world = createECSWorld(client);
  const components = await world.getAvailableComponents();
  console.log('components', components);
  const resources = await world.getAvailableResources();
  console.log('resources', resources);

  const entity = await world.getEntity(
    '0xd7b69493da10a0e733b13d3213b20beb1630a50b949876b352b002f4818a9388'
  );
  console.log(entity);

  const component = await world.getComponent(
    '0xd7b69493da10a0e733b13d3213b20beb1630a50b949876b352b002f4818a9388',
    'counter1'
  );
  console.log(component);

  // const resource = await world.getResources('counter2');
  const resource = await world.getResource('counter2', {
    value: '1'
  });
  console.log(resource);
}

testMonsterHunterECS();
