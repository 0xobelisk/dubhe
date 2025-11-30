/**
 * @0xobelisk/client - Unified Client Creation Layer for Dubhe Framework
 *
 * This package provides a unified interface for creating blockchain clients
 * across different chains. Currently supports Sui, with more chains coming soon.
 *
 * Usage:
 * - For Sui: import from '@0xobelisk/client/sui'
 * - For Aptos: import from '@0xobelisk/client/aptos' (coming soon)
 * - For Initia: import from '@0xobelisk/client/initia' (coming soon)
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
// In the future, this could export a chain-agnostic interface

/**
 * Note: Import chain-specific clients from their subpaths:
 * - '@0xobelisk/client/sui'
 */
