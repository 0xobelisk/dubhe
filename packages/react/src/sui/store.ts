/**
 * ⚠️ DEPRECATED: Dubhe Store - Global state management based on nanostores
 * 
 * This store-based approach is deprecated and will be removed in the next major version.
 * Please migrate to the new auto-initialization pattern using the useContract hook.
 * 
 * MIGRATION GUIDE:
 * Old way (store-based):
 * ```typescript
 * const { connect, disconnect, isConnected } = useDubheConnection();
 * const contract = useDubheContract();
 * 
 * useEffect(() => {
 *   connect({ network: 'devnet', packageId: '0x...', metadata });
 * }, []);
 * ```
 * 
 * New way (auto-initialization):
 * ```typescript
 * const { contract, address } = useContract({
 *   network: 'devnet',
 *   packageId: '0x...',
 *   metadata
 * });
 * ```
 * 
 * Benefits of migration:
 * - ✅ Simpler API with no manual connection management
 * - ✅ Automatic caching and performance optimization
 * - ✅ Environment variable support out of the box
 * - ✅ Better TypeScript support and error handling
 * - ✅ No more connection state management complexity
 *
 * @deprecated Use the new useContract hook instead of store-based management
 */

import { atom, computed } from 'nanostores';
import { Dubhe } from '@0xobelisk/sui-client';
import { createDubheGraphqlClient } from '@0xobelisk/graphql-client';
import { createECSWorld } from '@0xobelisk/ecs';
import type { DubheConfig, DubheState, ConnectionStatus } from './types';

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  endpoints: {
    graphql: 'http://localhost:4000/graphql',
    websocket: 'ws://localhost:4000/graphql'
  },
  options: {
    enableBatchOptimization: true,
    cacheTimeout: 5000,
    reconnect: {
      enabled: true,
      maxAttempts: 3,
      delay: 1000
    },
    debounceMs: 100,
    devMode: process.env.NODE_ENV === 'development'
  }
} as const;

/**
 * Initial state
 */
const INITIAL_STATE: DubheState = {
  status: 'disconnected',
  config: null,
  instances: {
    contract: null,
    graphql: null,
    ecs: null
  },
  user: {
    address: null
  },
  error: null,
  metrics: {
    requestCount: 0
  }
};

/**
 * Main state store
 */
export const dubheStore = atom<DubheState>(INITIAL_STATE);

/**
 * Computed property: whether connected
 */
export const isConnected = computed(dubheStore, (state) => state.status === 'connected');

/**
 * Computed property: whether connecting
 */
export const isConnecting = computed(dubheStore, (state) => state.status === 'connecting');

/**
 * Computed property: whether has error
 */
export const hasError = computed(dubheStore, (state) => state.status === 'error' || !!state.error);

/**
 * Computed property: current network
 */
export const currentNetwork = computed(dubheStore, (state) => state.config?.network || null);

/**
 * Computed property: user address
 */
export const userAddress = computed(dubheStore, (state) => state.user.address);

/**
 * Internal utility function: update state
 */
const updateState = (updates: Partial<DubheState>) => {
  const current = dubheStore.get();
  dubheStore.set({
    ...current,
    ...updates,
    metrics: {
      ...current.metrics,
      lastActivity: Date.now(),
      ...updates.metrics
    }
  });
};

/**
 * Internal utility function: logging
 */
const log = (message: string, ...args: any[]) => {
  const state = dubheStore.get();
  if (state.config?.options?.devMode) {
    console.log(`[Dubhe] ${message}`, ...args);
  }
};

/**
 * Core operation: connect to Dubhe
 * @deprecated Use the useContract hook instead for automatic initialization
 */
export const connect = async (config: DubheConfig) => {
  console.warn(
    '[DEPRECATED] connect() is deprecated. Use useContract() hook instead.\n' +
    'See migration guide: https://docs.obelisk.build/react/migration'
  );
  const startTime = Date.now();
  log('🚀 Starting Dubhe connection...', config);

  // Merge default configuration
  const finalConfig: DubheConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    endpoints: { ...DEFAULT_CONFIG.endpoints, ...config.endpoints },
    options: { ...DEFAULT_CONFIG.options, ...config.options }
  };

  // Set connection state
  updateState({
    status: 'connecting',
    config: finalConfig,
    error: null
  });

  try {
    // Create Dubhe contract instance
    log('📝 Creating contract instance...');
    const contract = new Dubhe({
      networkType: finalConfig.network,
      packageId: finalConfig.packageId,
      metadata: finalConfig.metadata,
      secretKey: finalConfig.credentials?.secretKey,
      mnemonics: finalConfig.credentials?.mnemonics
    });

    // Get user address
    const address = contract.getAddress();
    log('✅ Contract instance created successfully', { address });

    let graphqlClient = null;
    let ecsWorld = null;

    // Create GraphQL client (if dubheMetadata is provided)
    if (finalConfig.dubheMetadata) {
      log('🔗 Creating GraphQL client...');
      graphqlClient = createDubheGraphqlClient({
        endpoint: finalConfig.endpoints?.graphql || 'http://localhost:4000/graphql',
        subscriptionEndpoint: finalConfig.endpoints?.websocket || 'ws://localhost:4000/graphql',
        dubheMetadata: finalConfig.dubheMetadata
      });

      // Create ECS World
      log('🌍 Creating ECS World...');
      ecsWorld = createECSWorld(graphqlClient, {
        queryConfig: {
          enableBatchOptimization: finalConfig.options?.enableBatchOptimization ?? true,
          defaultCacheTimeout: finalConfig.options?.cacheTimeout ?? 5000
        },
        subscriptionConfig: {
          defaultDebounceMs: finalConfig.options?.debounceMs ?? 100,
          reconnectOnError: finalConfig.options?.reconnect?.enabled ?? true
        }
      });

      log('✅ GraphQL and ECS initialization completed');
    }

    // Update to connected state
    const initTime = Date.now() - startTime;
    updateState({
      status: 'connected',
      instances: {
        contract,
        graphql: graphqlClient,
        ecs: ecsWorld
      },
      user: {
        address
      },
      error: null,
      metrics: {
        initTime,
        requestCount: 0
      }
    });

    log('🎉 Dubhe connection successful!', {
      network: finalConfig.network,
      packageId: finalConfig.packageId,
      address,
      initTime: `${initTime}ms`,
      hasGraphQL: !!graphqlClient,
      hasECS: !!ecsWorld
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Connection failed';
    log('❌ Dubhe connection failed:', error);

    updateState({
      status: 'error',
      error: errorMessage
    });

    throw error;
  }
};

/**
 * Core operation: disconnect
 * @deprecated Connection management is handled automatically with useContract hook
 */
export const disconnect = () => {
  console.warn(
    '[DEPRECATED] disconnect() is deprecated. Connection is managed automatically with useContract() hook.'
  );
  log('🔌 Disconnect Dubhe connection');

  dubheStore.set(INITIAL_STATE);
};

/**
 * Core operation: reconnect
 */
export const reconnect = async () => {
  const state = dubheStore.get();
  if (!state.config) {
    throw new Error('Cannot reconnect: no saved configuration');
  }

  log('🔄 Reconnecting Dubhe...');
  await connect(state.config);
};

/**
 * Get contract instance (type safe)
 */
export const getContract = () => {
  const state = dubheStore.get();
  if (state.status !== 'connected' || !state.instances.contract) {
    throw new Error('Dubhe not connected or contract instance unavailable');
  }
  return state.instances.contract;
};

/**
 * Get GraphQL client (type safe)
 */
export const getGraphQL = () => {
  const state = dubheStore.get();
  if (state.status !== 'connected' || !state.instances.graphql) {
    throw new Error('GraphQL client unavailable, please check if dubheMetadata is provided');
  }
  return state.instances.graphql;
};

/**
 * Get ECS World (type safe)
 */
export const getECS = () => {
  const state = dubheStore.get();
  if (state.status !== 'connected' || !state.instances.ecs) {
    throw new Error('ECS World unavailable, please check GraphQL client configuration');
  }
  return state.instances.ecs;
};

/**
 * Utility function: increment request count
 */
export const incrementRequestCount = () => {
  const state = dubheStore.get();
  updateState({
    metrics: {
      ...state.metrics,
      requestCount: (state.metrics?.requestCount || 0) + 1
    }
  });
};

/**
 * Utility function: get performance metrics
 */
export const getMetrics = () => {
  const state = dubheStore.get();
  return state.metrics;
};

/**
 * Utility function: check feature availability
 */
export const checkCapabilities = () => {
  const state = dubheStore.get();
  return {
    contract: state.status === 'connected' && !!state.instances.contract,
    graphql: state.status === 'connected' && !!state.instances.graphql,
    ecs: state.status === 'connected' && !!state.instances.ecs
  };
};
