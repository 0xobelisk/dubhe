import { SuiMoveNormalizedModules, Dubhe } from '@0xobelisk/sui-client';
import type { DubheGraphqlClient } from '@0xobelisk/graphql-client';
import type { DubheECSWorld } from '@0xobelisk/ecs';

/**
 * Network type
 */
export type NetworkType = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

/**
 * Modern Dubhe client configuration for auto-initialization
 */
export interface DubheConfig {
  /** Network type */
  network: NetworkType;
  /** Contract package ID */
  packageId: string;
  /** Dubhe Schema ID (optional, for enhanced features) */
  dubheSchemaId?: string;
  /** Contract metadata (required for contract instantiation) */
  metadata: SuiMoveNormalizedModules;
  /** Dubhe metadata (enables GraphQL/ECS features) */
  dubheMetadata?: any;
  /** Authentication credentials */
  credentials?: {
    secretKey?: string;
    mnemonics?: string;
  };
  /** Service endpoints configuration */
  endpoints?: {
    graphql?: string;
    websocket?: string;
  };
  /** Performance and behavior options */
  options?: {
    /** Enable batch query optimization */
    enableBatchOptimization?: boolean;
    /** Default cache timeout (milliseconds) */
    cacheTimeout?: number;
    /** Request debounce delay (milliseconds) */
    debounceMs?: number;
    /** Auto-reconnect on WebSocket errors */
    reconnectOnError?: boolean;
  };
}

/**
 * Return type for the main useContract hook
 */
export interface ContractReturn {
  /** Dubhe contract instance */
  contract: Dubhe;
  /** GraphQL client (null if dubheMetadata not provided) */
  graphqlClient: DubheGraphqlClient | null;
  /** ECS World instance (null if GraphQL not available) */
  ecsWorld: DubheECSWorld | null;
  /** Contract metadata */
  metadata: SuiMoveNormalizedModules;
  /** Network type */
  network: NetworkType;
  /** Package ID */
  packageId: string;
  /** Dubhe Schema ID (if provided) */
  dubheSchemaId?: string;
  /** User address */
  address: string;
}

// ==== DEPRECATED TYPES ====
// The following types are deprecated and will be removed in the next major version
// Use the new auto-initialization pattern instead

/**
 * @deprecated Connection status management is no longer needed with auto-initialization
 * This type will be removed in the next major version
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * @deprecated Client state is no longer exposed with auto-initialization
 * Use individual hooks like useContract instead
 */
export interface DubheState {
  /** Connection status */
  status: ConnectionStatus;
  /** Configuration information */
  config: DubheConfig | null;
  /** Client instances */
  instances: {
    /** Dubhe contract instance */
    contract: Dubhe | null;
    /** GraphQL client */
    graphql: any | null;
    /** ECS World instance */
    ecs: any | null;
  };
  /** User information */
  user: {
    /** Current address */
    address: string | null;
    /** Balance information */
    balance?: string;
  };
  /** Error information */
  error: string | null;
  /** Performance metrics */
  metrics?: {
    /** Initialization time (milliseconds) */
    initTime?: number;
    /** Last activity time */
    lastActivity?: number;
    /** Request count */
    requestCount?: number;
  };
}

/**
 * @deprecated Use direct contract methods instead
 */
export interface QueryOptions {
  /** Whether to enable cache */
  cache?: boolean;
  /** Cache time (milliseconds) */
  cacheTime?: number;
  /** Whether to refresh in background */
  staleWhileRevalidate?: boolean;
  /** Retry count */
  retries?: number;
}

/**
 * @deprecated Use direct GraphQL subscriptions instead
 */
export interface SubscriptionOptions {
  /** Whether to execute immediately */
  immediate?: boolean;
  /** Debounce delay */
  debounce?: number;
  /** Error retry */
  retry?: boolean;
}

/**
 * @deprecated Use direct contract transaction methods instead
 */
export interface TransactionOptions {
  /** Success callback */
  onSuccess?: (result: any) => void;
  /** Error callback */
  onError?: (error: any) => void;
  /** Progress callback */
  onProgress?: (progress: number) => void;
  /** Whether to show notification */
  showNotification?: boolean;
}
