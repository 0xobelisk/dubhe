import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Dubhe } from '../src/dubhe';

// Mock dependencies
jest.mock('@mysten/sui/client');
jest.mock('@mysten/sui/transactions');
jest.mock('@mysten/bcs');

describe('Dubhe', () => {
  let dubhe: Dubhe;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create new Dubhe instance for each test
    dubhe = new Dubhe({
      networkType: 'testnet',
      fullnodeUrls: ['https://testnet.sui.io'],
    });
  });

  describe('constructor', () => {
    it('should create a Dubhe instance with default configuration', () => {
      expect(dubhe).toBeInstanceOf(Dubhe);
      expect(dubhe.accountManager).toBeDefined();
      expect(dubhe.suiInteractor).toBeDefined();
      expect(dubhe.contractFactory).toBeDefined();
    });

    it('should create a Dubhe instance with custom configuration', () => {
      const customDubhe = new Dubhe({
        networkType: 'mainnet',
        fullnodeUrls: ['https://mainnet.sui.io'],
        packageId: '0x123',
      });

      expect(customDubhe).toBeInstanceOf(Dubhe);
      expect(customDubhe.packageId).toBe('0x123');
    });
  });

  describe('getAddress', () => {
    it('should return the current address', () => {
      const address = dubhe.getAddress();
      expect(typeof address).toBe('string');
      expect(address).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should return address with custom derive path', () => {
      const address = dubhe.getAddress({
        accountIndex: 1,
        change: 0,
        addressIndex: 0,
      });
      expect(typeof address).toBe('string');
      expect(address).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe('getBalance', () => {
    it('should return SUI balance', async () => {
      const balance = await dubhe.getBalance();
      expect(typeof balance).toBe('number');
      expect(balance).toBeGreaterThanOrEqual(0);
    });

    it('should return custom coin balance', async () => {
      const balance = await dubhe.getBalance('0x2::sui::SUI');
      expect(typeof balance).toBe('number');
      expect(balance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('requestFaucet', () => {
    it('should request faucet for testnet', async () => {
      const address = dubhe.getAddress();
      await expect(dubhe.requestFaucet(address, 'testnet')).resolves.not.toThrow();
    });
  });

  describe('transferSui', () => {
    it('should transfer SUI to another address', async () => {
      const recipient = '0x' + '0'.repeat(64);
      const amount = 1000000; // 0.001 SUI

      // Mock the transaction
      const mockTx = {
        signAndSend: jest.fn().mockResolvedValue({
          digest: '0x' + 'a'.repeat(64),
        }),
      };

      jest.spyOn(dubhe, 'signAndSendTxn').mockResolvedValue({
        digest: '0x' + 'a'.repeat(64),
      } as any);

      await expect(dubhe.transferSui(recipient, amount)).resolves.not.toThrow();
    });
  });

  describe('getObject', () => {
    it('should get object by ID', async () => {
      const objectId = '0x' + '1'.repeat(64);
      
      // Mock the response
      const mockObject = {
        objectId,
        version: '1',
        digest: '0x' + 'b'.repeat(64),
        type: '0x2::coin::Coin<0x2::sui::SUI>',
        content: {
          dataType: 'moveObject',
          fields: {
            balance: '1000000',
          },
        },
      };

      jest.spyOn(dubhe.suiInteractor, 'getObject').mockResolvedValue(mockObject as any);

      const result = await dubhe.getObject(objectId);
      expect(result).toEqual(mockObject);
    });
  });

  describe('waitForTransaction', () => {
    it('should wait for transaction completion', async () => {
      const digest = '0x' + 'c'.repeat(64);
      
      // Mock the response
      const mockTxResponse = {
        digest,
        transaction: {
          data: {
          },
        },
        effects: {
          status: {
            status: 'success',
          },
        },
      };

      jest.spyOn(dubhe.suiInteractor, 'waitForTransaction').mockResolvedValue(mockTxResponse as any);

      const result = await dubhe.waitForTransaction(digest);
      expect(result).toEqual(mockTxResponse);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockError = new Error('Network error');
      jest.spyOn(dubhe.suiInteractor, 'getObject').mockRejectedValue(mockError);

      await expect(dubhe.getObject('0x' + '1'.repeat(64))).rejects.toThrow('Network error');
    });

    it('should handle invalid addresses', () => {
      expect(() => {
        dubhe.getAddress({ accountIndex: -1 });
      }).toThrow();
    });
  });

  describe('query and tx methods', () => {
    it('should have query methods available', () => {
      expect(dubhe.query).toBeDefined();
      expect(typeof dubhe.query).toBe('object');
    });

    it('should have tx methods available', () => {
      expect(dubhe.tx).toBeDefined();
      expect(typeof dubhe.tx).toBe('object');
    });

    it('should have object methods available', () => {
      expect(dubhe.object).toBeDefined();
      expect(typeof dubhe.object).toBe('object');
    });
  });
}); 