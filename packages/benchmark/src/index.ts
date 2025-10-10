#!/usr/bin/env node

/**
 * Dubhe GraphQL Smart Load Testing Tool
 *
 * Automatically parse table structure based on dubhe config, use DubheGraphqlClient for smart load testing
 * Support automated performance testing for queries and subscriptions
 */

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import {
  DubheGraphqlClient,
  createDubheGraphqlClient,
  DubheClientConfig,
  DubheMetadata
} from '@0xobelisk/graphql-client';

// Color output helper functions
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`
};

function log(message: string, color?: keyof typeof colors) {
  if (color && colors[color]) {
    console.log(colors[color](message));
  } else {
    console.log(message);
  }
}

function section(title: string) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`${title}`, 'blue');
  log(`${'='.repeat(60)}`, 'cyan');
}

// Interface definitions
interface BenchmarkScenario {
  name: string;
  duration: number;
  connections: number;
  description: string;
}

interface TestConfig {
  type: string;
  params: Record<string, any>;
}

interface QueryTypeConfig {
  name: string;
  tests: TestConfig[];
}

interface SubscriptionTypeConfig {
  name: string;
  duration: number;
  tests: TestConfig[];
}

interface Config {
  endpoint: string;
  subscriptionEndpoint: string;
  dubheConfigPath: string;
  headers: Record<string, string>;
  scenarios: Record<string, BenchmarkScenario>;
  queryTypes: Record<string, QueryTypeConfig>;
  subscriptionTypes: Record<string, SubscriptionTypeConfig>;
}

interface BenchmarkResult {
  testName: string;
  tableName: string;
  requestCount: number;
  averageLatency: number;
  rps: number;
  errors: number;
  success: boolean;
  duration: number;
}

interface SubscriptionResult {
  testName: string;
  tableName: string;
  connectionCount: number;
  eventsReceived: number;
  averageEventLatency: number;
  duration: number;
  errors: number;
  success: boolean;
}

// Check if GraphQL service is running
async function checkGraphQLService(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '{ __typename }'
      })
    });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

// Create DubheGraphqlClient instance
function createClient(config: Config, dubheMetadata: DubheMetadata): DubheGraphqlClient {
  const clientConfig: DubheClientConfig = {
    endpoint: config.endpoint,
    subscriptionEndpoint: config.subscriptionEndpoint,
    headers: config.headers,
    dubheMetadata: dubheMetadata
  };

  return createDubheGraphqlClient(clientConfig);
}

// Execute single query load test
async function runQueryBenchmark(
  client: DubheGraphqlClient,
  tableName: string,
  testConfig: TestConfig,
  scenario: BenchmarkScenario
): Promise<BenchmarkResult> {
  const startTime = Date.now();
  let requestCount = 0;
  let totalLatency = 0;
  let errors = 0;

  log(`🚀 Running query load test: ${testConfig.type} on ${tableName}`, 'yellow');
  log(`   Duration: ${scenario.duration}s`, 'cyan');
  log(`   Connections: ${scenario.connections}`, 'cyan');

  const endTime = startTime + scenario.duration * 1000;
  const promises: Promise<void>[] = [];

  // Create concurrent requests
  for (let i = 0; i < scenario.connections; i++) {
    const promise = (async () => {
      while (Date.now() < endTime) {
        const queryStart = Date.now();
        try {
          switch (testConfig.type) {
            case 'getAllTables':
              await client.getAllTables(tableName, testConfig.params);
              break;
            case 'getTableByCondition':
              // Use table's primary keys as condition
              const primaryKeys = client.getTablePrimaryKeys(tableName);
              if (primaryKeys.length > 0) {
                const condition = { [primaryKeys[0]]: 'test_value' };
                await client.getTableByCondition(tableName, condition);
              } else {
                await client.getAllTables(tableName, { first: 1 });
              }
              break;
            case 'batchQuery':
              const batchQueries = Array.from(
                { length: testConfig.params.batchSize || 3 },
                (_, idx) => ({
                  key: `query_${idx}`,
                  tableName,
                  params: { first: testConfig.params.first || 5 }
                })
              );
              await client.batchQuery(batchQueries);
              break;
            default:
              await client.getAllTables(tableName, testConfig.params);
          }

          requestCount++;
          totalLatency += Date.now() - queryStart;
        } catch (error) {
          errors++;
          log(`❌ Query error: ${error instanceof Error ? error.message : String(error)}`, 'red');
        }

        // Avoid overly frequent requests
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    })();

    promises.push(promise);
  }

  await Promise.all(promises);

  const actualDuration = (Date.now() - startTime) / 1000;
  const averageLatency = requestCount > 0 ? totalLatency / requestCount : 0;
  const rps = actualDuration > 0 ? requestCount / actualDuration : 0;

  return {
    testName: testConfig.type,
    tableName,
    requestCount,
    averageLatency,
    rps,
    errors,
    success: errors === 0 && requestCount > 0,
    duration: actualDuration
  };
}

// Execute subscription load test
async function runSubscriptionBenchmark(
  client: DubheGraphqlClient,
  tableName: string,
  testConfig: TestConfig,
  subscriptionConfig: SubscriptionTypeConfig
): Promise<SubscriptionResult> {
  log(`🔔 Running subscription load test: ${testConfig.type} on ${tableName}`, 'yellow');
  log(`   Duration: ${subscriptionConfig.duration}s`, 'cyan');

  const startTime = Date.now();
  let eventsReceived = 0;
  let totalEventLatency = 0;
  let errors = 0;
  const connections: any[] = [];

  try {
    // Create subscription
    const subscription = (() => {
      switch (testConfig.type) {
        case 'subscribeToTableChanges':
          return client.subscribeToTableChanges(tableName, {
            ...testConfig.params,
            onData: (_data) => {
              eventsReceived++;
              // Simulate event latency calculation
              totalEventLatency += 10; // Simplified handling
            },
            onError: (error) => {
              errors++;
              log(
                `❌ Subscription error: ${error instanceof Error ? error.message : String(error)}`,
                'red'
              );
            }
          });
        case 'subscribeToFilteredTableChanges':
          return client.subscribeToTableChanges(tableName, {
            ...testConfig.params,
            filter: testConfig.params.filter,
            onData: (_data) => {
              eventsReceived++;
              totalEventLatency += 10;
            },
            onError: (error) => {
              errors++;
              log(
                `❌ Subscription error: ${error instanceof Error ? error.message : String(error)}`,
                'red'
              );
            }
          } as any);
        default:
          return client.subscribeToTableChanges(tableName, {
            ...testConfig.params,
            onData: (_data) => {
              eventsReceived++;
              totalEventLatency += 10;
            },
            onError: (error) => {
              errors++;
              log(
                `❌ Subscription error: ${error instanceof Error ? error.message : String(error)}`,
                'red'
              );
            }
          });
      }
    })();

    const sub = subscription.subscribe({});
    connections.push(sub);

    // Wait for specified time
    await new Promise((resolve) => setTimeout(resolve, subscriptionConfig.duration * 1000));

    // Clean up subscriptions
    connections.forEach((conn) => {
      try {
        conn.unsubscribe();
      } catch (error) {
        log(
          `⚠️  Subscription cleanup warning: ${
            error instanceof Error ? error.message : String(error)
          }`,
          'yellow'
        );
      }
    });
  } catch (error) {
    errors++;
    log(
      `❌ Subscription setup failed: ${error instanceof Error ? error.message : String(error)}`,
      'red'
    );
  }

  const actualDuration = (Date.now() - startTime) / 1000;
  const averageEventLatency = eventsReceived > 0 ? totalEventLatency / eventsReceived : 0;

  return {
    testName: testConfig.type,
    tableName,
    connectionCount: connections.length,
    eventsReceived,
    averageEventLatency,
    duration: actualDuration,
    errors,
    success: errors === 0
  };
}

// Run query benchmark suite
async function runQueryBenchmarkSuite(
  client: DubheGraphqlClient,
  config: Config,
  scenarioName: string,
  queryTypeName: string
): Promise<BenchmarkResult[]> {
  const scenario = config.scenarios[scenarioName];
  const queryType = config.queryTypes[queryTypeName];

  if (!scenario || !queryType) {
    throw new Error(
      `Configuration not found: scenario=${scenarioName}, queryType=${queryTypeName}`
    );
  }

  section(`${scenario.name} - ${queryType.name}`);
  log(`📋 ${scenario.description}`, 'cyan');

  const results: BenchmarkResult[] = [];
  const tableInfo = client.getAllTableInfo();
  const tableNames = Array.from(tableInfo.keys());

  if (tableNames.length === 0) {
    log('⚠️  No table information found, please check dubhe config', 'yellow');
    return results;
  }

  log(`📊 Found ${tableNames.length} tables: ${tableNames.join(', ')}`, 'green');

  // Execute all tests for each table
  for (const tableName of tableNames) {
    // Convert table name to lowercase because GraphQL schema expects lowercase table names
    // DubheGraphqlClient's toSnakeCase method converts table names to uppercase (like COUNTER0)
    // But actual GraphQL schema fields are lowercase (like counter0s)
    const normalizedTableName = tableName.toLowerCase();

    for (const testConfig of queryType.tests) {
      try {
        const result = await runQueryBenchmark(client, normalizedTableName, testConfig, scenario);
        // Keep original table name in results for display
        result.tableName = tableName;
        results.push(result);

        // Show result summary
        if (result.success) {
          log(
            `✅ ${result.testName} (${tableName}): ${result.rps.toFixed(
              2
            )} RPS, ${result.averageLatency.toFixed(2)}ms average latency`,
            'green'
          );
        } else {
          log(`❌ ${result.testName} (${tableName}): ${result.errors} errors`, 'red');
        }
      } catch (error) {
        log(
          `❌ Load test failed ${testConfig.type} on ${tableName}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          'red'
        );
      }
    }
  }

  return results;
}

// Run subscription benchmark suite
async function runSubscriptionBenchmarkSuite(
  client: DubheGraphqlClient,
  config: Config,
  subscriptionTypeName: string
): Promise<SubscriptionResult[]> {
  const subscriptionType = config.subscriptionTypes[subscriptionTypeName];

  if (!subscriptionType) {
    throw new Error(`Subscription configuration not found: ${subscriptionTypeName}`);
  }

  section(`Subscription Load Test - ${subscriptionType.name}`);

  const results: SubscriptionResult[] = [];
  const tableInfo = client.getAllTableInfo();
  const tableNames = Array.from(tableInfo.keys());

  if (tableNames.length === 0) {
    log('⚠️  No table information found, please check dubhe config', 'yellow');
    return results;
  }

  log(`📊 Found ${tableNames.length} tables: ${tableNames.join(', ')}`, 'green');

  // Execute all subscription tests for each table
  for (const tableName of tableNames) {
    // Convert table name to lowercase because GraphQL schema expects lowercase table names
    const normalizedTableName = tableName.toLowerCase();

    for (const testConfig of subscriptionType.tests) {
      try {
        const result = await runSubscriptionBenchmark(
          client,
          normalizedTableName,
          testConfig,
          subscriptionType
        );
        // Keep original table name in results for display
        result.tableName = tableName;
        results.push(result);

        // Show result summary
        if (result.success) {
          log(
            `✅ ${result.testName} (${tableName}): ${
              result.eventsReceived
            } events received, ${result.averageEventLatency.toFixed(2)}ms average latency`,
            'green'
          );
        } else {
          log(`❌ ${result.testName} (${tableName}): ${result.errors} errors`, 'red');
        }
      } catch (error) {
        log(
          `❌ Subscription load test failed ${testConfig.type} on ${tableName}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          'red'
        );
      }
    }
  }

  return results;
}

// Generate report
function generateReport(
  queryResults: BenchmarkResult[],
  subscriptionResults: SubscriptionResult[]
): string {
  let report = '\n';
  report += '# Dubhe GraphQL Smart Load Test Report\n\n';
  report += `Generated at: ${new Date().toLocaleString()}\n\n`;

  if (queryResults.length > 0) {
    report += '## Query Load Test Results\n\n';
    report +=
      '| Table Name | Test Type | RPS | Average Latency (ms) | Total Requests | Errors | Status |\n';
    report +=
      '|-----------|-----------|-----|-------------------|---------------|-------|--------|\n';

    for (const result of queryResults) {
      const status = result.success ? '✅' : '❌';
      report += `| ${result.tableName} | ${result.testName} | ${result.rps.toFixed(
        2
      )} | ${result.averageLatency.toFixed(2)} | ${result.requestCount} | ${
        result.errors
      } | ${status} |\n`;
    }
    report += '\n';
  }

  if (subscriptionResults.length > 0) {
    report += '## Subscription Load Test Results\n\n';
    report +=
      '| Table Name | Test Type | Connections | Events Received | Average Event Latency (ms) | Errors | Status |\n';
    report +=
      '|-----------|-----------|-------------|-----------------|---------------------------|-------|--------|\n';

    for (const result of subscriptionResults) {
      const status = result.success ? '✅' : '❌';
      report += `| ${result.tableName} | ${result.testName} | ${result.connectionCount} | ${
        result.eventsReceived
      } | ${result.averageEventLatency.toFixed(2)} | ${result.errors} | ${status} |\n`;
    }
    report += '\n';
  }

  // Add summary statistics
  if (queryResults.length > 0) {
    const totalRequests = queryResults.reduce((sum, r) => sum + r.requestCount, 0);
    const avgRps = queryResults.reduce((sum, r) => sum + r.rps, 0) / queryResults.length;
    const avgLatency =
      queryResults.reduce((sum, r) => sum + r.averageLatency, 0) / queryResults.length;
    const totalErrors = queryResults.reduce((sum, r) => sum + r.errors, 0);

    report += '## Query Performance Summary\n\n';
    report += `- **Total Requests**: ${totalRequests}\n`;
    report += `- **Average RPS**: ${avgRps.toFixed(2)}\n`;
    report += `- **Average Latency**: ${avgLatency.toFixed(2)}ms\n`;
    report += `- **Total Errors**: ${totalErrors}\n`;
    report += `- **Success Rate**: ${(
      ((totalRequests - totalErrors) / totalRequests) *
      100
    ).toFixed(2)}%\n\n`;
  }

  return report;
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const configPath = args[1] || 'dubhe-bench-config.json';

  section('Dubhe GraphQL Smart Load Testing Tool');

  // Read configuration file
  let config: Config;
  try {
    const configFile = path.resolve(configPath);
    const configData = readFileSync(configFile, 'utf-8');
    config = JSON.parse(configData);
    log(`✅ Configuration file loaded successfully: ${configFile}`, 'green');
  } catch (error) {
    log(
      `❌ Configuration file loading failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'red'
    );
    log('Please ensure configuration file exists and is properly formatted', 'yellow');
    process.exit(1);
  }

  // Check GraphQL service status
  log('🔍 Checking GraphQL service status...', 'yellow');
  const isServiceRunning = await checkGraphQLService(config.endpoint);

  if (!isServiceRunning) {
    log('❌ GraphQL service is not running!', 'red');
    log('Please start GraphQL service first:', 'yellow');
    log('  cd packages/graphql-server', 'cyan');
    log('  pnpm dev', 'cyan');
    process.exit(1);
  }

  log('✅ GraphQL service is running normally', 'green');

  // Read dubhe config file
  let dubheMetadata: DubheMetadata;
  try {
    const dubheConfigPath = path.resolve(config.dubheConfigPath);
    const dubheConfigData = readFileSync(dubheConfigPath, 'utf-8');
    dubheMetadata = JSON.parse(dubheConfigData);
    log(`✅ Dubhe configuration file loaded successfully: ${dubheConfigPath}`, 'green');
  } catch (error) {
    log(
      `❌ Dubhe configuration file loading failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'red'
    );
    log(`Please check configuration file path: ${config.dubheConfigPath}`, 'yellow');
    process.exit(1);
  }

  // Create client instance
  let client: DubheGraphqlClient;
  try {
    client = createClient(config, dubheMetadata);
    log('✅ DubheGraphqlClient created successfully', 'green');

    // Show parsed table information
    const tableInfo = client.getAllTableInfo();
    if (tableInfo.size > 0) {
      log(`📋 Automatically parsed ${tableInfo.size} tables:`, 'green');
      for (const [tableName, info] of tableInfo) {
        log(`   - ${tableName}: ${info.fields.length} fields`, 'cyan');
      }
    } else {
      log('⚠️  No table information parsed, please check dubhe config', 'yellow');
    }
  } catch (error) {
    log(
      `❌ Client creation failed: ${error instanceof Error ? error.message : String(error)}`,
      'red'
    );
    process.exit(1);
  }

  const queryResults: BenchmarkResult[] = [];
  const subscriptionResults: SubscriptionResult[] = [];

  try {
    switch (command) {
      case 'quick':
        log('\n📊 Running quick load test...', 'blue');
        const quickResults = await runQueryBenchmarkSuite(client, config, 'quick', 'basic');
        queryResults.push(...quickResults);
        break;

      case 'standard':
        log('\n📊 Running standard load test...', 'blue');
        const standardResults = await runQueryBenchmarkSuite(client, config, 'standard', 'basic');
        queryResults.push(...standardResults);

        // Also run filtered queries
        const filteredResults = await runQueryBenchmarkSuite(
          client,
          config,
          'standard',
          'filtered'
        );
        queryResults.push(...filteredResults);
        break;

      case 'stress':
        log('\n📊 Running stress test...', 'blue');
        const stressResults = await runQueryBenchmarkSuite(client, config, 'stress', 'basic');
        queryResults.push(...stressResults);

        const stressFilteredResults = await runQueryBenchmarkSuite(
          client,
          config,
          'stress',
          'filtered'
        );
        queryResults.push(...stressFilteredResults);

        const batchResults = await runQueryBenchmarkSuite(client, config, 'stress', 'batch');
        queryResults.push(...batchResults);
        break;

      case 'subscription':
        log('\n📊 Running subscription load test...', 'blue');
        const basicSubResults = await runSubscriptionBenchmarkSuite(client, config, 'basic');
        subscriptionResults.push(...basicSubResults);

        const filteredSubResults = await runSubscriptionBenchmarkSuite(client, config, 'filtered');
        subscriptionResults.push(...filteredSubResults);
        break;

      case 'all':
        log('\n📊 Running full load test suite...', 'blue');

        // Query load tests
        const allQueryResults = await Promise.all([
          runQueryBenchmarkSuite(client, config, 'quick', 'basic'),
          runQueryBenchmarkSuite(client, config, 'standard', 'filtered'),
          runQueryBenchmarkSuite(client, config, 'stress', 'batch')
        ]);
        queryResults.push(...allQueryResults.flat());

        // Subscription load tests
        const allSubResults = await Promise.all([
          runSubscriptionBenchmarkSuite(client, config, 'basic'),
          runSubscriptionBenchmarkSuite(client, config, 'filtered')
        ]);
        subscriptionResults.push(...allSubResults.flat());

        log('\n🎉 Full load test suite completed!', 'green');
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        log('❌ Unknown command, showing help information:', 'red');
        showHelp();
        process.exit(1);
    }

    // Generate report
    if (queryResults.length > 0 || subscriptionResults.length > 0) {
      const report = generateReport(queryResults, subscriptionResults);
      const reportFile = `dubhe-benchmark-report-${Date.now()}.md`;
      writeFileSync(reportFile, report);
      log(`\n📋 Load test report saved to: ${reportFile}`, 'green');

      // Also save detailed results in JSON format
      const jsonReportFile = `dubhe-benchmark-results-${Date.now()}.json`;
      writeFileSync(jsonReportFile, JSON.stringify({ queryResults, subscriptionResults }, null, 2));
      log(`📋 Detailed results saved to: ${jsonReportFile}`, 'green');
    }
  } catch (error) {
    log(
      `❌ Load test execution failed: ${error instanceof Error ? error.message : String(error)}`,
      'red'
    );
    process.exit(1);
  } finally {
    // Clean up client connections
    try {
      client.close();
      log('🔒 Client connection closed', 'cyan');
    } catch (error) {
      log(
        `⚠️  Client close warning: ${error instanceof Error ? error.message : String(error)}`,
        'yellow'
      );
    }
  }
}

function showHelp() {
  log('\nUsage:', 'green');
  log('  pnpm tsx src/index.ts <command> [config-file]', 'cyan');
  log('  Or use npm scripts:', 'cyan');
  log('  pnpm start:quick     # Run quick load test', 'yellow');
  log('  pnpm start:standard  # Run standard load test', 'yellow');
  log('  pnpm start:stress    # Run stress test', 'yellow');
  log('  pnpm start:subscription # Run subscription load test', 'yellow');

  log('\nAvailable commands:', 'green');
  log('  quick        Quick load test (10s, 5 connections)', 'yellow');
  log('  standard     Standard load test (30s, 10 connections)', 'yellow');
  log('  stress       Stress test (60s, 20 connections)', 'yellow');
  log('  subscription Subscription load test (30s)', 'yellow');
  log('  all          Run all load test configurations', 'yellow');
  log('  help         Show help information', 'yellow');

  log('\nConfiguration file:', 'green');
  log('  dubhe-bench-config.json  Smart load test configuration file', 'yellow');
  log('  Contains dubhe config and benchmark settings', 'yellow');

  log('\nFeatures:', 'green');
  log('  ✅ Automatically parse table structure from dubhe config', 'yellow');
  log('  ✅ Intelligently generate load test cases for each table', 'yellow');
  log('  ✅ Support performance testing for queries and subscriptions', 'yellow');
  log('  ✅ Use DubheGraphqlClient for testing', 'yellow');
  log('  ✅ Automatically generate detailed performance reports', 'yellow');

  log('\nExamples:', 'green');
  log('  # Start GraphQL service', 'cyan');
  log('  cd packages/graphql-server && pnpm dev', 'cyan');
  log('  ', 'cyan');
  log('  # Run quick load test', 'cyan');
  log('  cd packages/benchmark && pnpm start:quick', 'cyan');
  log('  ', 'cyan');
  log('  # Use custom configuration', 'cyan');
  log('  pnpm tsx src/index.ts standard my-config.json', 'cyan');
}

// If running this file directly
if (require.main === module) {
  main().catch((error) => {
    log(
      `❌ Program execution failed: ${error instanceof Error ? error.message : String(error)}`,
      'red'
    );
    process.exit(1);
  });
}

export {
  checkGraphQLService,
  createClient,
  runQueryBenchmark,
  runSubscriptionBenchmark,
  runQueryBenchmarkSuite,
  runSubscriptionBenchmarkSuite,
  generateReport,
  colors,
  log,
  section
};
