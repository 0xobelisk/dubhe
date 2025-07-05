#!/usr/bin/env tsx

import { PerformanceMonitor } from './performance';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const monitor = new PerformanceMonitor({
    enabled: true,
    enableMemoryTracking: true,
    enableCPUTracking: true,
  });

  try {
    switch (command) {
      case '--report':
        const stats = monitor.getStats();
        console.log('📊 Performance Report');
        console.log('===================');
        console.log(`Total Requests: ${stats.summary.totalRequests}`);
        console.log(`Average Response Time: ${stats.summary.averageResponseTime.toFixed(2)}ms`);
        console.log(`P95 Response Time: ${stats.summary.p95ResponseTime.toFixed(2)}ms`);
        console.log(`P99 Response Time: ${stats.summary.p99ResponseTime.toFixed(2)}ms`);
        console.log(`Error Rate: ${stats.summary.errorRate.toFixed(2)}%`);
        console.log(`Memory Usage: ${(stats.summary.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
        console.log(`CPU Usage: ${(stats.summary.cpuUsage.user / 1000000).toFixed(2)}s`);
        break;

      case '--dashboard':
        console.log('🚀 Starting monitoring dashboard...');
        console.log('📈 Prometheus: http://localhost:9090');
        console.log('📊 Grafana: http://localhost:3000');
        console.log('Press Ctrl+C to stop');
        
        // Start monitoring
        monitor.on('metric', (metric) => {
          console.log(`📊 ${metric.name}: ${metric.value}${metric.unit}`);
        });

        monitor.on('flush', (stats) => {
          console.log('🔄 Metrics flushed:', stats.summary);
        });

        // Keep the process running
        process.on('SIGINT', () => {
          console.log('\n🛑 Stopping monitoring...');
          process.exit(0);
        });

        // Keep alive
        setInterval(() => {}, 1000);
        break;

      case '--help':
      case '-h':
        console.log(`
Dubhe Performance Monitoring Tool

Usage:
  pnpm performance:monitor              # Start monitoring
  pnpm performance:report               # Generate performance report
  pnpm performance:dashboard            # Start monitoring dashboard

Commands:
  --report      Generate performance report
  --dashboard   Start monitoring dashboard
  --help        Show this help message

Examples:
  pnpm performance:monitor
  pnpm performance:report
  pnpm performance:dashboard
        `);
        break;

      default:
        console.log('🔍 Starting performance monitoring...');
        console.log('Press Ctrl+C to stop');
        
        // Start monitoring
        monitor.on('metric', (metric) => {
          console.log(`📊 ${metric.name}: ${metric.value}${metric.unit}`);
        });

        // Keep the process running
        process.on('SIGINT', () => {
          console.log('\n🛑 Stopping monitoring...');
          process.exit(0);
        });

        // Keep alive
        setInterval(() => {}, 1000);
        break;
    }
  } catch (error) {
    console.error('❌ Monitoring failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 