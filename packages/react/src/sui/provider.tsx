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

import {
  createContext,
  useContext,
  useRef,
  ReactNode,
  useState,
  useCallback,
  useEffect
} from 'react';
import { Dubhe } from '@0xobelisk/sui-client';
import { createDubheGraphqlClient, DubheGraphqlClient } from '@0xobelisk/graphql-client';
import { createECSWorld, DubheECSWorld } from '@0xobelisk/ecs';
import { DubheGrpcClient } from '@0xobelisk/grpc-client';
import { useDubheConfig } from './config';
import type { DubheConfig, DubheReturn } from './types';

/**
 * Context interface for Dubhe client instances
 * All clients are stored using useRef to ensure single initialization
 */
interface DubheContextValue {
  getContract: () => Dubhe;
  getGraphqlClient: () => DubheGraphqlClient;
  getGrpcClient: () => DubheGrpcClient;
  getEcsWorld: () => DubheECSWorld;
  getAddress: () => string;
  getMetrics: () => {
    initTime: number;
    requestCount: number;
    lastActivity: number;
  };
  config: DubheConfig;
  updateConfig: (newConfig: Partial<DubheConfig>) => void;
  resetClients: (options?: {
    resetContract?: boolean;
    resetGraphql?: boolean;
    resetGrpc?: boolean;
    resetEcs?: boolean;
  }) => void;
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
  // Use state to manage config for dynamic updates with persistence
  const [currentConfig, setCurrentConfig] = useState<Partial<DubheConfig>>(() => {
    // Try to restore config from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('dubhe-config');
        if (saved) {
          const parsedConfig = JSON.parse(saved);
          console.log('Restored Dubhe configuration from localStorage');
          // Important: Explicit config takes precedence over localStorage
          return { ...parsedConfig, ...config };
        }
      } catch (error) {
        console.warn('Failed to restore Dubhe configuration from localStorage', error);
      }
    }
    return config;
  });

  // Merge configuration with defaults
  const finalConfig = useDubheConfig(currentConfig);

  // Track initialization start time (useRef ensures single timestamp)
  const startTimeRef = useRef<number>(performance.now());

  // useRef for contract instance - guarantees single initialization
  // Unlike useMemo, useRef.current is never re-calculated
  const contractRef = useRef<Dubhe | undefined>(undefined);
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
  const graphqlClientRef = useRef<DubheGraphqlClient | null>(null);
  const hasInitializedGraphql = useRef(false);
  const getGraphqlClient = (): DubheGraphqlClient => {
    if (!hasInitializedGraphql.current) {
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
    return graphqlClientRef.current!;
  };

  // useRef for gRPC client instance - single initialization guaranteed
  const grpcClientRef = useRef<DubheGrpcClient | null>(null);
  const hasInitializedGrpc = useRef(false);
  const getGrpcClient = (): DubheGrpcClient => {
    if (!hasInitializedGrpc.current) {
      try {
        console.log('Initializing gRPC client instance (one-time)');
        grpcClientRef.current = new DubheGrpcClient({
          baseUrl: finalConfig.endpoints?.grpc || 'http://localhost:50051'
        });
        hasInitializedGrpc.current = true;
      } catch (error) {
        console.error('gRPC client initialization failed:', error);
        throw error;
      }
    }
    return grpcClientRef.current!;
  };

  // useRef for ECS World instance - depends on GraphQL client
  const ecsWorldRef = useRef<DubheECSWorld | null>(null);
  const hasInitializedEcs = useRef(false);
  const getEcsWorld = (): DubheECSWorld => {
    const graphqlClient = getGraphqlClient();
    if (!hasInitializedEcs.current) {
      try {
        console.log('Initializing ECS World instance (one-time)');
        ecsWorldRef.current = createECSWorld(graphqlClient, {
          dubheMetadata: finalConfig.dubheMetadata,
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
    return ecsWorldRef.current!;
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

  // Selective reset client instances
  const resetClients = useCallback(
    (options?: {
      resetContract?: boolean;
      resetGraphql?: boolean;
      resetGrpc?: boolean;
      resetEcs?: boolean;
    }) => {
      const opts = {
        resetContract: true,
        resetGraphql: true,
        resetGrpc: true,
        resetEcs: true,
        ...options
      };

      console.log('Resetting Dubhe client instances', opts);

      if (opts.resetContract) {
        contractRef.current = undefined;
      }
      if (opts.resetGraphql) {
        graphqlClientRef.current = null;
        hasInitializedGraphql.current = false;
      }
      if (opts.resetGrpc) {
        grpcClientRef.current = null;
        hasInitializedGrpc.current = false;
      }
      if (opts.resetEcs) {
        ecsWorldRef.current = null;
        hasInitializedEcs.current = false;
      }

      startTimeRef.current = performance.now();
    },
    []
  );

  // Update config without resetting clients (reactive update)
  const updateConfig = useCallback((newConfig: Partial<DubheConfig>) => {
    console.log('Updating Dubhe configuration (reactive)');
    setCurrentConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('dubhe-config', JSON.stringify(updated));
          console.log('Persisted Dubhe configuration to localStorage');
        } catch (error) {
          console.warn('Failed to persist Dubhe configuration', error);
        }
      }
      return updated;
    });
  }, []);

  // Reactive configuration updates via useEffect

  // Monitor Contract configuration changes
  useEffect(() => {
    if (contractRef.current) {
      console.log('Contract config dependencies changed, updating...');
      contractRef.current.updateConfig({
        networkType: finalConfig.network,
        packageId: finalConfig.packageId,
        metadata: finalConfig.metadata,
        secretKey: finalConfig.credentials?.secretKey,
        mnemonics: finalConfig.credentials?.mnemonics
      });
    }
  }, [
    finalConfig.network,
    finalConfig.packageId,
    finalConfig.metadata,
    finalConfig.credentials?.secretKey,
    finalConfig.credentials?.mnemonics
  ]);

  // Monitor GraphQL endpoint changes
  useEffect(() => {
    if (graphqlClientRef.current) {
      console.log('GraphQL endpoint dependencies changed, updating...');
      graphqlClientRef.current.updateConfig({
        endpoint: finalConfig.endpoints?.graphql,
        subscriptionEndpoint: finalConfig.endpoints?.websocket
      });
      // Reset ECS World when GraphQL endpoints change (needs new connection)
      ecsWorldRef.current = null;
      hasInitializedEcs.current = false;
    }
  }, [finalConfig.endpoints?.graphql, finalConfig.endpoints?.websocket]);

  // Monitor GraphQL metadata changes
  useEffect(() => {
    if (graphqlClientRef.current && finalConfig.dubheMetadata) {
      console.log('GraphQL metadata changed, updating...');
      graphqlClientRef.current.updateConfig({
        dubheMetadata: finalConfig.dubheMetadata
      });
      // Note: ECS will handle its own metadata update via its useEffect
    }
  }, [finalConfig.dubheMetadata]);

  // Monitor gRPC configuration changes
  useEffect(() => {
    if (grpcClientRef.current && finalConfig.endpoints?.grpc) {
      console.log('gRPC config dependencies changed, updating...');
      grpcClientRef.current.updateConfig({ baseUrl: finalConfig.endpoints.grpc });
    }
  }, [finalConfig.endpoints?.grpc]);

  // Monitor ECS configuration changes
  useEffect(() => {
    if (ecsWorldRef.current) {
      console.log('ECS config dependencies changed, updating...');
      ecsWorldRef.current.updateConfig({
        dubheMetadata: finalConfig.dubheMetadata,
        queryConfig: {
          enableBatchOptimization: finalConfig.options?.enableBatchOptimization,
          defaultCacheTimeout: finalConfig.options?.cacheTimeout
        },
        subscriptionConfig: {
          defaultDebounceMs: finalConfig.options?.debounceMs,
          reconnectOnError: finalConfig.options?.reconnectOnError
        }
      });
    }
  }, [
    finalConfig.dubheMetadata,
    finalConfig.options?.enableBatchOptimization,
    finalConfig.options?.cacheTimeout,
    finalConfig.options?.debounceMs,
    finalConfig.options?.reconnectOnError
  ]);

  // Context value - stable reference (no re-renders for consumers)
  const contextValue: DubheContextValue = {
    getContract,
    getGraphqlClient,
    getGrpcClient,
    getEcsWorld,
    getAddress,
    getMetrics,
    config: finalConfig,
    updateConfig,
    resetClients
  };

  return <DubheContext.Provider value={contextValue}>{children}</DubheContext.Provider>;
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
  const grpcClient = context.getGrpcClient();
  const ecsWorld = context.getEcsWorld();
  const address = context.getAddress();
  const metrics = context.getMetrics();

  return {
    contract,
    graphqlClient,
    grpcClient,
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
export function useDubheGraphQLFromProvider(): DubheGraphqlClient {
  const { getGraphqlClient } = useDubheContext();
  return getGraphqlClient();
}

/**
 * Hook for accessing only the ECS World instance
 */
export function useDubheECSFromProvider(): DubheECSWorld {
  const { getEcsWorld } = useDubheContext();
  return getEcsWorld();
}

/**
 * Hook for accessing only the gRPC client instance
 */
export function useDubheGrpcFromProvider(): DubheGrpcClient {
  const { getGrpcClient } = useDubheContext();
  return getGrpcClient();
}

/**
 * Hook for accessing configuration update methods
 *
 * @returns Object with updateConfig and resetClients methods
 *
 * @example
 * ```typescript
 * function ConfigUpdater() {
 *   const { updateConfig, resetClients, config } = useDubheConfigUpdate();
 *
 *   const switchNetwork = () => {
 *     updateConfig({
 *       network: 'testnet',
 *       packageId: '0xnew...'
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       <p>Current network: {config.network}</p>
 *       <button onClick={switchNetwork}>Switch to Testnet</button>
 *       <button onClick={resetClients}>Reset Clients</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDubheConfigUpdate() {
  const { updateConfig, resetClients, config } = useDubheContext();
  return { updateConfig, resetClients, config };
}
