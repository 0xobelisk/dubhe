# Unified Connection Pool Configuration

## Overview

The GraphQL server now uses a **unified connection pool architecture**, with a single connection pool handling all GraphQL operations:
- Query
- Mutation  
- Subscription

## Connection Pool Parameters

### Core Parameters

1. **`max`** - Maximum Connections
   - The maximum number of connections the pool can create
   - Should be set based on database server capacity and application requirements

2. **`min`** - Minimum Connections
   - The minimum number of connections the pool maintains
   - Usually set to around 10% of `max`

3. **`connectionTimeoutMillis`** - Connection Timeout
   - Timeout for acquiring connections from the pool
   - Balanced value: 10 seconds (supports various operations)

4. **`idleTimeoutMillis`** - Idle Timeout
   - How long a connection stays idle before being disconnected
   - Balanced value: 5 minutes (supports subscriptions while avoiding resource waste)

5. **`maxLifetimeSeconds`** - Maximum Connection Lifetime
   - Maximum lifetime of a connection, after which it's forcibly rotated
   - Balanced value: 1 hour (prevents connection leaks)

## Current Configuration

```javascript
const pgPool = new Pool({
  connectionString: DATABASE_URL,
  max: config.maxConnections,              // Total connections
  min: Math.min(5, Math.floor(config.maxConnections * 0.1)),  // 10% minimum connections
  connectionTimeoutMillis: 10000,          // 10 second timeout
  idleTimeoutMillis: 600000,              // 10 minute idle cleanup
  maxLifetimeSeconds: 3600,               // 1 hour rotation
  allowExitOnIdle: config.env === 'development'
});
```

## Monitoring Endpoints

### `/pool-status` - Connection Pool Status

Returns detailed status of the current connection pool:

```json
{
  "status": "ok",
  "connectionPool": {
    "totalCount": 25,
    "idleCount": 20,
    "waitingCount": 0,
    "maxConnections": 1000,
    "minConnections": 5
  },
  "strategy": "single-pool-unified",
  "operations": ["query", "mutation", "subscription"],
  "timestamp": "2024-01-20T10:30:45.123Z",
  "uptime": 3600.5,
  "memory": {
    "rss": 52428800,
    "heapTotal": 29360128,
    "heapUsed": 18874568,
    "external": 1089024
  }
}
```

### Status Field Descriptions

- **totalCount**: Current active connections
- **idleCount**: Idle connections  
- **waitingCount**: Clients waiting for connections
- **maxConnections**: Configured maximum connections
- **minConnections**: Configured minimum connections

## Configuration Recommendations

### Basic Configuration
```bash
# Small applications (< 100 concurrent)
--max-connections 100

# Medium applications (100-500 concurrent)  
--max-connections 300

# Large applications (500+ concurrent)
--max-connections 1000
```

### Subscription-Heavy Applications
If your application has many long-term subscription connections:
- Appropriately increase `idleTimeoutMillis` to 10-15 minutes
- Increase `maxLifetimeSeconds` to 2-4 hours
- Monitor `idleCount` to ensure sufficient idle connections for new requests

### Query-Heavy Applications
If your application is primarily short-term queries/mutations:
- Reduce `idleTimeoutMillis` to 1-2 minutes
- Reduce `maxLifetimeSeconds` to 30 minutes
- Monitor `waitingCount` to ensure the connection pool is large enough

## Performance Optimization

### Connection Count Calculation Formula

Recommended maximum connection calculation:
```
maxConnections = min(
  Database max connections * 0.8,
  (CPU cores * 2) + effective disk count,
  Expected concurrent users * 1.2
)
```

### Monitoring Metrics

Key monitoring metrics:
1. **Connection Utilization** = `totalCount / maxConnections`
   - Target: 60-80%
2. **Wait Queue** = `waitingCount`
   - Target: < 5% of time with waiting
3. **Idle Rate** = `idleCount / totalCount`
   - Target: 20-40%

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   ```
   Error: timeout acquiring a connection from the pool
   ```
   Solution: Increase `maxConnections` or optimize query performance

2. **Insufficient Connections**
   ```
   Error: remaining connection slots are reserved
   ```
   Solution: Check database connection limits, adjust `maxConnections`

3. **Subscription Disconnections**
   - Check if `idleTimeoutMillis` is too short
   - Verify network stability
   - Monitor `maxLifetimeSeconds` settings

### Tuning Steps

1. **Baseline Testing**: Record connection usage under normal load
2. **Stress Testing**: Simulate high load, observe `waitingCount`
3. **Gradual Adjustment**: Incrementally increase `maxConnections`, observe effects
4. **Continuous Monitoring**: Use `/pool-status` endpoint for ongoing monitoring

## Best Practices

1. **Progressive Scaling**: Start with smaller connection counts, gradually increase based on needs
2. **Monitoring-Driven**: Base tuning on actual monitoring data rather than guesswork
3. **Environment Isolation**: Use different connection configurations for dev/test/production environments
4. **Reserve Capacity**: Reserve 20% connection capacity for burst traffic
5. **Regular Checks**: Regularly check connection pool status to identify potential issues early

## Summary

The unified connection pool architecture simplifies configuration and management. Through proper parameter settings, it can effectively support various GraphQL operation modes. The key is to tune based on actual monitoring data to ensure a balance between resource efficiency and performance. 