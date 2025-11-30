/**
 * @0xobelisk/client/sui - Unified Dubhe Client for Sui Blockchain
 *
 * 🚀 Simple, powerful client creation aligned with @0xobelisk/react
 *
 * Features:
 * - ⚡ Unified configuration interface
 * - 🔧 Factory pattern for easy instantiation
 * - 🛡️ Complete type safety with strict TypeScript
 * - 📦 All-in-one bundle with contract, GraphQL, gRPC, and ECS clients
 * - 🎯 Intuitive API design
 * - 🌐 Platform-agnostic (Browser, Node.js, COCOS)
 */

// ============ Type Exports ============
export type { NetworkType, ClientConfig, DubheClientBundle } from './types';

// ============ Client Factory Functions ============
export {
  createClient,
  createClientWithValidation,
  validateClientConfig,
  isNetworkType
} from './client';

// ============ Re-export Core Types for Convenience ============
export type { Dubhe } from '@0xobelisk/sui-client';
export type { DubheGraphqlClient } from '@0xobelisk/graphql-client';
export type { DubheECSWorld } from '@0xobelisk/ecs';
export type { DubheGrpcClient } from '@0xobelisk/grpc-client';
