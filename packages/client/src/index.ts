/**
 * @0xobelisk/client - Unified Client Creation Layer for Dubhe Framework
 *
 * This package provides a unified interface for creating Dubhe clients on Sui.
 *
 * Usage:
 * - For Sui: import from '@0xobelisk/client/sui'
 *
 * @example
 * ```typescript
 * import { createClient } from '@0xobelisk/client/sui';
 *
 * const client = createClient({
 *   network: 'devnet',
 *   packageId: '0x123...',
 *   metadata: contractMetadata,
 *   credentials: { secretKey: '...' }
 * });
 * ```
 */

// Main entry point - currently redirects to Sui
// Export chain-specific clients from subpaths.

/**
 * Note: Import chain-specific clients from their subpaths:
 * - '@0xobelisk/client/sui'
 */
