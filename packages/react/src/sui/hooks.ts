/**
 * Modern Dubhe React Hooks - Auto-initialization Pattern
 *
 * Features:
 * - 🎯 Simple API design with automatic initialization
 * - ⚡ Smart caching and optimization with React useMemo
 * - 🔧 Configuration-driven setup (developers handle environment variables themselves)
 * - 🛡️ Complete type safety with strict TypeScript
 * - 📦 Direct instance access without connection state management
 */

import { useMemo } from 'react';
import { Dubhe, SuiMoveNormalizedModules } from '@0xobelisk/sui-client';
import { createDubheGraphqlClient } from '@0xobelisk/graphql-client';
import { createECSWorld } from '@0xobelisk/ecs';
import { useDubheConfig } from './config';
import type { DubheConfig, DubheReturn, NetworkType } from './types';

/**
 * Primary Hook: useDubhe
 *
 * Automatically initializes Dubhe contract, GraphQL client, and ECS World
 * using React's useMemo for optimal caching and performance.
 *
 * Developers must provide complete configuration including environment variables handling.
 *
 * @param config - Configuration object (required, developers handle environment variables themselves)
 * @returns Complete Dubhe ecosystem with contract, GraphQL, ECS, and metadata
 *
 * @example
 * ```typescript
 * // Basic usage with explicit configuration
 * function App() {
 *   const { contract, address } = useDubhe({
 *     network: 'devnet',
 *     packageId: '0x123...',
 *     metadata: contractMetadata,
 *     credentials: {
 *       secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY // Handle env vars yourself
 *     }
 *   });
 *   return <div>Connected as {address}</div>;
 * }
 *
 * // Usage with helper function for environment variables
 * function App() {
 *   const getConfig = () => ({
 *     network: (process.env.NEXT_PUBLIC_NETWORK || 'devnet') as NetworkType,
 *     packageId: process.env.NEXT_PUBLIC_PACKAGE_ID || '0x123...',
 *     metadata: contractMetadata,
 *     dubheMetadata: dubheConfig,
 *     credentials: {
 *       secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
 *     },
 *     endpoints: {
 *       graphql: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
 *       websocket: process.env.NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT || 'ws://localhost:4000/graphql'
 *     }
 *   });
 *
 *   const { contract, graphqlClient, ecsWorld } = useDubhe(getConfig());
 *   return <MyDApp contract={contract} />;
 * }
 * ```
 */
export function useDubhe(config: Partial<DubheConfig>): DubheReturn {
  // Track initialization start time
  const startTime = useMemo(() => performance.now(), []);

  // Merge configuration with defaults
  const finalConfig = useDubheConfig(config);

  // Cache Dubhe contract instance
  const contract = useMemo(() => {
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
  }, [
    finalConfig.network,
    finalConfig.packageId,
    finalConfig.metadata,
    finalConfig.credentials?.secretKey
  ]);

  // Cache GraphQL client instance
  const graphqlClient = useMemo(() => {
    if (!finalConfig.dubheMetadata) return null;

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

  // Enhanced contract with additional methods (memoized for performance)
  const enhancedContract = useMemo(() => {
    const enhanced = contract as any;

    // Add cached transaction methods with error handling
    enhanced.txWithOptions = (system: string, method: string, options: any = {}) => {
      return async (params: any) => {
        try {
          const startTime = performance.now();
          const result = await contract.tx[system][method](params);
          const executionTime = performance.now() - startTime;
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`Transaction ${system}.${method} completed in ${executionTime.toFixed(2)}ms`);
          }
          
          options.onSuccess?.(result);
          return result;
        } catch (error) {
          options.onError?.(error);
          throw error;
        }
      };
    };

    // Add cached query methods with performance tracking
    enhanced.queryWithOptions = (system: string, method: string, options: any = {}) => {
      return async (params: any) => {
        const startTime = performance.now();
        const result = await contract.query[system][method](params);
        const executionTime = performance.now() - startTime;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Query ${system}.${method} completed in ${executionTime.toFixed(2)}ms`);
        }
        
        return result;
      };
    };

    return enhanced;
  }, [contract]);

  return useMemo(
    () => ({
      contract: enhancedContract,
      graphqlClient,
      ecsWorld,
      metadata: finalConfig.metadata,
      network: finalConfig.network,
      packageId: finalConfig.packageId,
      dubheSchemaId: finalConfig.dubheSchemaId,
      address,
      options: finalConfig.options,
      metrics: {
        initTime: performance.now() - startTime,
        requestCount: 0,
        lastActivity: Date.now()
      }
    }),
    [
      enhancedContract,
      graphqlClient,
      ecsWorld,
      address,
      finalConfig.metadata,
      finalConfig.network,
      finalConfig.packageId,
      finalConfig.dubheSchemaId,
      finalConfig.options,
      startTime
    ]
  );
}

/**
 * Individual Instance Hook: useDubheContract
 *
 * Returns only the Dubhe contract instance for components that only need contract access
 *
 * @param config - Configuration object (required)
 * @returns Dubhe contract instance
 *
 * @example
 * ```typescript
 * function TransactionComponent() {
 *   const contract = useDubheContract({
 *     network: 'devnet',
 *     packageId: '0x123...',
 *     metadata: contractMetadata,
 *     credentials: {
 *       secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
 *     }
 *   });
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
export function useDubheContract(config: Partial<DubheConfig>): Dubhe {
  const { contract } = useDubhe(config);
  return contract;
}

/**
 * Individual Instance Hook: useDubheGraphQL
 *
 * Returns only the GraphQL client for components that only need GraphQL access
 *
 * @param config - Configuration object (required)
 * @returns GraphQL client instance (null if dubheMetadata not provided)
 *
 * @example
 * ```typescript
 * function DataComponent() {
 *   const graphqlClient = useDubheGraphQL({
 *     network: 'devnet',
 *     packageId: '0x123...',
 *     metadata: contractMetadata,
 *     dubheMetadata: dubheConfig,
 *     endpoints: {
 *       graphql: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql'
 *     }
 *   });
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
export function useDubheGraphQL(config: Partial<DubheConfig>): any | null {
  const { graphqlClient } = useDubhe(config);
  return graphqlClient;
}

/**
 * Individual Instance Hook: useDubheECS
 *
 * Returns only the ECS World instance for components that only need ECS access
 *
 * @param config - Configuration object (required)
 * @returns ECS World instance (null if GraphQL client not available)
 *
 * @example
 * ```typescript
 * function ECSComponent() {
 *   const ecsWorld = useDubheECS({
 *     network: 'devnet',
 *     packageId: '0x123...',
 *     metadata: contractMetadata,
 *     dubheMetadata: dubheConfig,
 *     endpoints: {
 *       graphql: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
 *       websocket: process.env.NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT || 'ws://localhost:4000/graphql'
 *     }
 *   });
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
export function useDubheECS(config: Partial<DubheConfig>): any | null {
  const { ecsWorld } = useDubhe(config);
  return ecsWorld;
}

/**
 * Compatibility alias for useDubhe
 * @deprecated Use useDubhe instead for better consistency
 */
export const useContract = useDubhe;

