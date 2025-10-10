/**
 * Configuration Management for Dubhe React Integration
 *
 * Features:
 * - Type-safe configuration interface
 * - Configuration validation and error handling
 * - Smart merging of defaults and explicit config
 * - No environment variable handling (developers should handle environment variables themselves)
 */

import { useMemo } from 'react';
import type { DubheConfig } from './types';
import { mergeConfigurations, validateConfig } from './utils';

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
 * Merges defaults with explicit configuration provided by the developer
 *
 * Note: Environment variables should be handled by the developer before passing to this hook
 *
 * @param config - Complete or partial configuration object
 * @returns Complete, validated DubheConfig
 *
 * @example
 * ```typescript
 * // Basic usage with explicit config
 * const config = useDubheConfig({
 *   network: 'testnet',
 *   packageId: '0x123...',
 *   metadata: contractMetadata,
 *   credentials: {
 *     secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY // Handle env vars yourself
 *   }
 * });
 *
 * // With helper function to handle environment variables
 * const getConfigFromEnv = () => ({
 *   network: process.env.NEXT_PUBLIC_NETWORK as NetworkType,
 *   packageId: process.env.NEXT_PUBLIC_PACKAGE_ID,
 *   credentials: {
 *     secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
 *   }
 * });
 *
 * const config = useDubheConfig({
 *   ...getConfigFromEnv(),
 *   metadata: contractMetadata
 * });
 * ```
 */
export function useDubheConfig(config: Partial<DubheConfig>): DubheConfig {
  // Memoize the stringified config to detect actual changes
  const configKey = useMemo(() => {
    return JSON.stringify(config);
  }, [config]);

  return useMemo(() => {
    // Merge configurations: defaults -> user provided config
    const mergedConfig = mergeConfigurations(DEFAULT_CONFIG, config);

    // Validate the final configuration
    const validatedConfig = validateConfig(mergedConfig);

    // if (process.env.NODE_ENV === 'development') {
    //   console.log('🔧 Dubhe Config:', {
    //     ...validatedConfig,
    //     credentials: validatedConfig.credentials?.secretKey ? '[REDACTED]' : undefined
    //   });
    // }

    return validatedConfig;
  }, [configKey]);
}
