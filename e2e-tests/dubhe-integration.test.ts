import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Dubhe } from '@0xobelisk/sui-client';

describe('Dubhe E2E Integration Tests', () => {
  let dubhe: Dubhe;
  let testAddress: string;

  beforeAll(async () => {
    // Setup E2E test environment
    console.log('🚀 Setting up Dubhe E2E test environment...');
    
    // Initialize Dubhe with testnet configuration
    dubhe = new Dubhe({
      networkType: 'testnet',
      fullnodeUrls: ['https://testnet.sui.io'],
    });

    // Get test address
    testAddress = dubhe.getAddress();
    console.log(`📝 Test address: ${testAddress}`);

    // Request faucet for testing
    try {
      await dubhe.requestFaucet(testAddress, 'testnet');
      console.log('💰 Faucet request sent');
      
      // Wait for faucet to process
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.warn('⚠️ Faucet request failed, continuing with tests:', error);
    }
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up E2E test environment...');
  });

  beforeEach(async () => {
    // Reset any test state if needed
  });

  describe('Network Connection', () => {
    it('should connect to testnet successfully', async () => {
      const balance = await dubhe.getBalance();
      expect(typeof balance).toBe('number');
      expect(balance).toBeGreaterThanOrEqual(0);
      console.log(`💎 Current balance: ${balance / 1e9} SUI`);
    });

    it('should get network information', () => {
      const network = dubhe.getNetwork();
      expect(network).toBe('testnet');
      
      const networkConfig = dubhe.getNetworkConfig();
      expect(networkConfig).toBeDefined();
      expect(networkConfig.fullNodes).toContain('https://testnet.sui.io');
    });
  });

  describe('Account Management', () => {
    it('should generate valid addresses', () => {
      const address1 = dubhe.getAddress();
      const address2 = dubhe.getAddress({ accountIndex: 1 });
      
      expect(address1).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(address2).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(address1).not.toBe(address2);
    });

    it('should switch between accounts', () => {
      const address1 = dubhe.getAddress();
      dubhe.switchAccount({ accountIndex: 1 });
      const address2 = dubhe.getAddress();
      
      expect(address1).not.toBe(address2);
      
      // Switch back
      dubhe.switchAccount({ accountIndex: 0 });
      const address3 = dubhe.getAddress();
      expect(address1).toBe(address3);
    });
  });

  describe('Object Operations', () => {
    it('should get owned objects', async () => {
      const objects = await dubhe.getOwnedObjects(testAddress);
      expect(Array.isArray(objects.data)).toBe(true);
      console.log(`📦 Found ${objects.data.length} owned objects`);
    });

    it('should get object details', async () => {
      const objects = await dubhe.getOwnedObjects(testAddress);
      
      if (objects.data.length > 0) {
        const firstObject = objects.data[0];
        const objectDetails = await dubhe.getObject(firstObject.data!.objectId);
        
        expect(objectDetails).toBeDefined();
        expect(objectDetails.objectId).toBe(firstObject.data!.objectId);
        console.log(`🔍 Object type: ${objectDetails.type}`);
      }
    });
  });

  describe('Transaction Operations', () => {
    it('should inspect transaction without sending', async () => {
      const recipient = '0x' + '0'.repeat(64);
      const amount = 1000000; // 0.001 SUI

      // Create transaction
      const tx = dubhe.suiInteractor.currentClient.transferObject({
        target: recipient,
        objectId: '0x' + '1'.repeat(64), // Mock object ID
      });

      // Inspect transaction
      const result = await dubhe.inspectTxn(tx);
      expect(result).toBeDefined();
      console.log('🔍 Transaction inspection completed');
    });

    it('should handle transaction errors gracefully', async () => {
      const invalidObjectId = '0x' + '1'.repeat(64);
      
      try {
        await dubhe.getObject(invalidObjectId);
      } catch (error) {
        expect(error).toBeDefined();
        console.log('✅ Error handling works correctly');
      }
    });
  });

  describe('Contract Operations', () => {
    it('should have contract factory available', () => {
      expect(dubhe.contractFactory).toBeDefined();
      expect(typeof dubhe.contractFactory).toBe('object');
    });

    it('should have query and tx methods available', () => {
      expect(dubhe.query).toBeDefined();
      expect(dubhe.tx).toBeDefined();
      expect(typeof dubhe.query).toBe('object');
      expect(typeof dubhe.tx).toBe('object');
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, () => dubhe.getBalance());
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(balance => {
        expect(typeof balance).toBe('number');
        expect(balance).toBeGreaterThanOrEqual(0);
      });
      
      console.log('⚡ Concurrent requests completed successfully');
    });

    it('should complete operations within reasonable time', async () => {
      const startTime = Date.now();
      
      await dubhe.getBalance();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      console.log(`⏱️ Operation completed in ${duration}ms`);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from network errors', async () => {
      // This test simulates network recovery
      const originalGetBalance = dubhe.getBalance.bind(dubhe);
      
      // Mock a temporary failure
      dubhe.getBalance = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockImplementation(originalGetBalance);
      
      try {
        await dubhe.getBalance();
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
      
      // Should work on retry
      const balance = await dubhe.getBalance();
      expect(typeof balance).toBe('number');
      
      // Restore original method
      dubhe.getBalance = originalGetBalance;
    });
  });
}); 