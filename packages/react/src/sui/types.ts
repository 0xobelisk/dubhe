import { SuiMoveNormalizedModules, Dubhe } from '@0xobelisk/sui-client';
import type { DubheGraphqlClient } from '@0xobelisk/graphql-client';
import type { DubheECSWorld } from '@0xobelisk/ecs';
import type { DubheGrpcClient } from '@0xobelisk/grpc-client';

/**
 * Network type
 */
export type NetworkType = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

/**
 * Modern Dubhe client configuration for auto-initialization
 * Aligned with @0xobelisk/client configuration for consistency
 */
export interface DubheConfig {
  /** Network type */
  network: NetworkType;
  /** Contract package ID */
  packageId: string;
  /** Contract metadata (required for contract instantiation) */
  metadata: any;
  /** Dubhe Schema ID (optional, for enhanced features) */
  dubheSchemaId?: string;
  /** Dubhe metadata (enables GraphQL/ECS features) */
  dubheMetadata?: any;
  /** Authentication credentials */
  credentials?: {
    /** Private key (base64 or hex string) */
    secretKey?: string;
    /** Mnemonic phrase (12 or 24 words) */
    mnemonics?: string;
  };
  /** Service endpoints configuration */
  endpoints?: {
    /** Full node RPC URLs (can provide multiple for redundancy) */
    fullnodeUrls?: string[];
    /** GraphQL endpoint URL */
    graphql?: string;
    /** WebSocket endpoint URL for subscriptions */
    websocket?: string;
    /** gRPC endpoint URL */
    grpc?: string;
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
 * Type alias for consistency with @0xobelisk/client package
 */
export type ClientConfig = DubheConfig;

/**
 * Return type for the main useDubhe hook
 */
export interface DubheReturn {
  /** Dubhe contract instance */
  contract: Dubhe;
  /** GraphQL client (always available, uses default localhost endpoint if not configured) */
  graphqlClient: DubheGraphqlClient;
  /** gRPC client (always available, uses default localhost endpoint if not configured) */
  grpcClient: DubheGrpcClient;
  /** ECS World instance (always available, depends on GraphQL client) */
  ecsWorld: DubheECSWorld;
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
  /** Configuration options used */
  options?: {
    enableBatchOptimization?: boolean;
    cacheTimeout?: number;
    debounceMs?: number;
    reconnectOnError?: boolean;
  };
  /** Performance metrics */
  metrics?: {
    initTime?: number;
    requestCount?: number;
    lastActivity?: number;
  };
}

/**
 * Compatibility alias for DubheReturn
 * @deprecated Use DubheReturn instead for better consistency
 */
export type ContractReturn = DubheReturn;
