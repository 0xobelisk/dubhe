/**
 * Dubhe Provider - useRef Pattern for Client Management
 *
 * Features:
 * - 🎯 Single client instances across application lifecycle
 * - ⚡ useRef-based storage (no re-initialization on re-renders)
 * - 🔧 Provider pattern for dependency injection
 * - 🛡️ Complete type safety with strict TypeScript
 * - 📦 Context-based client sharing
 */

import React, { createContext, useContext, useRef, ReactNode } from 'react';
import { Dubhe } from '@0xobelisk/sui-client';
import { createDubheGraphqlClient } from '@0xobelisk/graphql-client';
import { createECSWorld } from '@0xobelisk/ecs';
import { useDubheConfig } from './config';
import type { DubheConfig, DubheReturn } from './types';

/**
 * Context interface for Dubhe client instances
 * All clients are stored using useRef to ensure single initialization
 */
interface DubheContextValue {
  getContract: () => Dubhe;
  getGraphqlClient: () => any | null;
  getEcsWorld: () => any | null;
  getAddress: () => string;
  getMetrics: () => {
    initTime: number;
    requestCount: number;
    lastActivity: number;
  };
  config: DubheConfig;
}

/**
 * Context for sharing Dubhe clients across the application
 * Uses useRef pattern to ensure clients are created only once
 */
const DubheContext = createContext<DubheContextValue | null>(null);

/**
 * Props interface for DubheProvider component
 */
interface DubheProviderProps {
  /** Configuration for Dubhe initialization */
  config: Partial<DubheConfig>;
  /** Child components that will have access to Dubhe clients */
  children: ReactNode;
}

/**
 * DubheProvider Component - useRef Pattern Implementation
 *
 * This Provider uses useRef to store client instances, ensuring they are:
 * 1. Created only once during component lifecycle
 * 2. Persisted across re-renders without re-initialization
 * 3. Shared efficiently via React Context
 *
 * Key advantages over useMemo:
 * - useRef guarantees single initialization (useMemo can re-run on dependency changes)
 * - No dependency array needed (eliminates potential re-initialization bugs)
 * - Better performance for heavy client objects
 * - Clearer separation of concerns via Provider pattern
 *
 * @param props - Provider props containing config and children
 * @returns Provider component wrapping children with Dubhe context
 *
 * @example
 * ```typescript
 * // App root setup
 * function App() {
 *   const dubheConfig = {
 *     network: 'devnet',
 *     packageId: '0x123...',
 *     metadata: contractMetadata,
 *     credentials: {
 *       secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
 *     }
 *   };
 *
 *   return (
 *     <DubheProvider config={dubheConfig}>
 *       <MyApplication />
 *     </DubheProvider>
 *   );
 * }
 * ```
 */
export function DubheProvider({ config, children }: DubheProviderProps) {
  // Merge configuration with defaults (only runs once)
  const finalConfig = useDubheConfig(config);
  
  // Track initialization start time (useRef ensures single timestamp)
  const startTimeRef = useRef<number>();
  if (!startTimeRef.current) {
    startTimeRef.current = performance.now();
  }

  // useRef for contract instance - guarantees single initialization
  // Unlike useMemo, useRef.current is never re-calculated
  const contractRef = useRef<Dubhe>();
  const getContract = (): Dubhe => {
    if (!contractRef.current) {
      try {
        console.log('Initializing Dubhe contract instance (one-time)');
        contractRef.current = new Dubhe({
          networkType: finalConfig.network,
          packageId: finalConfig.packageId,
          metadata: finalConfig.metadata,
          secretKey: finalConfig.credentials?.secretKey
        });
      } catch (error) {
        console.error('Contract initialization failed:', error);
        throw error;
      }
    }
    return contractRef.current;
  };

  // useRef for GraphQL client instance - single initialization guaranteed
  const graphqlClientRef = useRef<any | null>(null);
  const hasInitializedGraphql = useRef(false);
  const getGraphqlClient = (): any | null => {
    if (!hasInitializedGraphql.current && finalConfig.dubheMetadata) {
      try {
        console.log('Initializing GraphQL client instance (one-time)');
        graphqlClientRef.current = createDubheGraphqlClient({
          endpoint: finalConfig.endpoints?.graphql || 'http://localhost:4000/graphql',
          subscriptionEndpoint: finalConfig.endpoints?.websocket || 'ws://localhost:4000/graphql',
          dubheMetadata: finalConfig.dubheMetadata
        });
        hasInitializedGraphql.current = true;
      } catch (error) {
        console.error('GraphQL client initialization failed:', error);
        throw error;
      }
    }
    return graphqlClientRef.current;
  };

  // useRef for ECS World instance - depends on GraphQL client
  const ecsWorldRef = useRef<any | null>(null);
  const hasInitializedEcs = useRef(false);
  const getEcsWorld = (): any | null => {
    const graphqlClient = getGraphqlClient();
    if (!hasInitializedEcs.current && graphqlClient) {
      try {
        console.log('Initializing ECS World instance (one-time)');
        ecsWorldRef.current = createECSWorld(graphqlClient, {
          queryConfig: {
            enableBatchOptimization: finalConfig.options?.enableBatchOptimization ?? true,
            defaultCacheTimeout: finalConfig.options?.cacheTimeout ?? 5000
          },
          subscriptionConfig: {
            defaultDebounceMs: finalConfig.options?.debounceMs ?? 100,
            reconnectOnError: finalConfig.options?.reconnectOnError ?? true
          }
        });
        hasInitializedEcs.current = true;
      } catch (error) {
        console.error('ECS World initialization failed:', error);
        throw error;
      }
    }
    return ecsWorldRef.current;
  };

  // Address getter - calculated from contract
  const getAddress = (): string => {
    return getContract().getAddress();
  };

  // Metrics getter - performance tracking
  const getMetrics = () => ({
    initTime: performance.now() - (startTimeRef.current || 0),
    requestCount: 0, // Can be enhanced with actual tracking
    lastActivity: Date.now()
  });

  // Context value - stable reference (no re-renders for consumers)
  const contextValue: DubheContextValue = {
    getContract,
    getGraphqlClient,
    getEcsWorld,
    getAddress,
    getMetrics,
    config: finalConfig
  };

  return (
    <DubheContext.Provider value={contextValue}>
      {children}
    </DubheContext.Provider>
  );
}

/**
 * Custom hook to access Dubhe context
 * Provides type-safe access to all Dubhe client instances
 *
 * @returns DubheContextValue with all client getters and config
 * @throws Error if used outside of DubheProvider
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const dubheContext = useDubheContext();
 *   
 *   const contract = dubheContext.getContract();
 *   const graphqlClient = dubheContext.getGraphqlClient();
 *   const ecsWorld = dubheContext.getEcsWorld();
 *   const address = dubheContext.getAddress();
 *   
 *   return <div>Connected as {address}</div>;
 * }
 * ```
 */
export function useDubheContext(): DubheContextValue {
  const context = useContext(DubheContext);
  
  if (!context) {
    throw new Error(
      'useDubheContext must be used within a DubheProvider. ' +
      'Make sure to wrap your app with <DubheProvider config={...}>'
    );
  }
  
  return context;
}

/**
 * Enhanced hook that mimics the original useDubhe API
 * Uses the Provider pattern internally but maintains backward compatibility
 *
 * @returns DubheReturn object with all instances and metadata
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { contract, graphqlClient, ecsWorld, address } = useDubheFromProvider();
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
export function useDubheFromProvider(): DubheReturn {
  const context = useDubheContext();
  
  // Get instances (lazy initialization via getters)
  const contract = context.getContract();
  const graphqlClient = context.getGraphqlClient();
  const ecsWorld = context.getEcsWorld();
  const address = context.getAddress();
  const metrics = context.getMetrics();
  
  // Enhanced contract with additional methods (similar to original implementation)
  const enhancedContract = contract as any;
  
  // Add transaction methods with error handling (if not already added)
  if (!enhancedContract.txWithOptions) {
    enhancedContract.txWithOptions = (system: string, method: string, options: any = {}) => {
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
  }
  
  // Add query methods with performance tracking (if not already added)
  if (!enhancedContract.queryWithOptions) {
    enhancedContract.queryWithOptions = (system: string, method: string, options: any = {}) => {
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
  }

  return {
    contract: enhancedContract,
    graphqlClient,
    ecsWorld,
    metadata: context.config.metadata,
    network: context.config.network,
    packageId: context.config.packageId,
    dubheSchemaId: context.config.dubheSchemaId,
    address,
    options: context.config.options,
    metrics
  };
}

/**
 * Individual client hooks for components that only need specific instances
 * These are more efficient than useDubheFromProvider for single-client usage
 */

/**
 * Hook for accessing only the Dubhe contract instance
 */
export function useDubheContractFromProvider(): Dubhe {
  const { contract } = useDubheFromProvider();
  return contract;
}

/**
 * Hook for accessing only the GraphQL client instance
 */
export function useDubheGraphQLFromProvider(): any | null {
  const { getGraphqlClient } = useDubheContext();
  return getGraphqlClient();
}

/**
 * Hook for accessing only the ECS World instance
 */
export function useDubheECSFromProvider(): any | null {
  const { getEcsWorld } = useDubheContext();
  return getEcsWorld();
}