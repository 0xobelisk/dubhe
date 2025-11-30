import { Dubhe } from '@0xobelisk/sui-client';
import { createDubheGraphqlClient } from '@0xobelisk/graphql-client';
import { createECSWorld } from '@0xobelisk/ecs';
import { DubheGrpcClient } from '@0xobelisk/grpc-client';
import type { ClientConfig, DubheClientBundle } from './types';

/**
 * Create a Dubhe client bundle with all necessary instances
 *
 * This factory function creates and initializes:
 * - Dubhe contract client for on-chain interactions
 * - GraphQL client for querying indexed data
 * - gRPC client for high-performance queries
 * - ECS World for entity-component-system queries
 *
 * @param config - Client configuration matching @0xobelisk/react interface
 * @returns DubheClientBundle with all initialized client instances
 *
 * @example
 * ```typescript
 * import { createClient } from '@0xobelisk/client/sui';
 * import metadata from './metadata.json';
 *
 * const client = createClient({
 *   network: 'devnet',
 *   packageId: '0x123...',
 *   metadata,
 *   credentials: {
 *     secretKey: process.env.PRIVATE_KEY
 *   }
 * });
 *
 * // Use the contract client
 * const tx = new Transaction();
 * await client.contract.tx.counter_system.inc({ tx });
 *
 * // Use GraphQL client
 * const data = await client.graphqlClient.query(...);
 *
 * // Use ECS World
 * const entities = client.ecsWorld.getEntities();
 * ```
 */
export function createClient(config: ClientConfig): DubheClientBundle {
  // Validate required fields
  if (!config.network) {
    throw new Error('ClientConfig: network is required');
  }
  if (!config.packageId) {
    throw new Error('ClientConfig: packageId is required');
  }
  if (!config.metadata) {
    throw new Error('ClientConfig: metadata is required');
  }

  // Initialize Dubhe contract client
  const contract = new Dubhe({
    networkType: config.network,
    packageId: config.packageId,
    metadata: config.metadata,
    secretKey: config.credentials?.secretKey,
    mnemonics: config.credentials?.mnemonics,
    fullnodeUrls: config.endpoints?.fullnodeUrls
  });

  // Initialize GraphQL client with default localhost endpoint if not provided
  const graphqlClient = createDubheGraphqlClient({
    endpoint: config.endpoints?.graphql || 'http://localhost:4000/graphql',
    subscriptionEndpoint: config.endpoints?.websocket || 'ws://localhost:4000/graphql',
    dubheMetadata: config.dubheMetadata
  });

  // Initialize gRPC client with default localhost endpoint if not provided
  const grpcClient = new DubheGrpcClient({
    baseUrl: config.endpoints?.grpc || 'http://localhost:8080'
  });

  // Initialize ECS World (depends on GraphQL client)
  const ecsWorld = createECSWorld(graphqlClient, {
    dubheMetadata: config.dubheMetadata,
    queryConfig: {
      enableBatchOptimization: config.options?.enableBatchOptimization ?? true,
      defaultCacheTimeout: config.options?.cacheTimeout ?? 5000
    },
    subscriptionConfig: {
      defaultDebounceMs: config.options?.debounceMs ?? 100,
      reconnectOnError: config.options?.reconnectOnError ?? true
    }
  });

  // Get user address from contract
  const address = contract.getAddress();

  // Return complete client bundle
  return {
    contract,
    graphqlClient,
    grpcClient,
    ecsWorld,
    metadata: config.metadata,
    network: config.network,
    packageId: config.packageId,
    dubheSchemaId: config.dubheSchemaId,
    address,
    options: config.options
  };
}

/**
 * Type guard to check if a value is a valid NetworkType
 */
export function isNetworkType(value: string): value is ClientConfig['network'] {
  return ['mainnet', 'testnet', 'devnet', 'localnet'].includes(value);
}

/**
 * Helper function to validate client configuration
 * Throws descriptive errors for invalid configurations
 */
export function validateClientConfig(
  config: Partial<ClientConfig>
): asserts config is ClientConfig {
  if (!config.network) {
    throw new Error('ClientConfig validation failed: network is required');
  }
  if (!isNetworkType(config.network)) {
    throw new Error(
      `ClientConfig validation failed: invalid network type "${config.network}". ` +
        'Must be one of: mainnet, testnet, devnet, localnet'
    );
  }
  if (!config.packageId) {
    throw new Error('ClientConfig validation failed: packageId is required');
  }
  if (typeof config.packageId !== 'string' || config.packageId.trim() === '') {
    throw new Error('ClientConfig validation failed: packageId must be a non-empty string');
  }
  if (!config.metadata) {
    throw new Error('ClientConfig validation failed: metadata is required');
  }
}

/**
 * Create client with configuration validation
 * Useful when working with external configuration sources
 *
 * @example
 * ```typescript
 * const config = loadConfigFromFile(); // May be incomplete
 * const client = createClientWithValidation(config); // Throws if invalid
 * ```
 */
export function createClientWithValidation(config: Partial<ClientConfig>): DubheClientBundle {
  validateClientConfig(config);
  return createClient(config);
}
