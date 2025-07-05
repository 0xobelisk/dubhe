import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface BenchmarkResult {
  name: string;
  duration: number;
  memory: number;
  iterations: number;
  average: number;
  min: number;
  max: number;
  standardDeviation: number;
}

export interface BenchmarkOptions {
  iterations?: number;
  warmup?: number;
  timeout?: number;
  memoryTracking?: boolean;
}

export class PerformanceBenchmark extends EventEmitter {
  private results: BenchmarkResult[] = [];
  private options: Required<BenchmarkOptions>;

  constructor(options: BenchmarkOptions = {}) {
    super();
    this.options = {
      iterations: options.iterations || 1000,
      warmup: options.warmup || 100,
      timeout: options.timeout || 30000,
      memoryTracking: options.memoryTracking !== false,
    };
  }

  /**
   * Benchmark a synchronous function
   */
  async benchmarkSync(
    name: string,
    fn: () => void,
    options?: BenchmarkOptions
  ): Promise<BenchmarkResult> {
    const opts = { ...this.options, ...options };
    const durations: number[] = [];
    const memoryUsage: number[] = [];

    // Warmup phase
    for (let i = 0; i < opts.warmup; i++) {
      fn();
    }

    // Benchmark phase
    const startTime = performance.now();
    for (let i = 0; i < opts.iterations; i++) {
      const memBefore = process.memoryUsage();
      const iterationStart = performance.now();
      
      fn();
      
      const iterationEnd = performance.now();
      const memAfter = process.memoryUsage();
      
      durations.push(iterationEnd - iterationStart);
      if (opts.memoryTracking) {
        memoryUsage.push(memAfter.heapUsed - memBefore.heapUsed);
      }

      // Check timeout
      if (performance.now() - startTime > opts.timeout) {
        break;
      }
    }

    const result = this.calculateStats(name, durations, memoryUsage);
    this.results.push(result);
    this.emit('result', result);
    
    return result;
  }

  /**
   * Benchmark an asynchronous function
   */
  async benchmarkAsync(
    name: string,
    fn: () => Promise<void>,
    options?: BenchmarkOptions
  ): Promise<BenchmarkResult> {
    const opts = { ...this.options, ...options };
    const durations: number[] = [];
    const memoryUsage: number[] = [];

    // Warmup phase
    for (let i = 0; i < opts.warmup; i++) {
      await fn();
    }

    // Benchmark phase
    const startTime = performance.now();
    for (let i = 0; i < opts.iterations; i++) {
      const memBefore = process.memoryUsage();
      const iterationStart = performance.now();
      
      await fn();
      
      const iterationEnd = performance.now();
      const memAfter = process.memoryUsage();
      
      durations.push(iterationEnd - iterationStart);
      if (opts.memoryTracking) {
        memoryUsage.push(memAfter.heapUsed - memBefore.heapUsed);
      }

      // Check timeout
      if (performance.now() - startTime > opts.timeout) {
        break;
      }
    }

    const result = this.calculateStats(name, durations, memoryUsage);
    this.results.push(result);
    this.emit('result', result);
    
    return result;
  }

  /**
   * Benchmark multiple functions and compare them
   */
  async benchmarkSuite(
    tests: Array<{
      name: string;
      fn: () => void | Promise<void>;
      options?: BenchmarkOptions;
    }>
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];
    
    for (const test of tests) {
      const result = await this.benchmarkSync(test.name, test.fn as () => void, test.options);
      results.push(result);
    }

    this.emit('suite-complete', results);
    return results;
  }

  /**
   * Calculate statistical information
   */
  private calculateStats(
    name: string,
    durations: number[],
    memoryUsage: number[]
  ): BenchmarkResult {
    const sorted = durations.sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const average = sum / sorted.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    
    // Calculate standard deviation
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / sorted.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate memory usage
    const memory = memoryUsage.length > 0 
      ? memoryUsage.reduce((acc, val) => acc + val, 0) / memoryUsage.length
      : 0;

    return {
      name,
      duration: sum,
      memory,
      iterations: sorted.length,
      average,
      min,
      max,
      standardDeviation,
    };
  }

  /**
   * Get all benchmark results
   */
  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Generate a performance report
   */
  generateReport(): string {
    if (this.results.length === 0) {
      return 'No benchmark results available.';
    }

    let report = '# Performance Benchmark Report\n\n';
    report += `Generated on: ${new Date().toISOString()}\n\n`;

    // Sort by average duration
    const sorted = [...this.results].sort((a, b) => a.average - b.average);

    report += '## Results Summary\n\n';
    report += '| Name | Avg (ms) | Min (ms) | Max (ms) | Std Dev | Memory (bytes) |\n';
    report += '|------|----------|----------|----------|---------|----------------|\n';

    for (const result of sorted) {
      report += `| ${result.name} | ${result.average.toFixed(3)} | ${result.min.toFixed(3)} | ${result.max.toFixed(3)} | ${result.standardDeviation.toFixed(3)} | ${result.memory.toFixed(0)} |\n`;
    }

    report += '\n## Detailed Results\n\n';
    for (const result of sorted) {
      report += `### ${result.name}\n\n`;
      report += `- **Average**: ${result.average.toFixed(3)}ms\n`;
      report += `- **Minimum**: ${result.min.toFixed(3)}ms\n`;
      report += `- **Maximum**: ${result.max.toFixed(3)}ms\n`;
      report += `- **Standard Deviation**: ${result.standardDeviation.toFixed(3)}ms\n`;
      report += `- **Iterations**: ${result.iterations}\n`;
      report += `- **Total Duration**: ${result.duration.toFixed(3)}ms\n`;
      report += `- **Memory Usage**: ${result.memory.toFixed(0)} bytes\n\n`;
    }

    return report;
  }
}

/**
 * Utility functions for common benchmarking scenarios
 */
export class BenchmarkUtils {
  /**
   * Benchmark database operations
   */
  static async benchmarkDatabase(
    name: string,
    operation: () => Promise<void>,
    iterations = 100
  ): Promise<BenchmarkResult> {
    const benchmark = new PerformanceBenchmark({ iterations });
    return await benchmark.benchmarkAsync(name, operation);
  }

  /**
   * Benchmark API endpoints
   */
  static async benchmarkAPI(
    name: string,
    request: () => Promise<Response>,
    iterations = 50
  ): Promise<BenchmarkResult> {
    const benchmark = new PerformanceBenchmark({ iterations });
    return await benchmark.benchmarkAsync(name, async () => {
      const response = await request();
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
    });
  }

  /**
   * Benchmark memory usage
   */
  static async benchmarkMemory(
    name: string,
    operation: () => void,
    iterations = 1000
  ): Promise<BenchmarkResult> {
    const benchmark = new PerformanceBenchmark({ 
      iterations, 
      memoryTracking: true 
    });
    return await benchmark.benchmarkSync(name, operation);
  }

  /**
   * Benchmark CPU-intensive operations
   */
  static async benchmarkCPU(
    name: string,
    operation: () => void,
    iterations = 10000
  ): Promise<BenchmarkResult> {
    const benchmark = new PerformanceBenchmark({ iterations });
    return await benchmark.benchmarkSync(name, operation);
  }
} 