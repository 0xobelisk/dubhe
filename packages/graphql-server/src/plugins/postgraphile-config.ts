import { QueryFilterPlugin } from './query-filter';
import { SimpleNamingPlugin } from './simple-naming';
import { AllFieldsFilterPlugin } from './all-fields-filter-plugin';
import { createEnhancedPlayground } from './enhanced-playground';
import ConnectionFilterPlugin from 'postgraphile-plugin-connection-filter';
import PgSimplifyInflectorPlugin from '@graphile-contrib/pg-simplify-inflector';
import { makePluginHook } from 'postgraphile';
import PgPubSub from '@graphile/pg-pubsub';

export interface PostGraphileConfigOptions {
  port: string | number;
  nodeEnv: string;
  graphqlEndpoint: string;
  enableSubscriptions: string;
  enableCors: string;
  databaseUrl: string;
  availableTables: string[];
  // Additional configuration from CLI
  disableQueryLog: boolean;
  enableQueryLog: boolean;
  queryTimeout: number;
}

// Create PostGraphile configuration
export function createPostGraphileConfig(options: PostGraphileConfigOptions) {
  const { port, nodeEnv, graphqlEndpoint, enableSubscriptions, enableCors, availableTables } =
    options;

  // Build GraphQL and WebSocket endpoint URLs
  const baseUrl = `http://localhost:${port}`;
  const _graphqlUrl = `${baseUrl}${graphqlEndpoint}`;
  const _subscriptionUrl =
    enableSubscriptions === 'true' ? `ws://localhost:${port}${graphqlEndpoint}` : undefined;

  // Create plugin hook to support WebSocket and subscriptions
  const pluginHook = makePluginHook([PgPubSub]);

  const config = {
    // Basic configuration - disable default GraphiQL
    graphiql: false,
    enhanceGraphiql: false,
    showErrorStack: nodeEnv === 'development',
    extendedErrors: nodeEnv === 'development' ? ['hint', 'detail', 'errcode'] : [],

    // Feature configuration - enable subscriptions
    subscriptions: enableSubscriptions === 'true',
    live: enableSubscriptions === 'true', // Enable live functionality to support subscriptions
    enableQueryBatching: true,
    enableCors: enableCors === 'true',

    // Add plugin hook to support WebSocket
    pluginHook,

    // Disable all mutation functionality - only keep queries and subscriptions
    disableDefaultMutations: true,

    // Schema configuration
    dynamicJson: true,
    setofFunctionsContainNulls: false,
    ignoreRBAC: false,
    ignoreIndexes: true,

    // Log control configuration
    // Control SQL query logs through CLI parameters
    disableQueryLog:
      options.disableQueryLog || (nodeEnv === 'production' && !options.enableQueryLog),

    // Enable query execution plan explanation (development environment only)
    allowExplain: nodeEnv === 'development',

    // Monitor PostgreSQL changes (development environment only)
    watchPg: nodeEnv === 'development',

    // GraphQL query timeout setting
    queryTimeout: options.queryTimeout,

    // GraphQL endpoint - explicitly specify route
    graphqlRoute: graphqlEndpoint,
    graphiqlRoute: '/graphiql', // GraphiQL interface route

    // Add custom plugins
    appendPlugins: [
      QueryFilterPlugin, // Must execute before SimpleNamingPlugin
      PgSimplifyInflectorPlugin, // Simplify field names, remove ByXxxAndYyy suffixes
      SimpleNamingPlugin, // Fixed field loss issue
      ConnectionFilterPlugin,
      AllFieldsFilterPlugin
    ],

    // Advanced configuration options for Connection Filter plugin
    graphileBuildOptions: {
      // Enable all supported operators
      connectionFilterAllowedOperators: [
        'isNull',
        'equalTo',
        'notEqualTo',
        'distinctFrom',
        'notDistinctFrom',
        'lessThan',
        'lessThanOrEqualTo',
        'greaterThan',
        'greaterThanOrEqualTo',
        'in',
        'notIn',
        'like',
        'notLike',
        'ilike',
        'notIlike',
        'similarTo',
        'notSimilarTo',
        'includes',
        'notIncludes',
        'includesInsensitive',
        'notIncludesInsensitive',
        'startsWith',
        'notStartsWith',
        'startsWithInsensitive',
        'notStartsWithInsensitive',
        'endsWith',
        'notEndsWith',
        'endsWithInsensitive',
        'notEndsWithInsensitive'
      ],

      // Support filtering for all field types - explicitly allow all types
      connectionFilterAllowedFieldTypes: [
        'String',
        'Int',
        'Float',
        'Boolean',
        'ID',
        'Date',
        'Time',
        'Datetime',
        'JSON',
        'BigInt'
      ],

      // Enable logical operators (and, or, not)
      connectionFilterLogicalOperators: true,

      // Enable relationship filtering
      connectionFilterRelations: true,

      // Enable computed column filtering
      connectionFilterComputedColumns: true,

      // Enable array filtering
      connectionFilterArrays: true,

      // Enable function filtering
      connectionFilterSetofFunctions: true,

      // Allow null input and empty object input
      connectionFilterAllowNullInput: true,
      connectionFilterAllowEmptyObjectInput: true
    },

    // Only include detected tables
    includeExtensionResources: false,

    // Exclude unnecessary tables
    ignoreTable: (tableName: string) => {
      // If no tables detected, allow all tables
      if (availableTables.length === 0) {
        return false;
      }
      // Otherwise only include detected tables
      return !availableTables.includes(tableName);
    },

    // Export schema (development environment)
    exportGqlSchemaPath: nodeEnv === 'development' ? 'sui-indexer-schema.graphql' : undefined
  };

  // If subscriptions are enabled, add additional PostgreSQL subscription configuration
  if (enableSubscriptions === 'true') {
    return {
      ...config,
      // Use dedicated subscription connection pool
      ownerConnectionString: options.databaseUrl,

      // WebSocket configuration
      websocketMiddlewares: [],

      // PostgreSQL settings - optimized for long-running subscriptions
      pgSettings: {
        statement_timeout: '0', // No timeout for subscription queries
        idle_in_transaction_session_timeout: '0', // Allow long transactions
        default_transaction_isolation: 'read committed'
      },

      // Retry on connection failure
      retryOnInitFail: true,

      // Performance optimization for subscriptions
      pgDefaultRole: undefined,
      jwtSecret: undefined,

      // Additional configuration for development environment
      ...(nodeEnv === 'development' && {
        queryCache: false, // Disable cache for real-time data
        allowExplain: true
      })
    };
  }

  return config;
}

// Export enhanced playground HTML generator
export function createPlaygroundHtml(options: PostGraphileConfigOptions): string {
  const { port, graphqlEndpoint, enableSubscriptions, availableTables } = options;

  // Build GraphQL and WebSocket endpoint URLs
  const baseUrl = `http://localhost:${port}`;
  const graphqlUrl = `${baseUrl}${graphqlEndpoint}`;
  const subscriptionUrl =
    enableSubscriptions === 'true' ? `ws://localhost:${port}${graphqlEndpoint}` : undefined;

  return createEnhancedPlayground({
    url: graphqlUrl,
    subscriptionUrl,
    title: 'Sui Indexer GraphQL Playground',
    subtitle: `Powerful GraphQL API | ${availableTables.length} tables discovered | ${
      enableSubscriptions === 'true'
        ? 'Real-time subscriptions supported'
        : 'Real-time subscriptions disabled'
    }`
  })(null as any, null as any, {});
}
