/**
 * Mock implementations for Dubhe dependencies
 */

import { vi } from 'vitest';

// Mock Dubhe contract client
export const mockDubheClient = {
  getAddress: vi.fn(() => '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
  tx: {
    counter_system: {
      inc: vi.fn(),
      dec: vi.fn()
    }
  },
  query: {
    counter_system: {
      get: vi.fn()
    }
  }
};

// Mock GraphQL client
export const mockGraphqlClient = {
  query: vi.fn(),
  subscribe: vi.fn(),
  mutation: vi.fn()
};

// Mock gRPC client
export const mockGrpcClient = {
  getEntities: vi.fn(),
  getEntity: vi.fn(),
  subscribeToEntity: vi.fn()
};

// Mock ECS World
export const mockEcsWorld = {
  getEntities: vi.fn(() => []),
  getEntity: vi.fn(),
  subscribe: vi.fn(),
  query: vi.fn()
};

// Factory function to create mock instances
export function createMockDubhe() {
  return mockDubheClient;
}

export function createMockGraphqlClient() {
  return mockGraphqlClient;
}

export function createMockGrpcClient() {
  return mockGrpcClient;
}

export function createMockEcsWorld() {
  return mockEcsWorld;
}
