import { Dubhe } from '../dubhe';

describe('Dubhe Client', () => {
  let dubhe: Dubhe;

  beforeEach(() => {
    dubhe = new Dubhe({
      network: 'testnet',
      rpcUrl: 'https://fullnode.testnet.sui.io',
      graphqlUrl: 'https://sui-testnet.mystenlabs.com/graphql',
    });
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(dubhe.config.network).toBe('testnet');
      expect(dubhe.config.rpcUrl).toBe('https://fullnode.testnet.sui.io');
      expect(dubhe.config.graphqlUrl).toBe(
        'https://sui-testnet.mystenlabs.com/graphql'
      );
    });

    it('should set default values for optional config', () => {
      const dubheWithDefaults = new Dubhe({
        network: 'mainnet',
      });

      expect(dubheWithDefaults.config.rpcUrl).toBeDefined();
      expect(dubheWithDefaults.config.graphqlUrl).toBeDefined();
    });
  });

  describe('Network Configuration', () => {
    it('should support mainnet configuration', () => {
      const mainnetDubhe = new Dubhe({ network: 'mainnet' });
      expect(mainnetDubhe.config.network).toBe('mainnet');
    });

    it('should support testnet configuration', () => {
      const testnetDubhe = new Dubhe({ network: 'testnet' });
      expect(testnetDubhe.config.network).toBe('testnet');
    });

    it('should support devnet configuration', () => {
      const devnetDubhe = new Dubhe({ network: 'devnet' });
      expect(devnetDubhe.config.network).toBe('devnet');
    });
  });

  describe('Client Methods', () => {
    it('should have getNetwork method', () => {
      expect(typeof dubhe.getNetwork).toBe('function');
      expect(dubhe.getNetwork()).toBe('testnet');
    });

    it('should have getRpcUrl method', () => {
      expect(typeof dubhe.getRpcUrl).toBe('function');
      expect(dubhe.getRpcUrl()).toBe('https://fullnode.testnet.sui.io');
    });

    it('should have getGraphqlUrl method', () => {
      expect(typeof dubhe.getGraphqlUrl).toBe('function');
      expect(dubhe.getGraphqlUrl()).toBe(
        'https://sui-testnet.mystenlabs.com/graphql'
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid network', () => {
      expect(() => {
        new Dubhe({ network: 'invalid' as any });
      }).toThrow();
    });

    it('should validate required configuration', () => {
      expect(() => {
        new Dubhe({} as any);
      }).toThrow();
    });
  });
});
