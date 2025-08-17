# ECS Monster Hunter Test Script Usage Guide

## Overview

`test_ecs_monster_hunter.ts` is a comprehensive test script that demonstrates how to use the latest Dubhe ECS system to query component data in the Monster Hunter game.

## Features

### 🎯 Main Test Content

1. **ECS World Initialization**

   - Automatically create ECS world using dubhe configuration
   - Auto-discover and configure components
   - Display configuration strategy and field parsing status

2. **Component Metadata Queries**

   - View position component (contains x, y coordinates)
   - View player component (empty component)
   - Display component fields, types and primary key information

3. **Standard ECS Interface Demonstration**

   - `getEntitiesByComponent()` - Query entities by component type
   - `getEntity()` - Get complete entity data
   - `getComponent()` - Get specific component data
   - `hasComponent()` - Check if entity has component
   - `getComponents()` - Get all components of entity

4. **Game Data Analysis**
   - Player position information statistics
   - Map configuration queries
   - Monster data analysis
   - Other game component statistics

### 🎮 Monster Hunter Components

The script will test the following game components:

- **player**: Player entity (empty component)
- **position**: Position component (x, y coordinates)
- **moveable**: Moveable marker
- **obstruction**: Obstruction marker
- **encounterable**: Encounterable marker
- **encounter**: Encounter data (monster address, capture attempt count)
- **monster**: Monster data (ID, type)
- **map_config**: Map configuration (width, height, terrain)

## Usage

### 1. Basic Run

```bash
# In sui-client directory
cd packages/sui-client

# Run with default endpoint
npx tsx scripts/test_ecs_monster_hunter.ts

# Or use ts-node
ts-node scripts/test_ecs_monster_hunter.ts
```

### 2. Custom GraphQL Endpoint

```bash
# Set environment variable
export GRAPHQL_ENDPOINT=http://your-graphql-server:4000/graphql

# Run test
npx tsx scripts/test_ecs_monster_hunter.ts
```

### 3. Programmatic Usage

```typescript
import { testMonsterHunterECS } from './scripts/test_ecs_monster_hunter';

// Run test
await testMonsterHunterECS();
```

## Example Output

```
🎮 === Monster Hunter ECS Test ===

🔌 Creating GraphQL client...
🌍 Creating ECS world...
🚀 Initializing ECS world...
✅ ECS world initialization completed
📋 Strategy used: dubhe-config
🔧 Auto field parsing: true

📦 === Available Components List ===
Found 11 components:
  - player
  - position
  - moveable
  - obstruction
  - map_config
  - encounterable
  - encounter_trigger
  - encounter
  - monster
  - owned_by
  - monster_catch_attempt

📍 === Position Component Metadata ===
Component name: position
Table name: position
Primary keys: [id]
Fields:
  - id: string (required)
  - x: u64 (required)
  - y: u64 (required)
Description: Position component for Monster Hunter game

🔍 === Standard ECS Interface Query ===
👥 Querying all player entities...
Found 5 player entities
First 3 player IDs: [0x123..., 0x456..., 0x789...]

📍 Querying all entities with position...
Found 12 entities with position

🎯 Querying entities with both player and position...
Found 5 players with position

📊 === Player Detailed Data ===
🎮 Player 1 (ID: 0x123...):
  Complete data: {
    "id": "0x123...",
    "player": {},
    "position": { "x": "100", "y": "200" }
  }
  Has player component: true
  Has position component: true
  Position data: { "x": "100", "y": "200" }
  All components: [player, position, moveable]

✅ === Test Completed ===
```

## Error Handling

### Connection Error

If you see connection errors:

```
❌ Test failed: Error: connect ECONNREFUSED 127.0.0.1:4000

💡 Connection tips:
Please ensure GraphQL server is running at: http://localhost:4000/graphql
You can set the endpoint via environment variable: GRAPHQL_ENDPOINT=http://your-server:port/graphql
```

**Solutions**:

1. Start your GraphQL server
2. Confirm the endpoint address is correct
3. Set the correct `GRAPHQL_ENDPOINT` environment variable

### Component Not Found

If certain component queries return empty results, this might be normal, indicating:

- No entities of that type exist in the database
- Component configuration may need adjustment
- GraphQL schema may not match

## Customization and Extension

### Adding New Tests

Add new test code in the `testMonsterHunterECS()` function:

```typescript
// Test custom query
console.log('🔍 === Custom Query ===');
const strongMonsters = await world.queryWith('monster', {
  filter: { monster_type: 'Eagle' }
});
console.log(`Found ${strongMonsters.length} eagles`);
```

### Modifying Configuration

You can modify component configuration in `dubhe.config.ts`, and the test script will automatically use the new configuration.

## Dependencies

- Node.js >= 16
- TypeScript
- Running GraphQL server
- Properly configured Monster Hunter database

## Related Files

- `dubhe.config.ts` - Monster Hunter game configuration
- `src/libs/ecs/` - ECS system implementation
- `src/libs/dubheGraphqlClient/` - GraphQL client implementation

---

💡 **Tip**: This test script is the best starting point for learning and understanding the Dubhe ECS system!
