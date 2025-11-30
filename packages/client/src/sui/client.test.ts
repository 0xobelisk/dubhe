import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient, isNetworkType, validateClientConfig } from './client';
import type { ClientConfig } from './types';

// Mock all dependencies
vi.mock('@0xobelisk/sui-client', () => ({
  Dubhe: vi.fn(function (this: any, config) {
    this.networkType = config.networkType;
    this.packageId = config.packageId;
    this.tx = {};
    this.query = {};
    this.getAddress = () => '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    return this;
  })
}));

vi.mock('@0xobelisk/graphql-client', () => ({
  createDubheGraphqlClient: vi.fn((config) => ({
    endpoint: config.endpoint,
    query: vi.fn(),
    subscribe: vi.fn()
  }))
}));

vi.mock('@0xobelisk/grpc-client', () => ({
  DubheGrpcClient: vi.fn(function (this: any, config) {
    this.baseUrl = config.baseUrl;
    this.getEntities = vi.fn();
    this.getEntity = vi.fn();
    return this;
  })
}));

vi.mock('@0xobelisk/ecs', () => ({
  createECSWorld: vi.fn(() => ({
    getEntities: vi.fn(() => []),
    getEntity: vi.fn(),
    subscribe: vi.fn()
  }))
}));

describe('createClient', () => {
  const mockMetadata = {
    name: 'test-package',
    version: '1.0.0',
    schemas: {}
  };

  const validConfig: ClientConfig = {
    network: 'devnet',
    packageId: '0x123',
    metadata: mockMetadata
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Basic functionality', () => {
    it('should create client with minimal valid config', () => {
      const client = createClient(validConfig);

      expect(client).toBeDefined();
      expect(client.contract).toBeDefined();
      expect(client.graphqlClient).toBeDefined();
      expect(client.grpcClient).toBeDefined();
      expect(client.ecsWorld).toBeDefined();
      expect(client.metadata).toBe(mockMetadata);
      expect(client.network).toBe('devnet');
      expect(client.packageId).toBe('0x123');
    });

    it('should create client with full config', () => {
      const fullConfig: ClientConfig = {
        ...validConfig,
        credentials: {
          secretKey: 'test-secret-key',
          mnemonics: 'test mnemonics'
        },
        endpoints: {
          fullnodeUrls: ['https://fullnode.devnet.sui.io'],
          graphql: 'http://localhost:4000/graphql',
          websocket: 'ws://localhost:4000/graphql',
          grpc: 'http://localhost:8080'
        },
        dubheMetadata: {
          schemas: ['Counter'],
          systems: ['counter_system']
        },
        dubheSchemaId: '0x456',
        options: {
          enableBatchOptimization: true,
          cacheTimeout: 10000,
          debounceMs: 200,
          reconnectOnError: true
        }
      };

      const client = createClient(fullConfig);

      expect(client).toBeDefined();
      expect(client.dubheSchemaId).toBe('0x456');
      expect(client.options?.enableBatchOptimization).toBe(true);
      expect(client.options?.cacheTimeout).toBe(10000);
    });

    it('should use default endpoints when not provided', () => {
      const client = createClient(validConfig);

      // The GraphQL and gRPC clients should be created with default endpoints
      expect(client.graphqlClient).toBeDefined();
      expect(client.grpcClient).toBeDefined();
    });

    it('should return address from contract', () => {
      const client = createClient(validConfig);

      expect(client.address).toBe(
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      );
    });
  });

  describe('Configuration validation', () => {
    it('should throw error when network is missing', () => {
      const invalidConfig = {
        packageId: '0x123',
        metadata: mockMetadata
      } as ClientConfig;

      expect(() => createClient(invalidConfig)).toThrow('ClientConfig: network is required');
    });

    it('should throw error when packageId is missing', () => {
      const invalidConfig = {
        network: 'devnet',
        metadata: mockMetadata
      } as ClientConfig;

      expect(() => createClient(invalidConfig)).toThrow('ClientConfig: packageId is required');
    });

    it('should throw error when metadata is missing', () => {
      const invalidConfig = {
        network: 'devnet',
        packageId: '0x123'
      } as ClientConfig;

      expect(() => createClient(invalidConfig)).toThrow('ClientConfig: metadata is required');
    });
  });

  describe('Options handling', () => {
    it('should use default options when not provided', () => {
      const client = createClient(validConfig);

      // Default options should be applied in the ecsWorld creation
      expect(client.ecsWorld).toBeDefined();
    });

    it('should respect custom options', () => {
      const configWithOptions: ClientConfig = {
        ...validConfig,
        options: {
          enableBatchOptimization: false,
          cacheTimeout: 15000,
          debounceMs: 500,
          reconnectOnError: false
        }
      };

      const client = createClient(configWithOptions);

      expect(client.options).toEqual({
        enableBatchOptimization: false,
        cacheTimeout: 15000,
        debounceMs: 500,
        reconnectOnError: false
      });
    });
  });
});

describe('isNetworkType', () => {
  it('should return true for valid network types', () => {
    expect(isNetworkType('mainnet')).toBe(true);
    expect(isNetworkType('testnet')).toBe(true);
    expect(isNetworkType('devnet')).toBe(true);
    expect(isNetworkType('localnet')).toBe(true);
  });

  it('should return false for invalid network types', () => {
    expect(isNetworkType('invalid')).toBe(false);
    expect(isNetworkType('production')).toBe(false);
    expect(isNetworkType('')).toBe(false);
    expect(isNetworkType('MAINNET')).toBe(false); // Case sensitive
  });
});

describe('validateClientConfig', () => {
  const mockMetadata = {
    name: 'test-package',
    version: '1.0.0',
    schemas: {}
  };

  it('should validate correct config without throwing', () => {
    const validConfig: Partial<ClientConfig> = {
      network: 'devnet',
      packageId: '0x123',
      metadata: mockMetadata
    };

    expect(() => validateClientConfig(validConfig)).not.toThrow();
  });

  it('should throw when network is missing', () => {
    const config = {
      packageId: '0x123',
      metadata: mockMetadata
    };

    expect(() => validateClientConfig(config)).toThrow(
      'ClientConfig validation failed: network is required'
    );
  });

  it('should throw when network type is invalid', () => {
    const config = {
      network: 'invalid-network' as ClientConfig['network'],
      packageId: '0x123',
      metadata: mockMetadata
    };

    expect(() => validateClientConfig(config)).toThrow(
      'ClientConfig validation failed: invalid network type'
    );
  });

  it('should throw when packageId is missing', () => {
    const config: Partial<ClientConfig> = {
      network: 'devnet',
      metadata: mockMetadata
    };

    expect(() => validateClientConfig(config)).toThrow(
      'ClientConfig validation failed: packageId is required'
    );
  });

  it('should throw when packageId is empty string', () => {
    const config: Partial<ClientConfig> = {
      network: 'devnet',
      packageId: '   ',
      metadata: mockMetadata
    };

    expect(() => validateClientConfig(config)).toThrow(
      'ClientConfig validation failed: packageId must be a non-empty string'
    );
  });

  it('should throw when metadata is missing', () => {
    const config: Partial<ClientConfig> = {
      network: 'devnet',
      packageId: '0x123'
    };

    expect(() => validateClientConfig(config)).toThrow(
      'ClientConfig validation failed: metadata is required'
    );
  });
});
