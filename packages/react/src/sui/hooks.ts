/**
 * Modern Dubhe React Hooks - Auto-initialization Pattern
 *
 * Features:
 * - 🎯 Simple API design with automatic initialization
 * - ⚡ Smart caching and optimization with React useMemo
 * - 🔧 Configuration-driven setup with environment variable support
 * - 🛡️ Complete type safety with strict TypeScript
 * - 📦 Direct instance access without connection state management
 */

import { useMemo } from 'react';
import { Dubhe, SuiMoveNormalizedModules } from '@0xobelisk/sui-client';
import { createDubheGraphqlClient } from '@0xobelisk/graphql-client';
import { createECSWorld } from '@0xobelisk/ecs';
import { useDubheConfig } from './config';
import type { DubheConfig, ContractReturn, NetworkType } from './types';

/**
 * Primary Hook: useContract
 * 
 * Automatically initializes Dubhe contract, GraphQL client, and ECS World
 * using React's useMemo for optimal caching and performance.
 * 
 * Follows the exact pattern from the reference template for consistency.
 * 
 * @param config - Optional configuration overrides
 * @returns Complete Dubhe ecosystem with contract, GraphQL, ECS, and metadata
 * 
 * @example
 * ```typescript
 * // Simple usage with environment variables
 * function App() {
 *   const { contract, address } = useContract();
 *   return <div>Connected as {address}</div>;
 * }
 * 
 * // Usage with explicit configuration
 * function App() {
 *   const { contract, graphqlClient, ecsWorld } = useContract({
 *     network: 'devnet',
 *     packageId: '0x123...',
 *     metadata: contractMetadata,
 *     dubheMetadata: dubheConfig
 *   });
 *   return <MyDApp contract={contract} />;
 * }
 * 
 * // Usage with environment variable overrides
 * function App() {
 *   const { contract } = useContract({
 *     network: 'testnet' // Override environment variable
 *   });
 *   return <MyTestnetApp contract={contract} />;
 * }
 * ```
 */
export function useContract(config?: Partial<DubheConfig>): ContractReturn {
  // Merge configuration with defaults and environment variables
  const finalConfig = useDubheConfig(config);
  
  // Cache Dubhe contract instance
  const contract = useMemo(() => {
    console.log('🔧 Creating Dubhe contract instance...');
    try {
      return new Dubhe({
        networkType: finalConfig.network,
        packageId: finalConfig.packageId,
        metadata: finalConfig.metadata,
        secretKey: finalConfig.credentials?.secretKey
      });
    } catch (error) {
      console.error('Contract initialization failed:', error);
      throw error;
    }
  }, [finalConfig.network, finalConfig.packageId, finalConfig.metadata, finalConfig.credentials?.secretKey]);

  // Cache GraphQL client instance
  const graphqlClient = useMemo(() => {
    if (!finalConfig.dubheMetadata) return null;
    
    console.log('🔧 Creating GraphQL client...');
    try {
      return createDubheGraphqlClient({
        endpoint: finalConfig.endpoints?.graphql || 'http://localhost:4000/graphql',
        subscriptionEndpoint: finalConfig.endpoints?.websocket || 'ws://localhost:4000/graphql',
        dubheMetadata: finalConfig.dubheMetadata
      });
    } catch (error) {
      console.error('GraphQL client initialization failed:', error);
      throw error;
    }
  }, [finalConfig.dubheMetadata, finalConfig.endpoints?.graphql, finalConfig.endpoints?.websocket]);

  // Cache ECS World instance
  const ecsWorld = useMemo(() => {
    if (!graphqlClient) return null;
    
    console.log('🔧 Creating ECS World...');
    try {
      return createECSWorld(graphqlClient, {
        queryConfig: {
          enableBatchOptimization: finalConfig.options?.enableBatchOptimization ?? true,
          defaultCacheTimeout: finalConfig.options?.cacheTimeout ?? 5000
        },
        subscriptionConfig: {
          defaultDebounceMs: finalConfig.options?.debounceMs ?? 100,
          reconnectOnError: finalConfig.options?.reconnectOnError ?? true
        }
      });
    } catch (error) {
      console.error('ECS World initialization failed:', error);
      throw error;
    }
  }, [graphqlClient, finalConfig.options]);

  // Cache address
  const address = useMemo(() => {
    return contract.getAddress();
  }, [contract]);

  return useMemo(() => ({
    contract,
    graphqlClient,
    ecsWorld,
    metadata: finalConfig.metadata,
    network: finalConfig.network,
    packageId: finalConfig.packageId,
    dubheSchemaId: finalConfig.dubheSchemaId,
    address
  }), [contract, graphqlClient, ecsWorld, address]);
}

/**
 * Individual Instance Hook: useDubheContract
 * 
 * Returns only the Dubhe contract instance for components that only need contract access
 * 
 * @param config - Optional configuration overrides
 * @returns Dubhe contract instance
 * 
 * @example
 * ```typescript
 * function TransactionComponent() {
 *   const contract = useDubheContract();
 *   
 *   const handleTransaction = async () => {
 *     const tx = new Transaction();
 *     await contract.tx.my_system.my_method({ tx });
 *   };
 *   
 *   return <button onClick={handleTransaction}>Execute</button>;
 * }
 * ```
 */
export function useDubheContract(config?: Partial<DubheConfig>): Dubhe {
  const { contract } = useContract(config);
  return contract;
}

/**
 * Individual Instance Hook: useDubheGraphQL
 * 
 * Returns only the GraphQL client for components that only need GraphQL access
 * 
 * @param config - Optional configuration overrides
 * @returns GraphQL client instance (null if dubheMetadata not provided)
 * 
 * @example
 * ```typescript
 * function DataComponent() {
 *   const graphqlClient = useDubheGraphQL();
 *   
 *   useEffect(() => {
 *     if (graphqlClient) {
 *       graphqlClient.query({ ... }).then(setData);
 *     }
 *   }, [graphqlClient]);
 *   
 *   return <div>{data && JSON.stringify(data)}</div>;
 * }
 * ```
 */
export function useDubheGraphQL(config?: Partial<DubheConfig>): any | null {
  const { graphqlClient } = useContract(config);
  return graphqlClient;
}

/**
 * Individual Instance Hook: useDubheECS
 * 
 * Returns only the ECS World instance for components that only need ECS access
 * 
 * @param config - Optional configuration overrides
 * @returns ECS World instance (null if GraphQL client not available)
 * 
 * @example
 * ```typescript
 * function ECSComponent() {
 *   const ecsWorld = useDubheECS();
 *   
 *   useEffect(() => {
 *     if (ecsWorld) {
 *       ecsWorld.getComponent('MyComponent').then(setComponent);
 *     }
 *   }, [ecsWorld]);
 *   
 *   return <div>ECS Component Data</div>;
 * }
 * ```
 */
export function useDubheECS(config?: Partial<DubheConfig>): any | null {
  const { ecsWorld } = useContract(config);
  return ecsWorld;
}

// ==== DEPRECATED HOOKS ====
// The following hooks are deprecated and will be removed in the next major version
// They are kept for backward compatibility during the migration period

/**
 * @deprecated Use useContract() instead for automatic initialization
 * This hook will be removed in the next major version
 */
export function useDubhe() {
  console.warn(
    '[DEPRECATED] useDubhe() is deprecated. Use useContract() instead.\n' +
    'Migration: const { contract, address, network } = useContract();'
  );
  
  // Return empty state to maintain compatibility
  return {
    isConnected: false,
    isConnecting: false,
    hasError: false,
    status: 'disconnected' as const,
    error: null,
    address: null,
    network: null,
    balance: null,
    contract: null,
    graphql: null,
    ecs: null,
    config: null,
    metrics: null
  };
}

/**
 * @deprecated Connection management is no longer needed with auto-initialization
 * This hook will be removed in the next major version
 */
export function useDubheConnection() {
  console.warn(
    '[DEPRECATED] useDubheConnection() is deprecated. Connection is handled automatically with useContract().'
  );
  
  return {
    isConnected: false,
    isConnecting: false,
    hasError: false,
    connect: async () => {
      console.warn('[DEPRECATED] connect() is deprecated. Use useContract() instead.');
    },
    disconnect: () => {
      console.warn('[DEPRECATED] disconnect() is deprecated. Connection is managed automatically.');
    },
    reconnect: async () => {
      console.warn('[DEPRECATED] reconnect() is deprecated. Use useContract() instead.');
    }
  };
}

/**
 * @deprecated Auto-connection is now the default behavior with useContract()
 * This hook will be removed in the next major version
 */
export function useDubheAutoConnect(config: DubheConfig) {
  console.warn(
    '[DEPRECATED] useDubheAutoConnect() is deprecated. Auto-initialization is the default with useContract().\n' +
    'Migration: const { contract } = useContract(config);'
  );
  
  return {
    isReady: false,
    isLoading: false,
    error: 'Please migrate to useContract() hook'
  };
}

/**
 * @deprecated Use useContract() which provides query capabilities built-in
 * This hook will be removed in the next major version
 */
export function useDubheQuery<T = any>(
  key: string[],
  queryFn: () => Promise<T>,
  options: any = {}
) {
  console.warn(
    '[DEPRECATED] useDubheQuery() is deprecated. Use direct contract.query methods with useContract().'
  );
  
  return {
    data: null as T | null,
    loading: false,
    error: null as string | null,
    refetch: queryFn
  };
}

/**
 * @deprecated Use direct GraphQL subscriptions with useDubheGraphQL()
 * This hook will be removed in the next major version
 */
export function useDubheSubscription<T = any>(
  subscription: string,
  options: any = {}
) {
  console.warn(
    '[DEPRECATED] useDubheSubscription() is deprecated. Use direct GraphQL subscriptions with useDubheGraphQL().'
  );
  
  return {
    data: null as T | null,
    isSubscribed: false,
    error: null as string | null
  };
}

/**
 * @deprecated Use feature detection with useContract() return values
 * This hook will be removed in the next major version
 */
export function useDubheCapabilities() {
  console.warn(
    '[DEPRECATED] useDubheCapabilities() is deprecated. Check feature availability with useContract() return values.'
  );
  
  return {
    contract: false,
    graphql: false,
    ecs: false
  };
}

/**
 * @deprecated Performance metrics are available through browser dev tools
 * This hook will be removed in the next major version
 */
export function useDubheMetrics() {
  console.warn(
    '[DEPRECATED] useDubheMetrics() is deprecated. Use browser dev tools for performance monitoring.'
  );
  
  return null;
}