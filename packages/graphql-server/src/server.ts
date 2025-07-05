import { postgraphile } from 'postgraphile';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import {
  dbLogger,
  serverLogger,
  systemLogger,
  subscriptionLogger,
  logPerformance
} from './utils/logger';
import {
  DatabaseIntrospector,
  createPostGraphileConfig,
  PostGraphileConfigOptions,
  WelcomePageConfig
} from './plugins';
import { EnhancedServerManager } from './plugins/enhanced-server-manager';
import { subscriptionConfig, SubscriptionConfigInput } from './config/subscription-config';
import {
  generateStoreTablesInfo,
  createUniversalSubscriptionsPlugin
} from './universal-subscriptions';

// Load environment variables
dotenv.config();

// Server configuration interface
export interface ServerConfig {
  // Basic server configuration
  port: string;
  databaseUrl: string;
  schema: string;
  endpoint: string;
  cors: boolean;
  subscriptions: boolean;
  env: string;

  // Debug configuration
  debug: boolean;

  // Performance configuration
  queryTimeout: number;
  maxConnections: number;
  heartbeatInterval: number;
  enableMetrics: boolean;

  // Subscription capabilities
  enableLiveQueries: boolean;
  enablePgSubscriptions: boolean;
  enableNativeWebSocket: boolean;
  realtimePort?: number;

  // Internal debug flags
  debugNotifications: boolean;
}

// Start server
export const startServer = async (config: ServerConfig): Promise<void> => {
  // Set log level from config to environment (for logger compatibility)
  process.env.LOG_LEVEL = config.debug ? 'debug' : 'info';

  // Extract variables from config
  const {
    port: PORT,
    databaseUrl: DATABASE_URL,
    schema: PG_SCHEMA,
    endpoint: GRAPHQL_ENDPOINT,
    cors: ENABLE_CORS,
    subscriptions: ENABLE_SUBSCRIPTIONS_BOOL,
    env: NODE_ENV
  } = config;

  // Convert boolean values to string format
  const ENABLE_SUBSCRIPTIONS = ENABLE_SUBSCRIPTIONS_BOOL ? 'true' : 'false';

  // Build subscription configuration and refresh
  systemLogger.info('Refreshing subscription configuration with new settings...');
  const subscriptionConfigInput: SubscriptionConfigInput = {
    enableSubscriptions: ENABLE_SUBSCRIPTIONS_BOOL,
    databaseUrl: DATABASE_URL,
    port: PORT,
    // Use configuration from ServerConfig instead of defaults
    enableLiveQueries: config.enableLiveQueries,
    enablePgSubscriptions: config.enablePgSubscriptions,
    enableNativeWebSocket: config.enableNativeWebSocket,
    realtimePort: config.realtimePort?.toString(),
    maxConnections: config.maxConnections.toString(),
    heartbeatInterval: config.heartbeatInterval.toString(),
    debugNotifications: config.debugNotifications,
    enableMetrics: config.enableMetrics
  };

  subscriptionConfig.refresh(subscriptionConfigInput);

  // === Unified Connection Pool Architecture: Single pool handles all operations ===

  systemLogger.info('🔄 Connection pool configuration', {
    maxConnections: config.maxConnections,
    strategy: 'single-pool-unified',
    operations: ['query', 'mutation', 'subscription']
  });

  // Unified connection pool - handles all GraphQL operations
  const pgPool = new Pool({
    connectionString: DATABASE_URL,

    // === Connection Pool Configuration ===
    max: config.maxConnections, // Use configured maximum connections
    min: Math.min(5, Math.floor(config.maxConnections * 0.1)), // Keep minimum connections

    // === Balanced Configuration: Support both short-term queries and long-term subscriptions ===
    connectionTimeoutMillis: 10000, // 10 second timeout (balanced value)
    idleTimeoutMillis: 600000, // 10 minute idle cleanup (support subscriptions but not too long)
    maxLifetimeSeconds: 3600, // 1 hour rotation (prevent connection leaks)

    allowExitOnIdle: config.env === 'development'
  });

  // Add connection pool event listeners
  pgPool.on('connect', (client) => {
    dbLogger.debug('📤 New connection established', {
      totalCount: pgPool.totalCount,
      idleCount: pgPool.idleCount,
      waitingCount: pgPool.waitingCount
    });
  });

  pgPool.on('error', (err, client) => {
    dbLogger.error('❌ Connection pool error', err, {
      totalCount: pgPool.totalCount
    });
  });

  const startTime = Date.now();

  try {
    // 1. Test database connection and scan table structure
    systemLogger.info('Initializing database connection and scanning table structure...', {
      schema: PG_SCHEMA,
      databaseUrl: DATABASE_URL.replace(/:[^:]*@/, ':****@') // Hide password
    });

    const introspector = new DatabaseIntrospector(pgPool, PG_SCHEMA);

    const isConnected = await introspector.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    dbLogger.info('Database connection successful', { schema: PG_SCHEMA });

    const allTables = await introspector.getAllTables();
    const tableNames = allTables.map((t) => t.table_name);

    dbLogger.info('Table structure scan completed', {
      tableCount: allTables.length,
      storeTableCount: tableNames.filter((name) => name.startsWith('store_')).length,
      tableNames: tableNames.slice(0, 10) // Only show first 10 table names
    });

    // 2. Display subscription configuration status
    const subscriptionConfigData = subscriptionConfig.getConfig();
    subscriptionLogger.info('📡 Subscription system configuration status', {
      enableSubscriptions: subscriptionConfigData.enableSubscriptions,
      capabilities: {
        pgSubscriptions: subscriptionConfigData.capabilities.pgSubscriptions
      },
      recommendedMethod: 'pg-subscriptions',
      walLevel: subscriptionConfigData.walLevel
    });

    // 3. Pre-generate store table information for dynamic queries
    subscriptionLogger.info('Pre-generating store table information for tool queries...');
    const storeTablesInfo = await generateStoreTablesInfo(pgPool);
    const storeTableNames = Object.keys(storeTablesInfo);

    subscriptionLogger.info(`Discovered store tables: ${storeTableNames.join(', ')}`);

    // 4. Create PostGraphile configuration
    const postgraphileConfigOptions: PostGraphileConfigOptions = {
      port: PORT,
      nodeEnv: NODE_ENV,
      graphqlEndpoint: GRAPHQL_ENDPOINT,
      enableSubscriptions: ENABLE_SUBSCRIPTIONS,
      enableCors: ENABLE_CORS ? 'true' : 'false',
      databaseUrl: DATABASE_URL,
      availableTables: tableNames,
      // Pass additional configuration from CLI
      disableQueryLog: !config.debug, // Disable query log unless debug mode
      enableQueryLog: config.debug, // Enable query log in debug mode
      queryTimeout: config.queryTimeout
    };

    serverLogger.info('Creating PostGraphile configuration', {
      endpoint: GRAPHQL_ENDPOINT,
      enableCors: ENABLE_CORS,
      enableSubscriptions: ENABLE_SUBSCRIPTIONS,
      debug: config.debug,
      disableQueryLog: !config.debug,
      enableQueryLog: config.debug
    });

    // Use simplified configuration
    const postgraphileConfig = {
      ...createPostGraphileConfig(postgraphileConfigOptions),
      ...subscriptionConfig.generatePostGraphileConfig()
    };

    // Add tools query plugin
    const toolsPlugin = createUniversalSubscriptionsPlugin(storeTablesInfo);
    postgraphileConfig.appendPlugins = [...(postgraphileConfig.appendPlugins || []), toolsPlugin];

    // 5. Create PostGraphile middleware
    console.log('🔧 Creating PostGraphile middleware...');
    const postgraphileMiddleware = postgraphile(pgPool, PG_SCHEMA, {
      ...postgraphileConfig
    });
    console.log('✅ PostGraphile middleware creation completed:', typeof postgraphileMiddleware);

    // 6. Configure welcome page
    const welcomeConfig: WelcomePageConfig = {
      port: PORT,
      graphqlEndpoint: GRAPHQL_ENDPOINT,
      nodeEnv: NODE_ENV,
      schema: PG_SCHEMA,
      enableCors: ENABLE_CORS ? 'true' : 'false',
      enableSubscriptions: ENABLE_SUBSCRIPTIONS
    };

    // 7. Create Express server manager
    const serverManager = new EnhancedServerManager();

    // 8. Create Express server
    await serverManager.createEnhancedServer({
      postgraphileMiddleware,
      pgPool,
      tableNames,
      databaseUrl: DATABASE_URL,
      allTables,
      welcomeConfig,
      postgraphileConfigOptions
    });

    // 9. Start Express server
    await serverManager.startServer();

    logPerformance('Express server startup', startTime, {
      port: PORT,
      tableCount: allTables.length,
      storeTableCount: storeTableNames.length,
      nodeEnv: NODE_ENV,
      framework: 'Express',
      capabilities: {
        pgSubscriptions: subscriptionConfigData.capabilities.pgSubscriptions
      }
    });

    // 10. Display usage instructions
    if (NODE_ENV === 'development') {
      console.log('\n' + '='.repeat(80));
      console.log('📖 Quick Access (Express Architecture):');
      console.log(`Visit http://localhost:${PORT}/ to view homepage`);
      console.log(`Visit http://localhost:${PORT}/playground to use GraphQL Playground`);
      console.log(`Visit http://localhost:${PORT}/health to check server status`);
      console.log(`Visit http://localhost:${PORT}/subscription-config to get client configuration`);
      console.log(`Visit http://localhost:${PORT}/subscription-docs to view configuration guide`);
      console.log('='.repeat(80) + '\n');
    }

    // 11. Set up simple and direct shutdown handling
    let isShuttingDown = false;
    const quickShutdown = (signal: string) => {
      if (isShuttingDown) {
        systemLogger.info('⚡ Force exiting process...');
        process.exit(0);
      }

      isShuttingDown = true;
      systemLogger.info(`🛑 Received ${signal} signal, shutting down Express server...`);

      // Set 1 second force exit timeout
      setTimeout(() => {
        systemLogger.info('⚡ Quick exit');
        process.exit(0);
      }, 1000);

      // Try to shutdown Express server quickly
      serverManager.quickShutdown().finally(() => {
        process.exit(0);
      });
    };

    process.on('SIGINT', () => quickShutdown('SIGINT'));
    process.on('SIGTERM', () => quickShutdown('SIGTERM'));

    // Simplified exception handling
    process.on('unhandledRejection', (reason) => {
      console.error('❌ Unhandled Promise rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught exception:', error.message);
      process.exit(1);
    });
  } catch (error) {
    systemLogger.error('Failed to start Express server', error, {
      databaseUrl: DATABASE_URL.replace(/:[^:]*@/, ':****@'),
      schema: PG_SCHEMA,
      port: PORT
    });

    systemLogger.info('💡 Possible causes:');
    systemLogger.info('1. Database connection failed - check DATABASE_URL');
    systemLogger.info(
      '2. Expected table structure not found in database - ensure sui-rust-indexer is running'
    );
    systemLogger.info('3. Permission issues - ensure database user has sufficient permissions');
    systemLogger.info('4. Missing dependencies - run pnpm install');

    // Display subscription configuration help
    console.log('\n' + subscriptionConfig.generateDocumentation());

    process.exit(1);
  }
};
