/**
 * @0xobelisk/react/sui - Modern Dubhe React Integration
 *
 * 🚀 Simple, powerful, type-safe Sui blockchain development experience
 *
 * Features:
 * - ⚡ Auto-initialization with environment variable support
 * - 🔧 Configuration-driven setup with smart defaults
 * - 🛡️ Complete type safety with strict TypeScript
 * - 📦 Direct instance access without connection state management
 * - 🎯 Intuitive API design following React best practices
 */

// ============ Type Exports ============
export type {
  NetworkType,
  DubheConfig,
  ContractReturn
} from './types';

// ============ Configuration Management ============
export {
  useDubheConfig,
  DEFAULT_CONFIG
} from './config';

export {
  getEnvironmentConfig,
  mergeConfigurations,
  validateConfig,
  getConfigSummary
} from './utils';

// ============ Modern React Hooks ============
export {
  // Primary Hook - Auto-initialization pattern
  useContract,

  // Individual Instance Hooks
  useDubheContract,
  useDubheGraphQL,
  useDubheECS
} from './hooks';

// ============ DEPRECATED EXPORTS ============
// The following exports are deprecated and will be removed in the next major version
// They are kept for backward compatibility during the migration period

/**
 * @deprecated Use the new auto-initialization pattern instead
 * Migration guide: https://docs.obelisk.build/react/migration
 */
export type {
  ConnectionStatus,
  DubheState,
  QueryOptions,
  SubscriptionOptions,
  TransactionOptions
} from './types';

/**
 * @deprecated Store-based state management is replaced by auto-initialization
 * Use useContract() hook instead
 */
export {
  // Main state
  dubheStore,

  // Computed properties  
  isConnected,
  isConnecting,
  hasError,
  currentNetwork,
  userAddress,

  // Core operations
  connect,
  disconnect,
  reconnect,

  // Utility functions
  getContract,
  getGraphQL,
  getECS,
  checkCapabilities,
  getMetrics
} from './store';

/**
 * @deprecated Legacy hooks are replaced by the new auto-initialization pattern
 * Use useContract() hook instead
 */
export {
  // Legacy Core Hooks
  useDubhe,
  useDubheConnection,
  useDubheAutoConnect,

  // Legacy Advanced Hooks
  useDubheQuery,
  useDubheSubscription,
  useDubheCapabilities,
  useDubheMetrics
} from './hooks';
