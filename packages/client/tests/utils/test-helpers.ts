/**
 * Test helper utilities
 * Provides common functions and utilities for testing
 */

import type { ClientConfig } from '../../src/sui/types';

/**
 * Create a mock ClientConfig for testing
 */
export function createMockConfig(overrides?: Partial<ClientConfig>): ClientConfig {
  return {
    network: 'devnet',
    packageId: '0x1234567890abcdef',
    metadata: {
      name: 'test-package',
      version: '1.0.0',
      schemas: {
        Counter: {
          fields: {
            value: 'u64'
          }
        }
      }
    },
    ...overrides
  };
}

/**
 * Wait for a specific amount of time (for testing async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a spy that tracks calls
 */
export function createSpy<T extends (...args: any[]) => any>(
  implementation?: T
): T & { calls: any[][] } {
  const calls: any[][] = [];
  const spy = ((...args: any[]) => {
    calls.push(args);
    return implementation ? implementation(...args) : undefined;
  }) as T & { calls: any[][] };
  spy.calls = calls;
  return spy;
}

/**
 * Assert that a value is defined (TypeScript type guard)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value is null or undefined');
  }
}

/**
 * Create a mock metadata object
 */
export function createMockMetadata(overrides?: any) {
  return {
    name: 'test-package',
    version: '1.0.0',
    schemas: {
      Counter: {
        fields: {
          value: 'u64'
        }
      }
    },
    systems: ['counter_system'],
    ...overrides
  };
}

/**
 * Create mock Dubhe metadata
 */
export function createMockDubheMetadata(overrides?: any) {
  return {
    schemas: ['Counter', 'Position'],
    systems: ['counter_system', 'movement_system'],
    ...overrides
  };
}
