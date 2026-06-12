import {
  ApolloClient,
  InMemoryCache,
  gql,
  createHttpLink,
  split,
  NormalizedCacheObject,
  Observable,
  from,
  ApolloLink,
  FetchPolicy,
  OperationVariables
} from '@apollo/client';
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import { RetryLink } from '@apollo/client/link/retry';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import pluralize from 'pluralize';

/**
 * Static field registry for Dubhe system tables.
 *
 * These tables are exposed via `store_dubhe_*` views in the graphql-server.
 * They are NOT in the DApp's dubhe.config schema, so `convertTableFields`
 * cannot auto-discover their fields. Registering them here means callers
 * can use `getAllTables('dubheDappMarketplaceFees', ...)` without passing
 * `fields` explicitly.
 *
 * Key: the simplified GraphQL field name (after SimpleNamingPlugin strips
 *      the `storeDubhe` prefix and removes the `all` prefix).
 * Value: camelCase GraphQL field names matching the PostGraphile schema.
 */
const SYSTEM_TABLE_FIELDS: Record<string, string[]> = {
  dubheDappMarketplaceFees: [
    'dappKey',
    'listingId',
    'coinType',
    'totalFee',
    'treasuryAmount',
    'dappAmount',
    'updatedAtCheckpoint',
    'lastUpdateDigest'
  ],
  dubheDappRuntimeState: [
    'dappKey',
    'admin',
    'paused',
    'settlementMode',
    'creditPool',
    'writeFeeShareBps',
    'lastRuntimeEvent',
    'lastRuntimeActor',
    'lastRuntimeAmount',
    'updatedAtCheckpoint',
    'lastUpdateDigest'
  ],
  dubheDappFeeState: [
    'entityId',
    'baseFeePerWrite',
    'bytesFeePerByte',
    'freeCredit',
    'creditPool',
    'totalSettled',
    'updatedAtTimestampMs',
    'lastUpdateDigest'
  ],
  dubheDappRevenueState: [
    'entityId',
    'dappRevenue',
    'coinType',
    'updatedAtTimestampMs',
    'lastUpdateDigest'
  ],
  dubheMarketplaceListings: [
    'dappKey',
    'listingId',
    'seller',
    'recordType',
    'price',
    'coinType',
    'isFungible',
    'listedUntil',
    'status',
    'updatedAtCheckpoint',
    'lastUpdateDigest'
  ],
  dubheSessions: [
    'dappKey',
    'canonical',
    'sessionWallet',
    'expiresAt',
    'active',
    'updatedAtCheckpoint',
    'lastUpdateDigest'
  ],
  dubheUserStorages: [
    'dappKey',
    'canonicalOwner',
    'userStorageId',
    'updatedAtCheckpoint',
    'lastUpdateDigest'
  ]
};

import {
  DubheClientConfig,
  Connection,
  BaseQueryParams,
  OrderBy,
  QueryOptions,
  QueryResult,
  SubscriptionResult,
  SubscriptionOptions,
  StoreTableRow,
  TypedDocumentNode,
  CachePolicy,
  MultiTableSubscriptionConfig,
  MultiTableSubscriptionData,
  ParsedTableInfo,
  DubheMetadata,
  MarketplaceListingRow,
  DubheSessionRow,
  DubheUserStorageRow,
  DubheDappRuntimeStateRow,
  SceneStorageRow,
  SceneStorageFieldRow,
  ObjectStorageRow
} from './types';

// Convert cache policy type
function mapCachePolicyToFetchPolicy(cachePolicy: CachePolicy): FetchPolicy {
  switch (cachePolicy) {
    case 'cache-first':
      return 'cache-first';
    case 'network-only':
      return 'network-only';
    case 'cache-only':
      return 'cache-only';
    case 'no-cache':
      return 'no-cache';
    case 'standby':
      return 'standby';
    default:
      return 'cache-first';
  }
}

/**
 * Build the HTTP transport link.
 *
 * When `config.batchRequests` is true, returns a `BatchHttpLink` that collects
 * queries fired within `batchInterval` ms (default 10 ms) and sends them as a
 * single POST request. The PostGraphile server already has `enableQueryBatching`
 * enabled, so no server-side changes are needed.
 *
 * Falls back to the standard `createHttpLink` when batching is disabled.
 */
function buildHttpLink(config: DubheClientConfig): ApolloLink {
  const fetchFn = (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, { ...config.fetchOptions, ...(init ?? {}) });

  if (config.batchRequests) {
    return new BatchHttpLink({
      uri: config.endpoint,
      headers: config.headers,
      fetch: fetchFn,
      batchInterval: config.batchInterval ?? 10,
      batchMax: config.batchMax ?? 20
    });
  }

  return createHttpLink({
    uri: config.endpoint,
    headers: config.headers,
    fetch: fetchFn
  });
}

export class DubheGraphqlClient {
  private apolloClient: ApolloClient<NormalizedCacheObject>;
  private subscriptionClient?: any;
  private dubheMetadata?: DubheMetadata;
  private parsedTables: Map<string, ParsedTableInfo> = new Map();
  private uniqueTableNames: Set<string> = new Set(); // Track unique table names from config
  private currentConfig: DubheClientConfig; // Store current configuration for updates

  constructor(config: DubheClientConfig) {
    // Save configuration
    this.currentConfig = config;

    // Save dubhe metadata
    this.dubheMetadata = config.dubheMetadata;

    // If dubhe metadata is provided, parse table information
    if (this.dubheMetadata) {
      this.parseTableInfoFromConfig();
    }

    // Create HTTP link (batched or standard depending on config.batchRequests)
    const httpLink = buildHttpLink(config);

    // Create retry link
    const retryLink = new RetryLink({
      delay: {
        // Initial retry delay time (milliseconds)
        initial: config.retryOptions?.delay?.initial || 300,
        // Maximum retry delay time (milliseconds)
        max: config.retryOptions?.delay?.max || 5000,
        // Whether to add random jitter to avoid thundering herd, enabled by default
        jitter: config.retryOptions?.delay?.jitter !== false
      },
      attempts: {
        // Maximum number of attempts (including initial request)
        max: config.retryOptions?.attempts?.max || 5,
        // Custom retry condition function
        retryIf:
          config.retryOptions?.attempts?.retryIf ||
          ((error, _operation) => {
            // Default retry strategy:
            // 1. Network connection errors
            // 2. Server errors but no GraphQL errors (indicates service temporarily unavailable)
            return Boolean(
              error &&
                (error.networkError || (error.graphQLErrors && error.graphQLErrors.length === 0))
            );
          })
      }
    });

    // Combine HTTP link and retry link
    const httpWithRetryLink = from([retryLink, httpLink]);

    let link: ApolloLink = httpWithRetryLink;

    // If subscription endpoint is provided, create WebSocket Link
    if (config.subscriptionEndpoint) {
      // Automatically import ws module in Node.js environment
      let webSocketImpl;
      try {
        // Check if in Node.js environment
        if (typeof window === 'undefined' && typeof global !== 'undefined') {
          // Node.js environment, need to import ws
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const wsModule = require('ws');
          webSocketImpl = wsModule.default || wsModule;

          // Set global WebSocket in Node.js environment to avoid apollo client internal errors
          if (typeof (global as any).WebSocket === 'undefined') {
            (global as any).WebSocket = webSocketImpl;
          }
        } else {
          // Browser environment, use native WebSocket
          webSocketImpl = WebSocket;
        }
      } catch (_error) {
        // Ignore ws import errors
      }

      const clientOptions: any = {
        url: config.subscriptionEndpoint,
        connectionParams: {
          headers: config.headers
        }
      };

      // Only add webSocketImpl if in Node.js environment and ws was successfully imported
      if (webSocketImpl && typeof window === 'undefined') {
        clientOptions.webSocketImpl = webSocketImpl;
      }

      this.subscriptionClient = createClient(clientOptions);

      const wsLink = new GraphQLWsLink(this.subscriptionClient);

      // Use split to decide which link to use
      link = split(
        ({ query }) => {
          const definition = getMainDefinition(query);
          return (
            definition.kind === 'OperationDefinition' && definition.operation === 'subscription'
          );
        },
        wsLink,
        httpWithRetryLink
      );
    }

    // Create Apollo Client instance
    this.apolloClient = new ApolloClient({
      link,
      cache:
        config.cacheConfig?.paginatedTables && config.cacheConfig.paginatedTables.length > 0
          ? new InMemoryCache({
              typePolicies: {
                // Configure cache strategy for Connection type
                Query: {
                  fields: this.buildCacheFields(config.cacheConfig)
                }
              }
            })
          : new InMemoryCache(), // Use simple cache by default
      defaultOptions: {
        watchQuery: {
          errorPolicy: 'all',
          notifyOnNetworkStatusChange: true
        },
        query: {
          errorPolicy: 'all'
        }
      }
    });
  }

  /**
   * Update configuration dynamically
   * @param config - Partial configuration to update (same type as constructor)
   */
  async updateConfig(config: Partial<DubheClientConfig>) {
    // Update all provided config properties
    if (config.endpoint !== undefined) {
      this.currentConfig.endpoint = config.endpoint;
    }
    if (config.subscriptionEndpoint !== undefined) {
      this.currentConfig.subscriptionEndpoint = config.subscriptionEndpoint;
    }
    if (config.headers !== undefined) {
      this.currentConfig.headers = config.headers;
    }
    if (config.fetchOptions !== undefined) {
      this.currentConfig.fetchOptions = config.fetchOptions;
    }
    if (config.retryOptions !== undefined) {
      this.currentConfig.retryOptions = config.retryOptions;
    }
    if (config.cacheConfig !== undefined) {
      this.currentConfig.cacheConfig = config.cacheConfig;
    }

    // Update dubhe metadata if provided
    if (config.dubheMetadata !== undefined) {
      this.dubheMetadata = config.dubheMetadata;
      // Clear and reparse tables
      this.parsedTables.clear();
      this.uniqueTableNames.clear();
      if (this.dubheMetadata) {
        this.parseTableInfoFromConfig();
      }
    }

    // Check if endpoints changed
    const endpointChanged = config.endpoint !== undefined;
    const subscriptionEndpointChanged = config.subscriptionEndpoint !== undefined;

    if (endpointChanged || subscriptionEndpointChanged) {
      // Close existing subscription client
      if (this.subscriptionClient) {
        try {
          await this.subscriptionClient.dispose();
        } catch (error) {
          console.error('Error disposing subscription client:', error);
          // Silently handle disposal errors
        }
        this.subscriptionClient = undefined;
      }

      // Recreate HTTP link (batched or standard depending on config)
      const httpLink = buildHttpLink(this.currentConfig);

      // Recreate retry link with current config
      const retryLink = new RetryLink({
        delay: {
          initial: this.currentConfig.retryOptions?.delay?.initial || 300,
          max: this.currentConfig.retryOptions?.delay?.max || 5000,
          jitter: this.currentConfig.retryOptions?.delay?.jitter !== false
        },
        attempts: {
          max: this.currentConfig.retryOptions?.attempts?.max || 5,
          retryIf:
            this.currentConfig.retryOptions?.attempts?.retryIf ||
            ((error, _operation) => {
              return Boolean(
                error &&
                  (error.networkError || (error.graphQLErrors && error.graphQLErrors.length === 0))
              );
            })
        }
      });

      const httpWithRetryLink = from([retryLink, httpLink]);
      let link: ApolloLink = httpWithRetryLink;

      // Recreate WebSocket Link if subscription endpoint provided
      if (this.currentConfig.subscriptionEndpoint) {
        let webSocketImpl;
        try {
          if (typeof window === 'undefined' && typeof global !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const wsModule = require('ws');
            webSocketImpl = wsModule.default || wsModule;
            if (typeof (global as any).WebSocket === 'undefined') {
              (global as any).WebSocket = webSocketImpl;
            }
          } else {
            webSocketImpl = WebSocket;
          }
        } catch (_error) {
          // Ignore ws import errors
        }

        const clientOptions: any = {
          url: this.currentConfig.subscriptionEndpoint,
          connectionParams: {
            headers: this.currentConfig.headers
          }
        };

        if (webSocketImpl && typeof window === 'undefined') {
          clientOptions.webSocketImpl = webSocketImpl;
        }

        this.subscriptionClient = createClient(clientOptions);
        const wsLink = new GraphQLWsLink(this.subscriptionClient);

        link = split(
          ({ query }) => {
            const definition = getMainDefinition(query);
            return (
              definition.kind === 'OperationDefinition' && definition.operation === 'subscription'
            );
          },
          wsLink,
          httpWithRetryLink
        );
      }

      // Recreate Apollo Client
      const oldCache = this.apolloClient.cache;
      this.apolloClient = new ApolloClient({
        link,
        cache:
          this.currentConfig.cacheConfig?.paginatedTables &&
          this.currentConfig.cacheConfig.paginatedTables.length > 0
            ? new InMemoryCache({
                typePolicies: {
                  Query: {
                    fields: this.buildCacheFields(this.currentConfig.cacheConfig)
                  }
                }
              })
            : new InMemoryCache(),
        defaultOptions: {
          watchQuery: {
            errorPolicy: 'all',
            notifyOnNetworkStatusChange: true
          },
          query: {
            errorPolicy: 'all'
          }
        }
      });

      // Optionally restore cache
      try {
        this.apolloClient.cache.restore(oldCache.extract());
      } catch (error) {
        console.error('Error restoring cache:', error);
        // Silently handle cache restore errors
      }
    }
  }

  /**
   * Execute GraphQL query
   */
  async query<TData, TVariables extends OperationVariables = OperationVariables>(
    query: TypedDocumentNode<TData, TVariables>,
    variables?: TVariables,
    options?: QueryOptions
  ): Promise<QueryResult<TData>> {
    try {
      const result = await this.apolloClient.query({
        query,
        variables,
        fetchPolicy: options?.cachePolicy
          ? mapCachePolicyToFetchPolicy(options.cachePolicy)
          : 'no-cache',
        // : 'cache-first',
        notifyOnNetworkStatusChange: options?.notifyOnNetworkStatusChange,
        pollInterval: options?.pollInterval
      });

      return {
        data: result.data,
        loading: result.loading,
        error: result.error,
        networkStatus: result.networkStatus,
        refetch: () => this.query(query, variables, options)
      };
    } catch (error) {
      return {
        data: undefined,
        loading: false,
        error: error as Error,
        networkStatus: 8, // NetworkStatus.error
        refetch: () => this.query(query, variables, options)
      };
    }
  }

  /**
   * Execute GraphQL subscription
   */
  subscribe<TData, TVariables extends OperationVariables = OperationVariables>(
    subscription: TypedDocumentNode<TData, TVariables>,
    variables?: TVariables,
    options?: SubscriptionOptions
  ): Observable<SubscriptionResult<TData>> {
    return new Observable((observer: any) => {
      const sub = this.apolloClient
        .subscribe({
          query: subscription,
          variables
        })
        .subscribe({
          next: (result: any) => {
            const subscriptionResult: SubscriptionResult<TData> = {
              data: result.data,
              loading: false,
              error: result.errors?.[0] as Error
            };
            observer.next(subscriptionResult);
            options?.onData?.(result.data);
          },
          error: (error: any) => {
            const subscriptionResult: SubscriptionResult<TData> = {
              data: undefined,
              loading: false,
              error
            };
            observer.next(subscriptionResult);
            options?.onError?.(error);
          },
          complete: () => {
            observer.complete();
            options?.onComplete?.();
          }
        });

      return () => sub.unsubscribe();
    });
  }

  /**
   * Query all table data - Adapted to API without store prefix
   *
   * OrderBy field name support:
   * - camelCase: { field: 'updatedAtTimestampMs', direction: 'DESC' } → UPDATED_AT_TIMESTAMP_MS_DESC
   * - snake_case: { field: 'updated_at', direction: 'DESC' } → UPDATED_AT_DESC
   *
   * Usage examples:
   * ```ts
   * // Using camelCase field names
   * const result = await client.getAllTables('account', {
   *   orderBy: [{ field: 'updatedAtTimestampMs', direction: 'DESC' }]
   * });
   *
   * // Using snake_case field names
   * const result = await client.getAllTables('account', {
   *   orderBy: [{ field: 'updated_at', direction: 'DESC' }]
   * });
   *
   * // Mixed usage
   * const result = await client.getAllTables('account', {
   *   orderBy: [
   *     { field: 'updatedAtTimestampMs', direction: 'DESC' },
   *     { field: 'created_at', direction: 'ASC' }
   *   ]
   * });
   * ```
   */
  async getAllTables<T extends StoreTableRow>(
    tableName: string,
    params?: BaseQueryParams & {
      filter?: Record<string, any>;
      orderBy?: OrderBy[];
      fields?: string[]; // Allow users to specify fields to query, auto-parse from dubhe config if not specified
    }
  ): Promise<Connection<T>> {
    // Ensure using plural form of table name
    const pluralTableName = this.getPluralTableName(tableName);

    // Convert OrderBy to enum values
    const orderByEnums = convertOrderByToEnum(params?.orderBy);

    // Dynamically build query
    const query = gql`
      query GetAllTables(
        $first: Int
        $last: Int
        $after: Cursor
        $before: Cursor
        $filter: ${this.getFilterTypeName(tableName)}
        $orderBy: [${this.getOrderByTypeName(tableName)}!]
      ) {
        ${pluralTableName}(
          first: $first
          last: $last
          after: $after
          before: $before
          filter: $filter
          orderBy: $orderBy
        ) {
          totalCount
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              ${this.convertTableFields(tableName, params?.fields)}
            }
          }
        }
      }
    `;

    // Build query parameters using enum values
    const queryParams = {
      first: params?.first,
      last: params?.last,
      after: params?.after,
      before: params?.before,
      filter: params?.filter,
      orderBy: orderByEnums
    };

    // const result = await this.query(query, queryParams, {
    //   cachePolicy: 'no-cache',
    // });

    const result = await this.query(query, queryParams);

    if (result.error) {
      throw result.error;
    }

    return (
      (result.data as any)?.[pluralTableName] || {
        edges: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false }
      }
    );
  }

  /**
   * TODO: Get GraphQL type for a field name
   */
  private getGraphQLType(fieldName: string): string {
    // uniqueResourceId is an Int type for resources without keys
    if (fieldName === 'uniqueResourceId') {
      return 'Int!';
    }
    // Default to String type
    return 'String!';
  }

  /**
   * Get single table record by condition - Adapted to API without store prefix
   */
  async getTableByCondition<T extends StoreTableRow>(
    tableName: string,
    condition: Record<string, any>,
    fields?: string[] // Allow users to specify fields to query
  ): Promise<T | null> {
    // Build query field name, e.g.: accountByAssetIdAndAccount
    const conditionKeys = Object.keys(condition);

    // Use singular form of table name for single record query
    const singularTableName = this.getSingularTableName(tableName);

    const query = gql`
      query GetTableByCondition(${conditionKeys
        .map((key) => `$${key}: ${this.getGraphQLType(key)}`)
        .join(', ')}) {
        ${singularTableName}(${conditionKeys.map((key) => `${key}: $${key}`).join(', ')}) {
          ${this.convertTableFields(tableName, fields)}
        }
      }
    `;

    const result = await this.query(query, condition);

    if (result.error) {
      throw result.error;
    }

    return (result.data as any)?.[singularTableName] || null;
  }

  /**
   * Subscribe to table data changes - Using PostGraphile's listen subscription feature
   */
  subscribeToTableChanges<_T extends StoreTableRow>(
    tableName: string,
    options?: SubscriptionOptions & {
      fields?: string[]; // Allow users to specify fields to subscribe to
      initialEvent?: boolean; // Whether to trigger initial event immediately
      first?: number; // Limit the number of returned records
      topicPrefix?: string; // Custom topic prefix, defaults to table name
      filter?: Record<string, any>; // Support filtering
      orderBy?: OrderBy[]; // Support custom ordering
    }
  ): Observable<SubscriptionResult<{ listen: { query: any } }>> {
    // PostGraphile automatically adds 'postgraphile:' prefix to all topics
    // So here we use more concise topic naming
    const topic = options?.topicPrefix
      ? `${options.topicPrefix}${tableName}`
      : `store_${this.getSingularTableName(tableName)}`;

    const pluralTableName = this.getPluralTableName(tableName); // Ensure using plural form
    const fields = this.convertTableFields(tableName, options?.fields);
    const orderByEnum = convertOrderByToEnum(options?.orderBy);
    const first = options?.first || 10;

    const subscription = gql`
      subscription ListenToTableChanges(
        $topic: String!, 
        $initialEvent: Boolean,
        $filter: ${this.getFilterTypeName(tableName)},
        $orderBy: [${this.getOrderByTypeName(tableName)}!],
        $first: Int
      ) {
        listen(topic: $topic, initialEvent: $initialEvent) {
          query {
            ${pluralTableName}(
              first: $first, 
              filter: $filter, 
              orderBy: $orderBy
            ) {
              totalCount
              nodes {
                ${fields}
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      }
    `;

    return this.subscribe(
      subscription,
      {
        topic,
        initialEvent: options?.initialEvent || false,
        filter: options?.filter,
        orderBy: orderByEnum,
        first
      },
      options
    );
  }

  /**
   * Advanced listen subscription - Support custom queries
   */
  subscribeWithListen<T = any>(
    topic: string,
    query: string,
    options?: SubscriptionOptions & {
      initialEvent?: boolean;
      variables?: Record<string, any>;
    }
  ): Observable<SubscriptionResult<{ listen: { query: T } }>> {
    const subscription = gql`
      subscription CustomListenSubscription($topic: String!, $initialEvent: Boolean) {
        listen(topic: $topic, initialEvent: $initialEvent) {
          query {
            ${query}
          }
        }
      }
    `;

    return this.subscribe(
      subscription,
      {
        topic,
        initialEvent: options?.initialEvent || false,
        ...options?.variables
      },
      options
    );
  }

  /**
   * Subscribe to multiple table data changes - Support batch subscription of table name list
   */
  subscribeToMultipleTables<T extends StoreTableRow>(
    tableConfigs: MultiTableSubscriptionConfig[],
    globalOptions?: SubscriptionOptions
  ): Observable<MultiTableSubscriptionData> {
    return new Observable((observer: any) => {
      const subscriptions: Array<{ tableName: string; subscription: any }> = [];
      const latestData: MultiTableSubscriptionData = {};

      // Create independent subscription for each table
      tableConfigs.forEach(({ tableName, options }) => {
        const subscription = this.subscribeToTableChanges<T>(tableName, {
          ...options,
          onData: (data: any) => {
            // Update latest data for this table
            latestData[tableName] = data;

            // Call table-level callback
            if (options?.onData) {
              options.onData(data);
            }

            // Call global callback
            if (globalOptions?.onData) {
              globalOptions.onData(latestData);
            }

            // Send complete multi-table data
            observer.next({ ...latestData });
          },
          onError: (error: any) => {
            // Call table-level error callback
            if (options?.onError) {
              options.onError(error);
            }

            // Call global error callback
            if (globalOptions?.onError) {
              globalOptions.onError(error);
            }

            // Send error
            observer.error(error);
          }
        });

        subscriptions.push({ tableName, subscription });
      });

      // Start all subscriptions
      const activeSubscriptions = subscriptions.map(({ subscription }) => subscription.subscribe());

      // Return cleanup function
      return () => {
        activeSubscriptions.forEach((sub) => sub.unsubscribe());

        // Call completion callback
        if (globalOptions?.onComplete) {
          globalOptions.onComplete();
        }
      };
    });
  }

  /**
   * Simplified multi-table subscription - Support table name array and unified configuration
   */
  subscribeToTableList<T extends StoreTableRow>(
    tableNames: string[],
    options?: SubscriptionOptions & {
      fields?: string[];
      filter?: Record<string, any>;
      initialEvent?: boolean;
      first?: number;
      topicPrefix?: string;
    }
  ): Observable<MultiTableSubscriptionData> {
    const tableConfigs: MultiTableSubscriptionConfig[] = tableNames.map((tableName) => ({
      tableName,
      options: {
        ...options,
        // Use same configuration for each table
        fields: options?.fields,
        filter: options?.filter,
        initialEvent: options?.initialEvent,
        first: options?.first,
        topicPrefix: options?.topicPrefix
      }
    }));

    return this.subscribeToMultipleTables<T>(tableConfigs, options);
  }

  /**
   * Build dynamic query - Adapted to API without store prefix
   */
  buildQuery(
    tableName: string,
    fields: string[],
    _params?: {
      filter?: Record<string, any>;
      orderBy?: OrderBy[];
      first?: number;
      after?: string;
    }
  ): TypedDocumentNode {
    const pluralTableName = this.getPluralTableName(tableName); // Ensure using plural form
    const fieldSelection = fields.join('\n        ');

    return gql`
      query DynamicQuery(
        $first: Int
        $after: Cursor
        $filter: ${this.getFilterTypeName(tableName)}
        $orderBy: [${this.getOrderByTypeName(tableName)}!]
      ) {
        ${pluralTableName}(
          first: $first
          after: $after
          filter: $filter
          orderBy: $orderBy
        ) {
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            cursor
            node {
              ${fieldSelection}
            }
          }
        }
      }
    `;
  }

  /**
   * Batch query multiple tables - Adapted to API without store prefix
   */
  async batchQuery<_T extends Record<string, any>>(
    queries: Array<{
      key: string;
      tableName: string;
      params?: BaseQueryParams & {
        filter?: Record<string, any>;
        orderBy?: OrderBy[];
        fields?: string[]; // Allow users to specify fields to query
      };
    }>
  ): Promise<Record<string, Connection<StoreTableRow>>> {
    const batchPromises = queries.map(async ({ key, tableName, params }) => {
      const result = await this.getAllTables(tableName, params);
      return { key, result };
    });

    const results = await Promise.all(batchPromises);

    return results.reduce((acc, { key, result }) => {
      acc[key] = result;
      return acc;
    }, {} as Record<string, Connection<StoreTableRow>>);
  }

  /**
   * Real-time data stream listener - Adapted to API without store prefix
   */
  createRealTimeDataStream<T extends StoreTableRow>(
    tableName: string,
    initialQuery?: BaseQueryParams & { filter?: Record<string, any> }
  ): Observable<Connection<T>> {
    return new Observable((observer: any) => {
      // First execute initial query
      this.getAllTables<T>(tableName, initialQuery)
        .then((initialData) => {
          observer.next(initialData);
        })
        .catch((error) => observer.error(error));

      // Then subscribe to real-time updates
      const subscription = this.subscribeToTableChanges<T>(tableName, {
        onData: () => {
          // When data changes, re-execute query
          this.getAllTables<T>(tableName, initialQuery)
            .then((updatedData) => {
              observer.next(updatedData);
            })
            .catch((error) => observer.error(error));
        },
        onError: (error) => observer.error(error)
      });

      return () => subscription.subscribe().unsubscribe();
    });
  }

  /**
   * Query marketplace listings indexed by the Dubhe indexer.
   * Uses the marketplace_listings PostgreSQL table (exposed as dubheMarketplaceListings in GraphQL).
   * The record_type field is pre-decoded text ("wheat", "corn", …) and status tracks
   * active/sold/cancelled directly — no extra RPC calls needed.
   */
  async getMarketplaceListings(options?: {
    dappKey?: string;
    status?: 'listed' | 'sold' | 'cancelled' | 'expired';
    recordType?: string;
    seller?: string;
    first?: number;
    after?: string;
  }): Promise<Connection<MarketplaceListingRow>> {
    const filter: Record<string, any> = {};
    if (options?.dappKey) filter.dappKey = { equalTo: options.dappKey };
    if (options?.status !== undefined) filter.status = { equalTo: options.status };
    if (options?.recordType) filter.recordType = { equalTo: options.recordType };
    if (options?.seller) filter.seller = { equalTo: options.seller };

    const query = gql`
      query GetMarketplaceListings(
        $first: Int
        $after: Cursor
        $filter: StoreDubheMarketplaceListingFilter
        $orderBy: [StoreDubheMarketplaceListingsOrderBy!]
      ) {
        dubheMarketplaceListings(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
          totalCount
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              listingId
              dappKey
              seller
              recordType
              recordDataRaw
              price
              coinType
              isFungible
              status
              buyer
              listedUntil
              createdAtCheckpoint
              updatedAtCheckpoint
              lastUpdateDigest
            }
          }
        }
      }
    `;

    const result = await this.apolloClient.query({
      query,
      variables: {
        first: options?.first ?? 100,
        after: options?.after,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        orderBy: ['CREATED_AT_CHECKPOINT_DESC']
      },
      fetchPolicy: 'network-only'
    });

    if (result.error) throw result.error;
    return (
      (result.data as any)?.dubheMarketplaceListings ?? {
        edges: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0
      }
    );
  }

  /**
   * Query session keys indexed by the Dubhe indexer (dubheSessions in GraphQL).
   */
  async getDubheSessions(options?: {
    dappKey?: string;
    canonical?: string;
    active?: boolean;
    first?: number;
    after?: string;
  }): Promise<Connection<DubheSessionRow>> {
    const filter: Record<string, any> = {};
    if (options?.dappKey) filter.dappKey = { equalTo: options.dappKey };
    if (options?.canonical) filter.canonical = { equalTo: options.canonical };
    if (options?.active !== undefined) filter.active = { equalTo: options.active };

    const query = gql`
      query GetDubheSessions(
        $first: Int
        $after: Cursor
        $filter: StoreDubheSessionFilter
        $orderBy: [StoreDubheSessionsOrderBy!]
      ) {
        dubheSessions(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
          totalCount
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              dappKey
              canonical
              sessionWallet
              expiresAt
              active
              updatedAtCheckpoint
              lastUpdateDigest
              lastEventSeq
            }
          }
        }
      }
    `;

    const result = await this.apolloClient.query({
      query,
      variables: {
        first: options?.first ?? 100,
        after: options?.after,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        orderBy: ['UPDATED_AT_CHECKPOINT_DESC']
      },
      fetchPolicy: 'network-only'
    });

    if (result.error) throw result.error;
    return (
      (result.data as any)?.dubheSessions ?? {
        edges: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0
      }
    );
  }

  /**
   * Query user storage registrations indexed by the Dubhe indexer (dubheUserStorages in GraphQL).
   */
  async getDubheUserStorages(options?: {
    dappKey?: string;
    canonicalOwner?: string;
    first?: number;
    after?: string;
  }): Promise<Connection<DubheUserStorageRow>> {
    const filter: Record<string, any> = {};
    if (options?.dappKey) filter.dappKey = { equalTo: options.dappKey };
    if (options?.canonicalOwner) filter.canonicalOwner = { equalTo: options.canonicalOwner };

    const query = gql`
      query GetDubheUserStorages(
        $first: Int
        $after: Cursor
        $filter: StoreDubheUserStorageFilter
        $orderBy: [StoreDubheUserStoragesOrderBy!]
      ) {
        dubheUserStorages(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
          totalCount
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              dappKey
              canonicalOwner
              userStorageId
              createdAtCheckpoint
              updatedAtCheckpoint
              lastUpdateDigest
              lastEventSeq
            }
          }
        }
      }
    `;

    const result = await this.apolloClient.query({
      query,
      variables: {
        first: options?.first ?? 100,
        after: options?.after,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        orderBy: ['CREATED_AT_CHECKPOINT_DESC']
      },
      fetchPolicy: 'network-only'
    });

    if (result.error) throw result.error;
    return (
      (result.data as any)?.dubheUserStorages ?? {
        edges: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0
      }
    );
  }

  /**
   * Query SceneStorage system rows indexed by the Dubhe indexer
   * (scene_storages table, exposed as dubheSceneStorages in GraphQL).
   * Field values live in the companion scene_storage_fields table —
   * see getSceneStorageFields.
   */
  async getSceneStorages(options?: {
    dappKey?: string;
    sceneType?: string;
    sceneId?: string;
    isDestroyed?: boolean;
    first?: number;
    after?: string;
  }): Promise<Connection<SceneStorageRow>> {
    const filter: Record<string, any> = {};
    if (options?.dappKey) filter.dappKey = { equalTo: options.dappKey };
    if (options?.sceneType) filter.sceneType = { equalTo: options.sceneType };
    if (options?.sceneId) filter.sceneId = { equalTo: options.sceneId };
    if (options?.isDestroyed !== undefined) filter.isDestroyed = { equalTo: options.isDestroyed };

    const query = gql`
      query GetSceneStorages(
        $first: Int
        $after: Cursor
        $filter: StoreDubheSceneStorageFilter
        $orderBy: [StoreDubheSceneStoragesOrderBy!]
      ) {
        dubheSceneStorages(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
          totalCount
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              sceneId
              dappKey
              sceneType
              authorizationKind
              authorizedPermitId
              isDestroyed
              createdAtCheckpoint
              updatedAtCheckpoint
              lastUpdateDigest
              lastEventSeq
            }
          }
        }
      }
    `;

    const result = await this.apolloClient.query({
      query,
      variables: {
        first: options?.first ?? 100,
        after: options?.after,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        orderBy: ['UPDATED_AT_CHECKPOINT_DESC']
      },
      fetchPolicy: 'network-only'
    });

    if (result.error) throw result.error;
    return (
      (result.data as any)?.dubheSceneStorages ?? {
        edges: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0
      }
    );
  }

  /**
   * Query raw field rows of SceneStorages (scene_storage_fields table,
   * exposed as dubheSceneStorageFields in GraphQL). Values are hex-encoded
   * BCS — decode with the decoders exported from this package.
   */
  async getSceneStorageFields(options?: {
    dappKey?: string;
    sceneIds?: string[];
    sceneId?: string;
    fieldName?: string;
    isDeleted?: boolean;
    first?: number;
    after?: string;
  }): Promise<Connection<SceneStorageFieldRow>> {
    const filter: Record<string, any> = {};
    if (options?.dappKey) filter.dappKey = { equalTo: options.dappKey };
    if (options?.sceneIds && options.sceneIds.length > 0) filter.sceneId = { in: options.sceneIds };
    if (options?.sceneId) filter.sceneId = { equalTo: options.sceneId };
    if (options?.fieldName) filter.fieldName = { equalTo: options.fieldName };
    if (options?.isDeleted !== undefined) filter.isDeleted = { equalTo: options.isDeleted };

    const query = gql`
      query GetSceneStorageFields(
        $first: Int
        $after: Cursor
        $filter: StoreDubheSceneStorageFieldFilter
        $orderBy: [StoreDubheSceneStorageFieldsOrderBy!]
      ) {
        dubheSceneStorageFields(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
          totalCount
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              sceneId
              dappKey
              sceneType
              fieldName
              fieldValueRaw
              isDeleted
              updatedAtCheckpoint
              lastUpdateDigest
              lastEventSeq
            }
          }
        }
      }
    `;

    const result = await this.apolloClient.query({
      query,
      variables: {
        first: options?.first ?? 1000,
        after: options?.after,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        orderBy: ['UPDATED_AT_CHECKPOINT_DESC']
      },
      fetchPolicy: 'network-only'
    });

    if (result.error) throw result.error;
    return (
      (result.data as any)?.dubheSceneStorageFields ?? {
        edges: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0
      }
    );
  }

  /**
   * Query ObjectStorage system rows indexed by the Dubhe indexer
   * (object_storages table, exposed as dubheObjectStorages in GraphQL).
   */
  async getObjectStorages(options?: {
    dappKey?: string;
    objectType?: string;
    objectId?: string;
    isDestroyed?: boolean;
    first?: number;
    after?: string;
  }): Promise<Connection<ObjectStorageRow>> {
    const filter: Record<string, any> = {};
    if (options?.dappKey) filter.dappKey = { equalTo: options.dappKey };
    if (options?.objectType) filter.objectType = { equalTo: options.objectType };
    if (options?.objectId) filter.objectId = { equalTo: options.objectId };
    if (options?.isDestroyed !== undefined) filter.isDestroyed = { equalTo: options.isDestroyed };

    const query = gql`
      query GetObjectStorages(
        $first: Int
        $after: Cursor
        $filter: StoreDubheObjectStorageFilter
        $orderBy: [StoreDubheObjectStoragesOrderBy!]
      ) {
        dubheObjectStorages(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
          totalCount
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              objectId
              dappKey
              objectType
              entityIdRaw
              isDestroyed
              createdAtCheckpoint
              updatedAtCheckpoint
              lastUpdateDigest
              lastEventSeq
            }
          }
        }
      }
    `;

    const result = await this.apolloClient.query({
      query,
      variables: {
        first: options?.first ?? 100,
        after: options?.after,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        orderBy: ['UPDATED_AT_CHECKPOINT_DESC']
      },
      fetchPolicy: 'network-only'
    });

    if (result.error) throw result.error;
    return (
      (result.data as any)?.dubheObjectStorages ?? {
        edges: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0
      }
    );
  }

  /**
   * Query DApp runtime state (credit pool, admin, package version, etc.).
   * Exposed as dubheDappRuntimeStates in GraphQL.
   */
  async getDubheDappRuntimeState(dappKey: string): Promise<DubheDappRuntimeStateRow | null> {
    const query = gql`
      query GetDubheDappRuntimeState($filter: StoreDubheDappRuntimeStateFilter) {
        dubheDappRuntimeStates(first: 1, filter: $filter) {
          edges {
            node {
              dappKey
              admin
              dappStorageId
              packageId
              version
              creditPool
              paused
              settlementMode
              createdAt
              createdAtCheckpoint
              updatedAtCheckpoint
              lastUpdateDigest
              lastEventSeq
            }
          }
        }
      }
    `;

    const result = await this.apolloClient.query({
      query,
      variables: { filter: { dappKey: { equalTo: dappKey } } },
      fetchPolicy: 'network-only'
    });

    if (result.error) throw result.error;
    const edges = (result.data as any)?.dubheDappRuntimeStates?.edges ?? [];
    return edges[0]?.node ?? null;
  }

  // Improved table name handling methods
  private getFilterTypeName(tableName: string): string {
    // Convert to singular form and apply PascalCase conversion
    const singularName = this.getSingularTableName(tableName);
    const pascalCaseName = this.toPascalCase(singularName);

    // If already starts with Store, don't add Store prefix again
    if (pascalCaseName.startsWith('Store')) {
      return `${pascalCaseName}Filter`;
    }

    return `Store${pascalCaseName}Filter`;
  }

  private getOrderByTypeName(tableName: string): string {
    // Convert to plural form and apply PascalCase conversion
    const pluralName = this.getPluralTableName(tableName);
    const pascalCaseName = this.toPascalCase(pluralName);

    // If already starts with Store, don't add Store prefix again
    if (pascalCaseName.startsWith('Store')) {
      return `${pascalCaseName}OrderBy`;
    }

    return `Store${pascalCaseName}OrderBy`;
  }

  /**
   * Convert singular table name to plural form (using pluralize library for correctness)
   */
  private getPluralTableName(tableName: string): string {
    // First convert to camelCase
    const camelCaseName = this.toCamelCase(tableName);

    // Use pluralize library for pluralization
    return pluralize.plural(camelCaseName);
  }

  /**
   * Convert plural table name to singular form (using pluralize library for correctness)
   */
  private getSingularTableName(tableName: string): string {
    // First convert to camelCase
    const camelCaseName = this.toCamelCase(tableName);

    // Use pluralize library for singularization
    return pluralize.singular(camelCaseName);
  }

  /**
   * Convert snake_case to camelCase
   */
  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Convert snake_case to PascalCase
   */
  private toPascalCase(str: string): string {
    const camelCase = this.toCamelCase(str);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  }

  /**
   * Convert camelCase or snake_case to SNAKE_CASE (for GraphQL enum values)
   * Example: updatedAt -> UPDATED_AT, updated_at -> UPDATED_AT
   */
  private toSnakeCase(str: string): string {
    // If already snake_case, convert to uppercase directly
    if (str.includes('_')) {
      return str.toUpperCase();
    }

    // If camelCase, first convert to snake_case then uppercase
    return str
      .replace(/([A-Z])/g, '_$1') // Add underscore before uppercase letters
      .toLowerCase() // Convert to lowercase
      .replace(/^_/, '') // Remove leading underscore
      .toUpperCase(); // Convert to uppercase
  }

  // private buildSingleQueryName(
  //   tableName: string,
  //   conditionKeys: string[]
  // ): string {
  //   // Use camelCase conversion
  //   const camelCaseTableName = this.toCamelCase(tableName);
  //   const capitalizedKeys = conditionKeys.map(
  //     (key) => key.charAt(0).toUpperCase() + key.slice(1)
  //   );
  //   return `${camelCaseTableName}By${capitalizedKeys.join('And')}`;
  // }

  /**
   * Clear Apollo Client cache
   */
  async clearCache(): Promise<void> {
    await this.apolloClient.clearStore();
  }

  /**
   * Reset Apollo Client cache
   */
  async resetCache(): Promise<void> {
    await this.apolloClient.resetStore();
  }

  /**
   * Get Apollo Client instance (for advanced usage)
   */
  getApolloClient(): ApolloClient<NormalizedCacheObject> {
    return this.apolloClient;
  }

  /**
   * Close client connection
   */
  close(): void {
    if (this.subscriptionClient) {
      this.subscriptionClient.dispose();
    }
  }

  /**
   * Get Dubhe metadata
   */
  getDubheMetadata(): DubheMetadata | undefined {
    return this.dubheMetadata;
  }

  /**
   * Build dynamic cache field configuration
   */
  private buildCacheFields(cacheConfig?: DubheClientConfig['cacheConfig']): Record<string, any> {
    const fields: Record<string, any> = {};

    // If no configuration, return empty field configuration
    if (!cacheConfig) {
      return fields;
    }

    // Create pagination cache strategy for each configured table
    if (cacheConfig.paginatedTables) {
      cacheConfig.paginatedTables.forEach((tableName) => {
        // Ensure using plural form of table name
        const pluralTableName = this.getPluralTableName(tableName);

        // Check if there's a custom merge strategy
        const customStrategy = cacheConfig.customMergeStrategies?.[pluralTableName];

        fields[pluralTableName] = {
          keyArgs: customStrategy?.keyArgs || ['filter', 'orderBy'],
          merge: customStrategy?.merge || this.defaultMergeStrategy
        };
      });
    }

    // Apply custom merge strategies (if any)
    if (cacheConfig.customMergeStrategies) {
      Object.entries(cacheConfig.customMergeStrategies).forEach(([tableName, strategy]) => {
        // If table name hasn't been configured yet, add it
        if (!fields[tableName]) {
          fields[tableName] = {
            keyArgs: strategy.keyArgs || ['filter', 'orderBy'],
            merge: strategy.merge || this.defaultMergeStrategy
          };
        }
      });
    }

    return fields;
  }

  /**
   * Default pagination merge strategy
   */
  private defaultMergeStrategy(existing = { edges: [] }, incoming: any) {
    // Safety check, ensure incoming has edges property
    if (!incoming || !Array.isArray(incoming.edges)) {
      return existing;
    }
    return {
      ...incoming,
      edges: [...(existing.edges || []), ...incoming.edges]
    };
  }

  /**
   * Parse table information from dubhe metadata
   */
  private parseTableInfoFromConfig(): void {
    if (!this.dubheMetadata) {
      return;
    }

    const { components = [], resources = [], enums = [] } = this.dubheMetadata;

    // Process components array
    components.forEach((componentObj: any) => {
      Object.entries(componentObj).forEach(([componentName, componentData]: [string, any]) => {
        this.processTableData(componentName, componentData, enums);
      });
    });

    // Process resources array
    resources.forEach((resourceObj: any) => {
      Object.entries(resourceObj).forEach(([resourceName, resourceData]: [string, any]) => {
        this.processTableData(resourceName, resourceData, enums);
      });
    });
  }

  /**
   * Process data for a single table
   */
  private processTableData(tableName: string, tableData: any, _enums: any[]): void {
    // Handle table name: convert to camelCase if it contains underscores, otherwise keep as is
    const normalizedTableName = tableName.includes('_') ? this.toCamelCase(tableName) : tableName;

    const fields: string[] = [];
    const enumFields: Record<string, string[]> = {};

    // Process fields array
    if (tableData.fields && Array.isArray(tableData.fields)) {
      tableData.fields.forEach((fieldObj: any) => {
        Object.entries(fieldObj).forEach(([fieldName, _fieldType]: [string, any]) => {
          const fieldNameCamelCase = this.toCamelCase(fieldName);
          fields.push(fieldNameCamelCase);
          // Check if it's an enum type
          // const typeStr = String(fieldType);
          // if (enums.length > 0) {
          //   // Process enum types as needed here
          //   // enumFields[fieldNameCamelCase] = [...];
          // }
        });
      });
    }

    // Add system fields
    fields.push('createdAtTimestampMs', 'updatedAtTimestampMs', 'isDeleted', 'lastUpdateDigest');

    // Process primary keys
    const primaryKeys: string[] = tableData.keys.map((key: string) => this.toCamelCase(key));

    const tableInfo: ParsedTableInfo = {
      tableName: normalizedTableName,
      fields: [...new Set(fields)], // Remove duplicates
      primaryKeys,
      enumFields
    };

    // Track unique table names from original config
    this.uniqueTableNames.add(tableName);

    // Store table info with multiple keys for lookup flexibility
    this.parsedTables.set(tableName, tableInfo);
    this.parsedTables.set(normalizedTableName, tableInfo);

    // If original and normalized table names are different, also store the snake_case version
    if (tableName !== normalizedTableName) {
      this.parsedTables.set(this.toSnakeCase(normalizedTableName), tableInfo);
    }
  }

  /**
   * Find table info with multiple lookup strategies
   */
  private findTableInfo(tableName: string): ParsedTableInfo | undefined {
    // Try direct lookup first
    let tableInfo = this.parsedTables.get(tableName);
    if (tableInfo) return tableInfo;

    // Try camelCase version
    const camelCaseTableName = this.toCamelCase(tableName);
    tableInfo = this.parsedTables.get(camelCaseTableName);
    if (tableInfo) return tableInfo;

    // Try snake_case version (only if it's different from original)
    if (tableName.includes('_')) {
      tableInfo = this.parsedTables.get(tableName.toLowerCase());
      if (tableInfo) return tableInfo;
    }

    return undefined;
  }

  /**
   * Get table field information
   */
  getTableFields(tableName: string): string[] {
    // Use getMinimalFields directly for clearer logic
    return this.getMinimalFields(tableName);
  }

  /**
   * Get table primary key information
   */
  getTablePrimaryKeys(tableName: string): string[] {
    const tableInfo = this.findTableInfo(tableName);
    return tableInfo?.primaryKeys || [];
  }

  /**
   * Get table enum field information
   */
  getTableEnumFields(tableName: string): Record<string, string[]> {
    const tableInfo = this.findTableInfo(tableName);
    return tableInfo?.enumFields || {};
  }

  /**
   * Get all parsed table information
   * Returns only unique tables from the original dubhe config (no duplicate names)
   */
  getAllTableInfo(): Map<string, ParsedTableInfo> {
    const uniqueTables = new Map<string, ParsedTableInfo>();

    // Only include tables that were originally defined in the config
    this.uniqueTableNames.forEach((tableName) => {
      const tableInfo = this.parsedTables.get(tableName);
      if (tableInfo) {
        uniqueTables.set(tableName, tableInfo);
      }
    });

    return uniqueTables;
  }

  /**
   * Get table's minimal field set (for fallback)
   */
  getMinimalFields(tableName: string): string[] {
    // If there's configuration, use fields from configuration
    const tableInfo = this.findTableInfo(tableName);

    if (tableInfo) {
      return tableInfo.fields;
    }

    return ['createdAtTimestampMs', 'updatedAtTimestampMs', 'isDeleted', 'lastUpdateDigest'];
  }

  /**
   * Convert table fields to GraphQL query string
   */
  private convertTableFields(tableName: string, customFields?: string[]): string {
    let fields: string[];

    if (customFields && customFields.length > 0) {
      fields = customFields;
    } else {
      // 1. Check system table registry first
      const systemFields = SYSTEM_TABLE_FIELDS[tableName];
      if (systemFields) {
        fields = systemFields;
      } else {
        // 2. Try to get fields from dubhe configuration (DApp store tables)
        const autoFields = this.getTableFields(tableName);
        if (autoFields.length > 0) {
          fields = autoFields;
        } else {
          // 3. Generic fallback for store_* tables
          fields = [
            'createdAtTimestampMs',
            'updatedAtTimestampMs',
            'isDeleted',
            'lastUpdateDigest'
          ];
        }
      }
    }

    // Field resolution debug logging disabled for cleaner output

    return fields.join('\n      ');
  }

  // ── Typed system-table query methods ─────────────────────────────────────

  /** Latest DApp fee state snapshot (credit_pool, total_settled, fee rates). */
  async getDappFeeState(): Promise<{
    entityId: string;
    baseFeePerWrite: string;
    bytesFeePerByte: string;
    freeCredit: string;
    creditPool: string;
    totalSettled: string;
    updatedAtTimestampMs: string;
  } | null> {
    const result = await this.getAllTables<any>('dubheDappFeeState', { first: 1 }).catch(
      () => null
    );
    return result?.edges?.[0]?.node ?? null;
  }

  /** Latest DApp revenue balance (USER_PAYS mode collected revenue). */
  async getDappRevenueState(): Promise<{
    entityId: string;
    dappRevenue: string;
    coinType: string;
    updatedAtTimestampMs: string;
  } | null> {
    const result = await this.getAllTables<any>('dubheDappRevenueState', { first: 1 }).catch(
      () => null
    );
    return result?.edges?.[0]?.node ?? null;
  }

  /** Latest DApp runtime state (admin, settlement mode, last event). */
  async getDappRuntimeState(): Promise<{
    dappKey: string;
    admin: string;
    paused: boolean;
    settlementMode: number;
    creditPool: string;
    writeFeeShareBps: number;
    lastRuntimeEvent: string;
    lastRuntimeActor: string;
    lastRuntimeAmount: string;
  } | null> {
    const result = await this.getAllTables<any>('dubheDappRuntimeState', { first: 1 }).catch(
      () => null
    );
    return result?.edges?.[0]?.node ?? null;
  }

  /** Marketplace fee records (one row per listing sold). */
  async getDappMarketplaceFees(options?: { first?: number; after?: string }): Promise<
    Connection<{
      dappKey: string;
      listingId: string;
      coinType: string;
      totalFee: string;
      treasuryAmount: string;
      dappAmount: string;
      updatedAtCheckpoint: string;
    }>
  > {
    return this.getAllTables<any>('dubheDappMarketplaceFees', {
      first: options?.first ?? 20,
      after: options?.after,
      orderBy: [{ field: 'updatedAtCheckpoint', direction: 'DESC' }]
    });
  }
}

// Export convenience function
export function createDubheGraphqlClient(config: DubheClientConfig): DubheGraphqlClient {
  return new DubheGraphqlClient(config);
}

// Export common GraphQL query builders
export const QueryBuilders = {
  // Build basic query - Adapted to API without store prefix
  basic: (
    tableName: string,
    fields: string[] = [
      'createdAtTimestampMs',
      'updatedAtTimestampMs',
      'isDeleted',
      'lastUpdateDigest'
    ]
  ) => gql`
    query Basic${tableName.charAt(0).toUpperCase() + tableName.slice(1)}Query(
      $first: Int
      $after: String
      $filter: ${tableName.charAt(0).toUpperCase() + tableName.slice(1)}Filter
    ) {
      ${tableName}(first: $first, after: $after, filter: $filter) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          cursor
          node {
            ${fields.join('\n            ')}
          }
        }
      }
    }
  `,

  // Build subscription query - Adapted to API without store prefix
  subscription: (tableName: string) => gql`
    subscription ${tableName.charAt(0).toUpperCase() + tableName.slice(1)}Subscription {
      ${tableName.charAt(0).toLowerCase() + tableName.slice(1)}Changed {
        createdAtTimestampMs
        updatedAtTimestampMs
        isDeleted
        lastUpdateDigest
      }
    }
  `
};

/**
 * Helper function: Convert OrderBy format
 * Support camelCase and snake_case field names conversion to GraphQL enum values
 * Example: updatedAt -> UPDATED_AT_ASC, updated_at -> UPDATED_AT_ASC
 */
function convertOrderByToEnum(orderBy?: OrderBy[]): string[] {
  if (!orderBy || orderBy.length === 0) {
    // return ['NATURAL'];
    return ['UPDATED_AT_TIMESTAMP_MS_DESC'];
  }

  return orderBy.map((order) => {
    // Use unified conversion function to handle field names
    const field = toSnakeCaseForEnum(order.field);
    const direction = order.direction === 'DESC' ? 'DESC' : 'ASC';

    // Combine field name and direction into enum value
    return `${field}_${direction}`;
  });
}

/**
 * Convert camelCase or snake_case to SNAKE_CASE (for GraphQL enum values)
 * Example: updatedAt -> UPDATED_AT, updated_at -> UPDATED_AT
 */
function toSnakeCaseForEnum(str: string): string {
  // If already snake_case, convert to uppercase directly
  if (str.includes('_')) {
    return str.toUpperCase();
  }

  // If camelCase, first convert to snake_case then uppercase
  return str
    .replace(/([A-Z])/g, '_$1') // Add underscore before uppercase letters
    .toLowerCase() // Convert to lowercase
    .replace(/^_/, '') // Remove leading underscore
    .toUpperCase(); // Convert to uppercase
}
