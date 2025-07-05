import { Dubhe } from '@0xobelisk/sui-client';
import { BenchmarkUtils, PerformanceBenchmark } from './performance';

/**
 * Dubhe-specific performance benchmarks
 */
export class DubheBenchmarks {
  private benchmark: PerformanceBenchmark;

  constructor() {
    this.benchmark = new PerformanceBenchmark();
  }

  /**
   * Benchmark Dubhe client initialization
   */
  async benchmarkClientInit(): Promise<void> {
    console.log('🔧 Benchmarking Dubhe client initialization...');
    
    await this.benchmark.benchmarkSync('Client Initialization', () => {
      new Dubhe({
        networkType: 'testnet',
        fullnodeUrls: ['https://testnet.sui.io'],
      });
    }, { iterations: 100 });
  }

  /**
   * Benchmark address generation
   */
  async benchmarkAddressGeneration(): Promise<void> {
    console.log('📍 Benchmarking address generation...');
    
    const dubhe = new Dubhe({
      networkType: 'testnet',
      fullnodeUrls: ['https://testnet.sui.io'],
    });

    await this.benchmark.benchmarkSync('Address Generation', () => {
      dubhe.getAddress();
    }, { iterations: 1000 });
  }

  /**
   * Benchmark balance queries
   */
  async benchmarkBalanceQueries(): Promise<void> {
    console.log('💰 Benchmarking balance queries...');
    
    const dubhe = new Dubhe({
      networkType: 'testnet',
      fullnodeUrls: ['https://testnet.sui.io'],
    });

    const address = dubhe.getAddress();

    await this.benchmark.benchmarkAsync('Balance Query', async () => {
      await dubhe.getBalance(address);
    }, { iterations: 50 });
  }

  /**
   * Benchmark object queries
   */
  async benchmarkObjectQueries(): Promise<void> {
    console.log('📦 Benchmarking object queries...');
    
    const dubhe = new Dubhe({
      networkType: 'testnet',
      fullnodeUrls: ['https://testnet.sui.io'],
    });

    // Mock object ID for testing
    const mockObjectId = '0x' + '1'.repeat(64);

    await this.benchmark.benchmarkAsync('Object Query', async () => {
      try {
        await dubhe.getObject(mockObjectId);
      } catch (error) {
        // Expected to fail with mock ID, but we're measuring the request time
      }
    }, { iterations: 50 });
  }

  /**
   * Benchmark transaction operations
   */
  async benchmarkTransactionOps(): Promise<void> {
    console.log('📝 Benchmarking transaction operations...');
    
    const dubhe = new Dubhe({
      networkType: 'testnet',
      fullnodeUrls: ['https://testnet.sui.io'],
    });

    // Benchmark transaction inspection
    await this.benchmark.benchmarkSync('Transaction Inspection', () => {
      const recipient = '0x' + '0'.repeat(64);
      const tx = dubhe.suiInteractor.currentClient.transferObject({
        target: recipient,
        objectId: '0x' + '1'.repeat(64),
      });
      dubhe.inspectTxn(tx);
    }, { iterations: 100 });
  }

  /**
   * Benchmark memory usage patterns
   */
  async benchmarkMemoryUsage(): Promise<void> {
    console.log('🧠 Benchmarking memory usage...');
    
    await BenchmarkUtils.benchmarkMemory('Large Object Creation', () => {
      const largeArray = new Array(10000).fill(0).map((_, i) => ({
        id: i,
        data: 'x'.repeat(100),
        timestamp: Date.now(),
      }));
      return largeArray;
    }, 100);
  }

  /**
   * Benchmark concurrent operations
   */
  async benchmarkConcurrentOps(): Promise<void> {
    console.log('⚡ Benchmarking concurrent operations...');
    
    const dubhe = new Dubhe({
      networkType: 'testnet',
      fullnodeUrls: ['https://testnet.sui.io'],
    });

    await this.benchmark.benchmarkAsync('Concurrent Balance Queries', async () => {
      const promises = Array.from({ length: 10 }, () => 
        dubhe.getBalance(dubhe.getAddress())
      );
      await Promise.all(promises);
    }, { iterations: 20 });
  }

  /**
   * Benchmark network operations
   */
  async benchmarkNetworkOps(): Promise<void> {
    console.log('🌐 Benchmarking network operations...');
    
    await BenchmarkUtils.benchmarkAPI('GraphQL Query', async () => {
      return fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: '{ __schema { types { name } } }',
        }),
      });
    }, 30);
  }

  /**
   * Run all Dubhe benchmarks
   */
  async runAllBenchmarks(): Promise<void> {
    console.log('🚀 Starting Dubhe performance benchmarks...\n');

    try {
      await this.benchmarkClientInit();
      await this.benchmarkAddressGeneration();
      await this.benchmarkBalanceQueries();
      await this.benchmarkObjectQueries();
      await this.benchmarkTransactionOps();
      await this.benchmarkMemoryUsage();
      await this.benchmarkConcurrentOps();
      await this.benchmarkNetworkOps();

      console.log('\n📊 Benchmark Results:');
      console.log(this.benchmark.generateReport());

      // Save results to file
      const fs = await import('fs/promises');
      const report = this.benchmark.generateReport();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await fs.writeFile(
        `dubhe-benchmark-report-${timestamp}.md`,
        report
      );

      console.log(`\n✅ Benchmark report saved to: dubhe-benchmark-report-${timestamp}.md`);
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      throw error;
    }
  }

  /**
   * Run specific benchmark suite
   */
  async runBenchmarkSuite(suiteName: string): Promise<void> {
    console.log(`🎯 Running benchmark suite: ${suiteName}`);

    switch (suiteName.toLowerCase()) {
      case 'client':
        await this.benchmarkClientInit();
        await this.benchmarkAddressGeneration();
        break;
      case 'queries':
        await this.benchmarkBalanceQueries();
        await this.benchmarkObjectQueries();
        break;
      case 'transactions':
        await this.benchmarkTransactionOps();
        break;
      case 'memory':
        await this.benchmarkMemoryUsage();
        break;
      case 'network':
        await this.benchmarkNetworkOps();
        break;
      case 'concurrent':
        await this.benchmarkConcurrentOps();
        break;
      default:
        throw new Error(`Unknown benchmark suite: ${suiteName}`);
    }

    console.log('\n📊 Suite Results:');
    console.log(this.benchmark.generateReport());
  }
} 