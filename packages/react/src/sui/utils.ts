/**
 * Utility Functions for Dubhe Configuration Management
 *
 * Features:
 * - Configuration validation and error handling
 * - Smart configuration merging with proper type safety
 * - Type-safe configuration validation
 */

import type { DubheConfig, NetworkType } from './types';

/**
 * Merge multiple configuration objects with proper deep merging
 * Later configurations override earlier ones
 *
 * @param baseConfig - Base configuration (usually defaults)
 * @param overrideConfig - Override configuration (user provided)
 * @returns Merged configuration
 */
export function mergeConfigurations(
  baseConfig: Partial<DubheConfig>,
  overrideConfig?: Partial<DubheConfig>
): Partial<DubheConfig> {
  if (!overrideConfig) {
    return { ...baseConfig };
  }

  const result: Partial<DubheConfig> = { ...baseConfig };

  // Merge top-level properties
  Object.assign(result, overrideConfig);

  // Deep merge nested objects
  if (overrideConfig.credentials || baseConfig.credentials) {
    result.credentials = {
      ...baseConfig.credentials,
      ...overrideConfig.credentials
    };
  }

  if (overrideConfig.endpoints || baseConfig.endpoints) {
    result.endpoints = {
      ...baseConfig.endpoints,
      ...overrideConfig.endpoints
    };
  }

  if (overrideConfig.options || baseConfig.options) {
    result.options = {
      ...baseConfig.options,
      ...overrideConfig.options
    };
  }

  return result;
}

/**
 * Validate configuration and ensure required fields are present
 * Throws descriptive errors for missing required fields
 *
 * @param config - Configuration to validate
 * @returns Validated and typed configuration
 * @throws Error if required fields are missing or invalid
 */
export function validateConfig(config: Partial<DubheConfig>): DubheConfig {
  const errors: string[] = [];

  // Check required fields
  if (!config.network) {
    errors.push('network is required');
  }

  if (!config.packageId) {
    errors.push('packageId is required');
  }

  if (!config.metadata) {
    errors.push('metadata is required');
  } else {
    // Basic metadata validation
    if (typeof config.metadata !== 'object') {
      errors.push('metadata must be an object');
    } else if (Object.keys(config.metadata).length === 0) {
      errors.push('metadata cannot be empty');
    }
  }

  // Validate network type
  if (config.network && !['mainnet', 'testnet', 'devnet', 'localnet'].includes(config.network)) {
    errors.push(
      `invalid network: ${config.network}. Must be one of: mainnet, testnet, devnet, localnet`
    );
  }

  // Validate package ID format (enhanced check)
  if (config.packageId) {
    if (!config.packageId.startsWith('0x')) {
      errors.push('packageId must start with 0x');
    } else if (config.packageId.length < 3) {
      errors.push('packageId must be longer than 0x');
    } else if (!/^0x[a-fA-F0-9]+$/.test(config.packageId)) {
      errors.push('packageId must contain only hexadecimal characters after 0x');
    }
  }

  // Validate dubheMetadata if provided
  if (config.dubheMetadata !== undefined) {
    if (typeof config.dubheMetadata !== 'object' || config.dubheMetadata === null) {
      errors.push('dubheMetadata must be an object');
    } else if (!config.dubheMetadata.components && !config.dubheMetadata.resources) {
      errors.push('dubheMetadata must contain components or resources');
    }
  }

  // Validate credentials if provided
  if (config.credentials) {
    if (config.credentials.secretKey && typeof config.credentials.secretKey !== 'string') {
      errors.push('credentials.secretKey must be a string');
    }
    if (config.credentials.mnemonics && typeof config.credentials.mnemonics !== 'string') {
      errors.push('credentials.mnemonics must be a string');
    }
  }

  // Validate URLs if provided
  if (config.endpoints?.graphql && !isValidUrl(config.endpoints.graphql)) {
    errors.push('endpoints.graphql must be a valid URL');
  }

  if (config.endpoints?.websocket && !isValidUrl(config.endpoints.websocket)) {
    errors.push('endpoints.websocket must be a valid URL');
  }

  // Validate numeric options
  if (
    config.options?.cacheTimeout !== undefined &&
    (typeof config.options.cacheTimeout !== 'number' || config.options.cacheTimeout < 0)
  ) {
    errors.push('options.cacheTimeout must be a non-negative number');
  }

  if (
    config.options?.debounceMs !== undefined &&
    (typeof config.options.debounceMs !== 'number' || config.options.debounceMs < 0)
  ) {
    errors.push('options.debounceMs must be a non-negative number');
  }

  if (errors.length > 0) {
    const errorMessage = `Invalid Dubhe configuration (${errors.length} error${errors.length > 1 ? 's' : ''}):\n${errors.map((e) => `- ${e}`).join('\n')}`;
    console.error('Configuration validation failed:', { errors, config });
    throw new Error(errorMessage);
  }

  return config as DubheConfig;
}

/**
 * Simple URL validation helper
 *
 * @param url - URL string to validate
 * @returns true if URL is valid, false otherwise
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a configuration summary for debugging
 * Hides sensitive information like private keys
 *
 * @param config - Configuration to summarize
 * @returns Safe configuration summary
 */
export function getConfigSummary(config: DubheConfig): object {
  return {
    network: config.network,
    packageId: config.packageId,
    dubheSchemaId: config.dubheSchemaId,
    hasMetadata: !!config.metadata,
    hasDubheMetadata: !!config.dubheMetadata,
    hasCredentials: !!config.credentials?.secretKey,
    endpoints: config.endpoints,
    options: config.options
  };
}
