#!/usr/bin/env node

import yargs, { Argv } from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as dotenv from 'dotenv';
import { startServer, ServerConfig } from './server';
import { systemLogger } from './utils/logger';
import packageJson from '../package.json';

// Load environment variables
dotenv.config();

// Helper function to get environment variable or default value
const getEnvOrDefault = (envKey: string, defaultValue: string): string => {
  return process.env[envKey] || defaultValue;
};

const getBooleanEnvOrDefault = (envKey: string, defaultValue: boolean): boolean => {
  const envValue = process.env[envKey];
  if (envValue === undefined) return defaultValue;
  return envValue.toLowerCase() === 'true';
};

interface StartArgs {
  // Basic server configuration
  port: string;
  'database-url': string;
  schema: string;
  endpoint: string;
  cors: boolean;
  subscriptions: boolean;
  env: string;

  // Debug configuration
  debug: boolean;

  // Performance configuration
  'query-timeout': number;
  'max-connections': number;
  'heartbeat-interval': number;
  'enable-metrics': boolean;

  // Subscription capabilities
  'enable-live-queries': boolean;
  'enable-pg-subscriptions': boolean;
  'enable-native-websocket': boolean;
  'realtime-port'?: number;
}

interface HealthArgs {
  url: string;
}

interface InitArgs {
  output: string;
}

const cli = yargs(hideBin(process.argv))
  .scriptName('dubhe-graphql-server')
  .usage('$0 <command> [options]')
  .version(packageJson.version)
  .help('help')
  .alias('h', 'help')
  .alias('v', 'version')
  .demandCommand(1, 'You need to specify a command')
  .recommendCommands()
  .strict();

// Start command
cli.command(
  'start',
  'Start GraphQL server',
  (yargs: Argv) => {
    return (
      yargs
        .option('port', {
          alias: 'p',
          type: 'string',
          default: getEnvOrDefault('PORT', '4000'),
          describe: 'Server port (env: PORT)'
        })
        .option('database-url', {
          alias: 'd',
          type: 'string',
          default: getEnvOrDefault(
            'DATABASE_URL',
            'postgres://postgres:postgres@127.0.0.1:5432/postgres'
          ),
          describe: 'Database connection URL (env: DATABASE_URL)'
        })
        .option('schema', {
          alias: 's',
          type: 'string',
          default: getEnvOrDefault('PG_SCHEMA', 'public'),
          describe: 'PostgreSQL schema name (env: PG_SCHEMA)'
        })
        .option('endpoint', {
          alias: 'e',
          type: 'string',
          default: getEnvOrDefault('GRAPHQL_ENDPOINT', '/graphql'),
          describe: 'GraphQL endpoint path (env: GRAPHQL_ENDPOINT)'
        })
        .option('cors', {
          type: 'boolean',
          default: getBooleanEnvOrDefault('ENABLE_CORS', true),
          describe: 'Enable CORS (env: ENABLE_CORS)'
        })
        .option('subscriptions', {
          type: 'boolean',
          default: getBooleanEnvOrDefault('ENABLE_SUBSCRIPTIONS', true),
          describe: 'Enable GraphQL subscriptions (env: ENABLE_SUBSCRIPTIONS)'
        })
        .option('env', {
          type: 'string',
          default: getEnvOrDefault('NODE_ENV', 'development'),
          choices: ['development', 'production'],
          describe: 'Environment mode (env: NODE_ENV)'
        })
        // Debug configuration
        .option('debug', {
          type: 'boolean',
          default: getBooleanEnvOrDefault('DEBUG', false),
          describe: 'Enable debug mode (verbose logging + query logs) (env: DEBUG)'
        })
        // Performance configuration
        .option('query-timeout', {
          type: 'number',
          default: parseInt(getEnvOrDefault('QUERY_TIMEOUT', '30000')),
          describe: 'GraphQL query timeout in milliseconds (env: QUERY_TIMEOUT)'
        })
        .option('max-connections', {
          type: 'number',
          default: parseInt(getEnvOrDefault('MAX_CONNECTIONS', '1000')),
          describe: 'Maximum database connections (env: MAX_CONNECTIONS)'
        })
        .option('heartbeat-interval', {
          type: 'number',
          default: parseInt(getEnvOrDefault('HEARTBEAT_INTERVAL', '30000')),
          describe: 'WebSocket heartbeat interval in milliseconds (env: HEARTBEAT_INTERVAL)'
        })
        .option('enable-metrics', {
          type: 'boolean',
          default: getBooleanEnvOrDefault('ENABLE_METRICS', false),
          describe: 'Enable performance metrics (env: ENABLE_METRICS)'
        })
        // Subscription capabilities
        .option('enable-live-queries', {
          type: 'boolean',
          default: getBooleanEnvOrDefault('ENABLE_LIVE_QUERIES', true),
          describe: 'Enable GraphQL live queries (env: ENABLE_LIVE_QUERIES)'
        })
        .option('enable-pg-subscriptions', {
          type: 'boolean',
          default: getBooleanEnvOrDefault('ENABLE_PG_SUBSCRIPTIONS', true),
          describe: 'Enable PostgreSQL subscriptions (env: ENABLE_PG_SUBSCRIPTIONS)'
        })
        .option('enable-native-websocket', {
          type: 'boolean',
          default: getBooleanEnvOrDefault('ENABLE_NATIVE_WEBSOCKET', true),
          describe: 'Enable native WebSocket support (env: ENABLE_NATIVE_WEBSOCKET)'
        })
        .option('realtime-port', {
          type: 'number',
          default: process.env.REALTIME_PORT ? parseInt(process.env.REALTIME_PORT) : undefined,
          describe: 'Realtime WebSocket port (env: REALTIME_PORT)'
        })

        .example(
          '$0 start -p 4000 -d postgres://user:pass@localhost/db',
          'Start server with custom port and database'
        )
        .example(
          '$0 start --no-cors --no-subscriptions',
          'Start server with CORS and subscriptions disabled'
        )
        .example('$0 start --debug', 'Start server in debug mode (verbose logging + notifications)')
        .example(
          '$0 start --debug --enable-metrics',
          'Start server in debug mode with performance metrics'
        )
    );
  },
  async (argv: StartArgs) => {
    try {
      systemLogger.info('🚀 Starting Dubhe GraphQL server via CLI...', {
        port: argv.port,
        schema: argv.schema,
        endpoint: argv.endpoint,
        environment: argv.env
      });

      // Build server configuration object
      const serverConfig: ServerConfig = {
        // Basic server configuration
        port: argv.port,
        databaseUrl: argv['database-url'],
        schema: argv.schema,
        endpoint: argv.endpoint,
        cors: argv.cors,
        subscriptions: argv.subscriptions,
        env: argv.env,

        // Debug configuration (explicit control)
        debug: argv.debug,

        // Performance configuration
        queryTimeout: argv['query-timeout'],
        maxConnections: argv['max-connections'],
        heartbeatInterval: argv['heartbeat-interval'],

        // Subscription capabilities
        enableLiveQueries: argv['enable-live-queries'],
        enablePgSubscriptions: argv['enable-pg-subscriptions'],
        enableNativeWebSocket: argv['enable-native-websocket'],
        realtimePort: argv['realtime-port'],

        // Debug configuration (notifications only in development or when debug is enabled)
        debugNotifications: argv.debug || argv.env === 'development',
        enableMetrics: argv['enable-metrics']
      };

      // Pass configuration object directly to startServer
      await startServer(serverConfig);
    } catch (error: unknown) {
      systemLogger.error('Failed to start server via CLI', error);
      process.exit(1);
    }
  }
);

// Parse command line arguments
cli.parse();
