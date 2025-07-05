import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number;
  maxMetrics: number;
  flushInterval: number;
  enableMemoryTracking: boolean;
  enableCPUTracking: boolean;
  enableNetworkTracking: boolean;
}

export interface PerformanceReport {
  timestamp: number;
  duration: number;
  metrics: PerformanceMetric[];
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    memoryUsage: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
    cpuUsage: {
      user: number;
      system: number;
    };
  };
}

/**
 * Performance monitoring system for Dubhe
 */
export class PerformanceMonitor extends EventEmitter {
  private config: Required<PerformanceConfig>;
  private metrics: PerformanceMetric[] = [];
  private startTime: number;
  private requestCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];

  constructor(config?: Partial<PerformanceConfig>) {
    super();
    this.config = {
      enabled: config?.enabled !== false,
      sampleRate: config?.sampleRate || 1.0,
      maxMetrics: config?.maxMetrics || 10000,
      flushInterval: config?.flushInterval || 60000,
      enableMemoryTracking: config?.enableMemoryTracking !== false,
      enableCPUTracking: config?.enableCPUTracking !== false,
      enableNetworkTracking: config?.enableNetworkTracking !== false,
    };
    this.startTime = performance.now();

    if (this.config.enabled) {
      this.startPeriodicMonitoring();
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string = 'ms',
    tags?: Record<string, string>
  ): void {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      return;
    }

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);

    // Keep metrics under max limit
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics);
    }

    this.emit('metric', metric);
  }

  /**
   * Time a function execution
   */
  async timeFunction<T>(
    name: string,
    fn: () => T | Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.recordMetric(`${name}_duration`, duration, 'ms', tags);
      this.recordMetric(`${name}_success`, 1, 'count', tags);
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.recordMetric(`${name}_duration`, duration, 'ms', tags);
      this.recordMetric(`${name}_error`, 1, 'count', tags);
      
      throw error;
    }
  }

  /**
   * Monitor HTTP request performance
   */
  monitorRequest(
    method: string,
    url: string,
    startTime: number,
    endTime: number,
    statusCode: number,
    responseSize?: number
  ): void {
    const duration = endTime - startTime;
    const tags = {
      method,
      url,
      statusCode: statusCode.toString(),
    };

    this.recordMetric('http_request_duration', duration, 'ms', tags);
    this.recordMetric('http_request_count', 1, 'count', tags);

    if (responseSize) {
      this.recordMetric('http_response_size', responseSize, 'bytes', tags);
    }

    if (statusCode >= 400) {
      this.recordMetric('http_error_count', 1, 'count', tags);
      this.errorCount++;
    }

    this.requestCount++;
    this.responseTimes.push(duration);

    // Keep only last 1000 response times for statistics
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  /**
   * Monitor memory usage
   */
  recordMemoryUsage(): void {
    if (!this.config.enableMemoryTracking) return;

    const memUsage = process.memoryUsage();
    
    this.recordMetric('memory_heap_used', memUsage.heapUsed, 'bytes');
    this.recordMetric('memory_heap_total', memUsage.heapTotal, 'bytes');
    this.recordMetric('memory_external', memUsage.external, 'bytes');
    this.recordMetric('memory_rss', memUsage.rss, 'bytes');
    
    // Calculate memory usage percentage
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    this.recordMetric('memory_heap_usage_percent', heapUsagePercent, 'percent');
  }

  /**
   * Monitor CPU usage
   */
  recordCPUUsage(): void {
    if (!this.config.enableCPUTracking) return;

    const cpuUsage = process.cpuUsage();
    
    this.recordMetric('cpu_user', cpuUsage.user, 'microseconds');
    this.recordMetric('cpu_system', cpuUsage.system, 'microseconds');
    this.recordMetric('cpu_total', cpuUsage.user + cpuUsage.system, 'microseconds');
  }

  /**
   * Monitor event loop lag
   */
  recordEventLoopLag(): void {
    const start = performance.now();
    
    setImmediate(() => {
      const lag = performance.now() - start;
      this.recordMetric('event_loop_lag', lag, 'ms');
    });
  }

  /**
   * Monitor garbage collection
   */
  startGCMonitoring(): void {
    if (!this.config.enableMemoryTracking) return;

    const gc = require('perf_hooks').performance?.eventLoopUtilization;
    if (gc) {
      setInterval(() => {
        const utilization = gc();
        this.recordMetric('event_loop_utilization', utilization.utilization, 'ratio');
      }, 1000);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): PerformanceReport {
    const now = Date.now();
    const duration = now - this.startTime;

    // Calculate response time percentiles
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    const averageResponseTime = sortedTimes.length > 0
      ? sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length
      : 0;

    const p95ResponseTime = sortedTimes[p95Index] || 0;
    const p99ResponseTime = sortedTimes[p99Index] || 0;

    const errorRate = this.requestCount > 0
      ? (this.errorCount / this.requestCount) * 100
      : 0;

    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      timestamp: now,
      duration,
      metrics: [...this.metrics],
      summary: {
        totalRequests: this.requestCount,
        averageResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        errorRate,
        memoryUsage: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss,
        },
        cpuUsage: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
      },
    };
  }

  /**
   * Start periodic monitoring
   */
  private startPeriodicMonitoring(): void {
    // Memory monitoring
    if (this.config.enableMemoryTracking) {
      setInterval(() => {
        this.recordMemoryUsage();
      }, 5000);
    }

    // CPU monitoring
    if (this.config.enableCPUTracking) {
      setInterval(() => {
        this.recordCPUUsage();
      }, 1000);
    }

    // Event loop lag monitoring
    setInterval(() => {
      this.recordEventLoopLag();
    }, 1000);

    // Periodic flush
    setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Flush metrics (send to external systems)
   */
  flush(): void {
    const stats = this.getStats();
    this.emit('flush', stats);
    
    // Clear old metrics after flush
    const cutoff = Date.now() - (this.config.flushInterval * 2);
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff);
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = [];
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
    this.startTime = performance.now();
  }
}

/**
 * Performance monitoring middleware for Express
 */
export function performanceMiddleware(monitor: PerformanceMonitor) {
  return (req: any, res: any, next: any) => {
    const startTime = performance.now();
    const originalSend = res.send;

    res.send = function(data: any) {
      const endTime = performance.now();
      const responseSize = typeof data === 'string' ? data.length : JSON.stringify(data).length;
      
      monitor.monitorRequest(
        req.method,
        req.url,
        startTime,
        endTime,
        res.statusCode,
        responseSize
      );

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Performance monitoring for GraphQL
 */
export function graphQLPerformancePlugin(monitor: PerformanceMonitor) {
  return {
    requestDidStart: async (requestContext: any) => {
      const startTime = performance.now();
      const operationName = requestContext.request.operationName || 'anonymous';
      const query = requestContext.request.query;

      return {
        willSendResponse: async (responseContext: any) => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          monitor.recordMetric('graphql_query_duration', duration, 'ms', {
            operation: operationName,
            hasErrors: responseContext.response.errors ? 'true' : 'false',
          });

          if (responseContext.response.errors) {
            monitor.recordMetric('graphql_error_count', 1, 'count', {
              operation: operationName,
            });
          }
        },
      };
    },
  };
} 