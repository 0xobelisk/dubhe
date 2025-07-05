# ECS Package Update Documentation

## Overview

This update adds automatic configuration parsing functionality based on **DubheMetadata JSON format** to the ECS package, achieving proper separation of Components and Resources, and providing dedicated query methods for each type.

## Main Changes

### 1. Flexible Configuration Options

**DubheMetadata is now optional**, the system supports multiple configuration approaches:

```typescript
// Method 1: Get dubheMetadata from GraphQL client (recommended)
const graphqlClient = createDubheGraphqlClient({
  endpoint: 'http://localhost:3001/graphql',
  dubheMetadata: jsonMetadata, // Provide in GraphQL client
});
const world = createECSWorld(graphqlClient); // Auto retrieve

// Method 2: Explicitly provide in ECS config
const world = createECSWorld(graphqlClient, {
  dubheMetadata: jsonMetadata, // Explicitly provide
});

// Method 3: Minimal configuration (only requires GraphQL client)
const world = createECSWorld(graphqlClient); // Use all defaults
```

### 2. Smart Metadata Retrieval

The system retrieves DubheMetadata in the following priority order:
1. **ECS Config** - explicitly provided `dubheMetadata`
2. **GraphQL Client** - `dubheMetadata` in client
3. If neither exists, throws a clear error message

### 3. Automatic Type Separation

The system automatically categorizes tables into two types based on primary key configuration:

- **ECS Components** - Single primary key tables, used for traditional ECS operations
- **Resources** - Composite primary key or no primary key tables, used for resource management

### 4. New Type Definitions

```typescript
// DubheMetadata JSON format
export type DubheMetadata = {
  components: Array<
    Record<
      string,
      {
        fields: Array<Record<string, any>>;
        keys: string[];
      }
    >
  >;
  resources: Array<
    Record<
      string,
      {
        fields: Array<Record<string, any>>;
        keys: string[];
      }
    >
  >;
  enums: any[];
};

// ECS World configuration (all fields are optional)
export interface ECSWorldConfig {
  dubheMetadata?: DubheMetadata; // Optional, retrieved from GraphQL client
  queryConfig?: {
    defaultCacheTimeout?: number;
    maxConcurrentQueries?: number;
    enableBatchOptimization?: boolean;
  };
  subscriptionConfig?: {
    defaultDebounceMs?: number;
    maxSubscriptions?: number;
    reconnectOnError?: boolean;
  };
}
```

### 5. Separation Rules

#### ECS Components (Single primary key tables)
- **Condition**: `primaryKeys.length === 1`
- **Purpose**: Traditional ECS entity-component operations
- **Methods**: `queryWith()`, `onComponentChanged()`, `getComponent()`, etc.

#### Resources (Composite primary key or no primary key tables)
- **Condition**: `primaryKeys.length !== 1`
- **Purpose**: Resource management and global state
- **Methods**: `getResource()`, `getResources()`, `subscribeToResourceChanges()`, etc.

## Usage Examples

### Configure DubheMetadata

```typescript
const dubheMetadata: DubheMetadata = {
  components: [
    {
      // ECS component: single primary key
      Player: {
        fields: [{ name: 'string' }, { level: 'u32' }],
        keys: [], // Empty array = use default entityId
      },
    },
    {
      // ECS component: custom single primary key
      UserProfile: {
        fields: [{ userId: 'string' }, { email: 'string' }],
        keys: ['userId'], // Single primary key
      },
    },
  ],
  
  resources: [
    {
      // Resource: composite primary key
      Position: {
        fields: [{ x: 'u32' }, { y: 'u32' }],
        keys: ['x', 'y'], // Composite primary key
      },
    },
    {
      // Resource: no primary key
      GameLog: {
        fields: [{ action: 'string' }, { data: 'string' }],
        keys: [], // No primary key
      },
    },
  ],

  enums: [],
};
```

### Create ECS World

#### Method 1: Retrieve from GraphQL Client (Recommended)

```typescript
import { createDubheGraphqlClient, createECSWorld } from '@0xobelisk/ecs';

// Create GraphQL client with dubheMetadata
const graphqlClient = createDubheGraphqlClient({
  endpoint: 'http://localhost:3001/graphql',
  subscriptionEndpoint: 'ws://localhost:3001/graphql',
  dubheMetadata, // Provide in GraphQL client
});

// Create ECS world - automatically retrieve dubheMetadata from GraphQL client
const world = createECSWorld(graphqlClient, {
  queryConfig: {
    defaultCacheTimeout: 5 * 60 * 1000,
    maxConcurrentQueries: 10,
    enableBatchOptimization: true,
  },
});
```

#### Method 2: Explicitly Provide DubheMetadata

```typescript
// Create GraphQL client (without dubheMetadata)
const graphqlClient = createDubheGraphqlClient({
  endpoint: 'http://localhost:3001/graphql',
  subscriptionEndpoint: 'ws://localhost:3001/graphql',
});

// Create ECS world - explicitly provide dubheMetadata
const world = createECSWorld(graphqlClient, {
  dubheMetadata, // Explicitly provide in ECS config
  subscriptionConfig: {
    defaultDebounceMs: 100,
    maxSubscriptions: 50,
    reconnectOnError: true,
  },
});
```

#### Method 3: Minimal Configuration

```typescript
// Create GraphQL client with dubheMetadata
const graphqlClient = createDubheGraphqlClient({
  endpoint: 'http://localhost:3001/graphql',
  dubheMetadata,
});

// Minimal configuration - use all defaults
const world = createECSWorld(graphqlClient);
```

### Query Examples

#### ECS Components Query

```typescript
// Query all entities with specific component
const playerEntities = await world.queryWith('Player');

// Get component data for specific entity
const playerData = await world.getComponent<PlayerComponent>('entity123', 'Player');

// Subscribe to component changes
const subscription = world.onComponentChanged<PlayerComponent>('Player', {
  onData: (data) => console.log('Player changed:', data),
});
```

#### Resources Query

```typescript
// Query single resource (by primary key)
const position = await world.getResource<PositionResource>('Position', {
  x: 10,
  y: 20,
});

// Query multiple resources
const gameLogs = await world.getResources<GameLogResource>('GameLog', {
  action: 'player_move',
});

// Subscribe to resource changes
const resourceSub = world.subscribeToResourceChanges<PositionResource>('Position', {
  filter: { x: { greaterThan: 0 } },
  onData: (data) => console.log('Position changed:', data),
});
```

## API Reference

### Factory Function

```typescript
createECSWorld(
  graphqlClient: DubheGraphqlClient,
  config?: Partial<ECSWorldConfig> // Now optional
): DubheECSWorld
```

### World Methods

#### ECS Components
- `getAvailableComponents()` - Get all ECS component types
- `getComponentMetadata(type)` - Get component metadata
- `queryWith(component, options?)` - Query entities with component
- `getComponent<T>(entityId, component)` - Get entity component data
- `onComponentChanged<T>(component, options?)` - Subscribe to component changes

#### Resources
- `getAvailableResources()` - Get all resource types
- `getResourceMetadata(type)` - Get resource metadata
- `getResource<T>(type, keyValues, options?)` - Query single resource
- `getResources<T>(type, filters?, options?)` - Query multiple resources
- `subscribeToResourceChanges<T>(type, options?)` - Subscribe to resource changes

#### Configuration
- `getDubheMetadata()` - Get JSON format metadata
- `configure(config)` - Dynamically update configuration

## Upgrade Guide

### Upgrading from Previous Version

1. **The config parameter is now optional**:
   ```typescript
   // ✅ New version - more concise
   const world = createECSWorld(graphqlClient); // config optional
   
   // ✅ Also supports full configuration
   const world = createECSWorld(graphqlClient, {
     dubheMetadata, // Optional
     queryConfig: { /* ... */ },
   });
   ```

2. **Recommended to provide dubheMetadata via GraphQL client**:
   ```typescript
   // ✅ Recommended approach
   const graphqlClient = createDubheGraphqlClient({
     endpoint: 'http://localhost:3001/graphql',
     dubheMetadata, // Provide here
   });
   const world = createECSWorld(graphqlClient);
   ```

3. **Clearer error handling**:
   ```typescript
   // If dubheMetadata is not provided, you'll get a clear error message
   try {
     const world = createECSWorld(graphqlClientWithoutMetadata);
   } catch (error) {
     console.log(error.message);
     // "DubheMetadata is required for ECS World initialization. 
     //  Please provide it either in ECSWorldConfig or in GraphQL client configuration."
   }
   ```

## Benefits

1. **Flexibility**: Supports multiple configuration approaches, adapting to different use cases
2. **Simplification**: Minimal case requires only GraphQL client
3. **Consistency**: Shares dubheMetadata with GraphQL client, avoiding duplicate configuration
4. **Smart Retrieval**: Automatically selects the best metadata source
5. **Backward Compatibility**: Existing code works without modification
6. **Type Safety**: Provides complete TypeScript type support

## Troubleshooting

### Common Issues

1. **Metadata not found error**:
   ```
   DubheMetadata is required for ECS World initialization.
   ```
   **Solution**: Ensure dubheMetadata is provided in either GraphQL client or ECS config

2. **Component not found**:
   Check if component is a single primary key table, composite primary key tables are classified as resources

3. **Priority issues**:
   dubheMetadata in ECS config has higher priority than in GraphQL client

### Debug Information

The system automatically displays metadata source:
```typescript
// Console output example:
// 📥 Using DubheMetadata from GraphQL client
// 📥 Using DubheMetadata from ECS config
```

View discovery results:
```typescript
console.log('ECS Components:', world.getAvailableComponents());
console.log('Resources:', world.getAvailableResources());
```

## Example Project

Refer to `packages/ecs/scripts/examples-dubhe-config.ts` for complete examples, including demonstrations of all three configuration approaches. 