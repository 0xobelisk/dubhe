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
export type { NetworkType, DubheConfig, ClientConfig, DubheReturn, ContractReturn } from './types';

// ============ Configuration Management ============
export { useDubheConfig, DEFAULT_CONFIG } from './config';

export { mergeConfigurations, validateConfig, getConfigSummary } from './utils';

// ============ Provider Component ============
export { DubheProvider } from './provider';

// ============ Modern React Hooks ============
export {
  // Primary Hook - Provider pattern
  useDubhe,

  // Compatibility alias
  useContract,

  // Individual Instance Hooks - optimized for specific use cases
  useDubheContract,
  useDubheGraphQL,
  useDubheECS,

  // Configuration Update Hook - for dynamic config changes
  useDubheConfigUpdate
} from './hooks';
