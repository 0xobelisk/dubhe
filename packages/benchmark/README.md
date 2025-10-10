# Dubhe GraphQL Intelligent Load Testing Tool

This is an intelligent GraphQL performance testing tool that can automatically parse Dubhe config files and generate targeted test cases based on table structure.

## ✨ Features

- 🧠 **Intelligent Parsing**: Automatically parse Dubhe config JSON, identify table structure and field information
- 🎯 **Auto Generation**: Automatically generate targeted query and subscription test cases based on table structure
- 🔄 **DubheGraphqlClient**: Uses standard DubheGraphqlClient for testing, ensuring consistency with actual usage
- 📊 **Comprehensive Coverage**: Supports basic queries, filter queries, batch queries and subscription testing
- 📈 **Detailed Reports**: Automatically generate performance reports in Markdown and JSON formats
- 🚀 **High Performance**: Supports concurrent testing with configurable connection count and duration
- 🔧 **Flexible Configuration**: Separate configuration files, can reuse existing Dubhe config

## 📁 Configuration Files

### 1. Dubhe Config (`dubhe.config_1.json`)

This is the standard Dubhe configuration file containing component, resource and enum definitions:

```json
{
  "components": [
    {
      "counter0": {
        "fields": [{ "entity_id": "address" }],
        "keys": ["entity_id"]
      }
    },
    {
      "counter1": {
        "fields": [{ "entity_id": "address" }, { "value": "u32" }],
        "keys": ["entity_id"]
      }
    }
  ],
  "resources": [
    {
      "counter2": {
        "fields": [{ "value": "u32" }],
        "keys": []
      }
    }
  ],
  "enums": []
}
```

### 2. Benchmark Config (`dubhe-bench-config.json`)

Configuration file for the load testing tool:

```json
{
  "endpoint": "http://localhost:4000/graphql",
  "subscriptionEndpoint": "ws://localhost:4000/graphql",
  "dubheConfigPath": "../graphql-client/dubhe.config_1.json",
  "headers": {
    "Content-Type": "application/json",
    "User-Agent": "dubhe-benchmark"
  },
  "scenarios": {
    "quick": {
      "name": "Quick Load Test",
      "duration": 10,
      "connections": 5,
      "description": "Basic performance test"
    }
  },
  "queryTypes": {
    "basic": {
      "name": "Basic Query",
      "tests": [
        {
          "type": "getAllTables",
          "params": { "first": 10 }
        }
      ]
    }
  },
  "subscriptionTypes": {
    "basic": {
      "name": "Basic Subscription",
      "duration": 30,
      "tests": [
        {
          "type": "subscribeToTableChanges",
          "params": {
            "initialEvent": true,
            "first": 5
          }
        }
      ]
    }
  }
}
```

## 🚀 Usage

### Install Dependencies

```bash
pnpm install
```

### Start GraphQL Service

```bash
# In another terminal window
cd packages/graphql-server
pnpm dev
```

### Run Load Tests

```bash
# Quick load test (10s, 5 connections)
pnpm start:quick

# Standard load test (30s, 10 connections)
pnpm start:standard

# Stress test (60s, 20 connections)
pnpm start:stress

# Subscription test (30s)
pnpm start:subscription

# Run all tests
pnpm start:all

# Use custom config file
pnpm tsx src/index.ts quick my-config.json
```

### Command Options

- `quick` - Quick load test, suitable for basic performance verification during development
- `standard` - Standard load test, includes basic queries and filter queries
- `stress` - Stress test, includes batch queries and high concurrency scenarios
- `subscription` - Subscription test, tests real-time data push performance
- `all` - Run all test configurations
- `help` - Display help information

## 🧠 Intelligent Features

### Automatic Table Parsing

The tool automatically parses from Dubhe config:

- **Components**: Component tables and their fields
- **Resources**: Resource tables and their fields
- **Keys**: Primary key information
- **Enums**: Enum types (future support)

### Intelligent Test Generation

Based on parsed table structure, automatically generates:

- Basic query tests for each table
- Conditional query tests using primary keys
- Batch query tests
- Table subscription tests
- Filter subscription tests

### DubheGraphqlClient Integration

- Uses actual `DubheGraphqlClient` for testing
- Supports all client methods: `getAllTables`, `getTableByCondition`, `batchQuery`, `subscribeToTableChanges`, etc.
- Ensures load test results are consistent with actual application performance

## 📊 Test Types

### Query Tests

1. **getAllTables**: Get all records from a table
2. **getTableByCondition**: Query records by condition
3. **batchQuery**: Batch query multiple tables

### Subscription Tests

1. **subscribeToTableChanges**: Listen to table changes (supports filtering)

## 📈 Report Output

After completion, two types of reports are generated:

### Markdown Report (`dubhe-benchmark-report-{timestamp}.md`)

Contains:

- Query load test result tables
- Subscription load test result tables
- Performance summary statistics

### JSON Report (`dubhe-benchmark-results-{timestamp}.json`)

Contains:

- Detailed raw test data
- All error information
- Structured data for further analysis

## 🔧 Advanced Configuration

### Custom Dubhe Config Path

Modify `dubheConfigPath` in the benchmark configuration file:

```json
{
  "dubheConfigPath": "./path/to/your/dubhe.config.json"
}
```

### Custom Test Parameters

Different parameters can be configured for each test type:

```json
{
  "queryTypes": {
    "custom": {
      "name": "Custom Query",
      "tests": [
        {
          "type": "getAllTables",
          "params": {
            "first": 50,
            "filter": {
              "createdAtTimestampMs": {
                "greaterThan": "1672531200000"
              }
            }
          }
        }
      ]
    }
  }
}
```

### Custom Load Test Scenarios

```json
{
  "scenarios": {
    "custom": {
      "name": "Custom Scenario",
      "duration": 120,
      "connections": 50,
      "description": "High load long duration test"
    }
  }
}
```

## 🤔 Troubleshooting

### GraphQL Service Not Running

```
❌ GraphQL service is not running!
Please start GraphQL service first:
  cd packages/graphql-server
  pnpm dev
```

### Dubhe Config Loading Failed

```
❌ Dubhe configuration file loading failed
Please check configuration file path: ../graphql-client/dubhe.config_1.json
```

Ensure:

1. File path is correct
2. JSON format is valid
3. File permissions are correct

### No Table Information Parsed

```
⚠️  No table information parsed, please check dubhe config
```

Check if the Dubhe config file contains valid `components` or `resources` definitions.

## 📝 Example Output

```
============================================================
Dubhe GraphQL Intelligent Load Testing Tool
============================================================
✅ Configuration file loaded successfully: /path/to/dubhe-bench-config.json
✅ Dubhe configuration file loaded successfully: /path/to/dubhe.config_1.json
🔍 Checking GraphQL service status...
✅ GraphQL service running normally
✅ DubheGraphqlClient created successfully
📋 Automatically parsed 3 tables:
   - counter0: 3 fields
   - counter1: 4 fields
   - counter2: 3 fields

============================================================
Quick Load Test - Basic Query
============================================================
📋 Basic performance test
📊 Found 3 tables: counter0, counter1, counter2
🚀 Running query load test: getAllTables on counter0
   Duration: 10s
   Concurrent connections: 5
✅ getAllTables (counter0): 150.25 RPS, 45.67ms average latency

📋 Load test report saved to: dubhe-benchmark-report-1234567890.md
📋 Detailed results saved to: dubhe-benchmark-results-1234567890.json
🔒 Client connections closed
```

## 🔄 Integration with Existing Tools

This tool is fully integrated with the Dubhe ecosystem:

- **DubheGraphqlClient**: Uses the same client library
- **GraphQL Server**: Tests actual PostGraphile service
- **Dubhe Config**: Reuses existing configuration files
- **Indexer**: Can test GraphQL API generated by indexer

Through this approach, load test results can accurately reflect actual application performance.
