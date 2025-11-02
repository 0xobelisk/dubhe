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
 */
export interface DubheConfig {
  /** Network type */
  network: NetworkType;
  /** Contract package ID */
  packageId: string;
  /** Dubhe Schema ID (optional, for enhanced features) */
  dubheSchemaId: string;
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
 * Return type for the main useDubhe hook
 */
export interface DubheReturn {
  /** Dubhe contract instance with enhanced methods */
  contract: Dubhe & {
    /** Enhanced transaction methods with options */
    txWithOptions?: (
      system: string,
      method: string,
      options?: any
    ) => (params: any) => Promise<any>;
    /** Enhanced query methods with options */
    queryWithOptions?: (
      system: string,
      method: string,
      options?: any
    ) => (params: any) => Promise<any>;
  };
  /** GraphQL client (null if dubheMetadata not provided) */
  graphqlClient: DubheGraphqlClient | null;
  /** gRPC client (null if grpc endpoint not provided) */
  grpcClient: DubheGrpcClient | null;
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
