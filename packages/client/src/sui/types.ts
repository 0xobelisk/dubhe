import type { SuiMoveNormalizedModules, Dubhe } from '@0xobelisk/sui-client';
import type { DubheGraphqlClient } from '@0xobelisk/graphql-client';
import type { DubheECSWorld } from '@0xobelisk/ecs';
import type { DubheGrpcClient } from '@0xobelisk/grpc-client';

/**
 * Network type for Sui blockchain
 */
export type NetworkType = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

/**
 * Client configuration interface
 * Aligned with @0xobelisk/react configuration for consistency
 */
export interface ClientConfig {
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
 * Client bundle returned by createClient
 * Contains all initialized client instances
 */
export interface DubheClientBundle {
  /** Dubhe contract instance - core client for contract interactions */
  contract: Dubhe;
  /** GraphQL client for querying indexed data */
  graphqlClient: DubheGraphqlClient;
  /** gRPC client for high-performance queries */
  grpcClient: DubheGrpcClient;
  /** ECS World instance for entity-component-system queries */
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
}
