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
export type { NetworkType, DubheConfig, DubheReturn, ContractReturn } from './types';

// ============ Configuration Management ============
export { useDubheConfig, DEFAULT_CONFIG } from './config';

export { mergeConfigurations, validateConfig, getConfigSummary } from './utils';

// ============ Modern React Hooks ============
export {
  // Primary Hook - Auto-initialization pattern
  useDubhe,
  
  // Compatibility alias (deprecated)
  useContract,

  // Individual Instance Hooks
  useDubheContract,
  useDubheGraphQL,
  useDubheECS
} from './hooks';

