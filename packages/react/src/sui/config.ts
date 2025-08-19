/**
 * Configuration Management for Dubhe React Integration
 * 
 * Features:
 * - Environment variable support with smart defaults
 * - Type-safe configuration interface
 * - Configuration validation and error handling
 * - Automatic merging of defaults, environment variables, and explicit config
 */

import { useMemo } from 'react';
import type { DubheConfig, NetworkType } from './types';
import { getEnvironmentConfig, mergeConfigurations, validateConfig } from './utils';

/**
 * Default configuration object with sensible defaults
 */
export const DEFAULT_CONFIG: Partial<DubheConfig> = {
  endpoints: {
    graphql: 'http://localhost:4000/graphql',
    websocket: 'ws://localhost:4000/graphql'
  },
  options: {
    enableBatchOptimization: true,
    cacheTimeout: 5000,
    debounceMs: 100,
    reconnectOnError: true
  }
};

/**
 * Configuration Hook: useDubheConfig
 * 
 * Automatically merges defaults, environment variables, and explicit overrides
 * 
 * @param overrides - Explicit configuration overrides
 * @returns Complete, validated DubheConfig
 * 
 * @example
 * ```typescript
 * // Use with environment variables only
 * const config = useDubheConfig();
 * 
 * // Override specific values
 * const config = useDubheConfig({
 *   network: 'testnet',
 *   packageId: '0x123...'
 * });
 * ```
 */
export function useDubheConfig(overrides?: Partial<DubheConfig>): DubheConfig {
  return useMemo(() => {
    // Get environment-based configuration
    const envConfig = getEnvironmentConfig();
    
    // Merge configurations in order: defaults -> environment -> overrides
    const mergedConfig = mergeConfigurations(DEFAULT_CONFIG, envConfig, overrides);
    
    // Validate the final configuration
    const validatedConfig = validateConfig(mergedConfig);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Dubhe Config:', {
        ...validatedConfig,
        credentials: validatedConfig.credentials?.secretKey ? '[HIDDEN]' : undefined
      });
    }
    
    return validatedConfig;
  }, [overrides]);
}