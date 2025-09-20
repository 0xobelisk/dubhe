import {
  ApolloClient,
  InMemoryCache,
  gql,
  createHttpLink,
  split,
  NormalizedCacheObject,
  WatchQueryOptions,
  QueryOptions as ApolloQueryOptions,
  SubscriptionOptions as ApolloSubscriptionOptions,
  Observable,
  from,
  ApolloLink,
  FetchPolicy,
  OperationVariables,
} from '@apollo/client';
import { RetryLink } from '@apollo/client/link/retry';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import pluralize from 'pluralize';

import {
  DubheClientConfig,
  Connection,
  BaseQueryParams,
  OrderBy,
  JsonPathOrder,
  QueryOptions,
  QueryResult,
  SubscriptionResult,
  SubscriptionOptions,
  StringFilter,
  NumberFilter,
  DateFilter,
  StoreTableRow,
  TypedDocumentNode,
  CachePolicy,
  MultiTableSubscriptionConfig,
  MultiTableSubscriptionResult,
  MultiTableSubscriptionData,
  ParsedTableInfo,
  DubheMetadata,
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

export class DubheGraphqlClient {
  private apolloClient: ApolloClient<NormalizedCacheObject>;
  private subscriptionClient?: any;
  private dubheMetadata?: DubheMetadata;
  private parsedTables: Map<string, ParsedTableInfo> = new Map();
  private uniqueTableNames: Set<string> = new Set(); // Track unique table names from config

  constructor(config: DubheClientConfig) {
    // Save dubhe metadata
    this.dubheMetadata = config.dubheMetadata;

    // If dubhe metadata is provided, parse table information
    if (this.dubheMetadata) {
      this.parseTableInfoFromConfig();
    }

    // Create HTTP Link
    const httpLink = createHttpLink({
      uri: config.endpoint,
      headers: config.headers,
      fetch: (input, init) => fetch(input, { ...config.fetchOptions, ...init }),
    });

    // Create retry link
    const retryLink = new RetryLink({
      delay: {
        // Initial retry delay time (milliseconds)
        initial: config.retryOptions?.delay?.initial || 300,
        // Maximum retry delay time (milliseconds)
        max: config.retryOptions?.delay?.max || 5000,
        // Whether to add random jitter to avoid thundering herd, enabled by default
        jitter: config.retryOptions?.delay?.jitter !== false,
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
                (error.networkError ||
                  (error.graphQLErrors && error.graphQLErrors.length === 0))
            );
          }),
      },
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
      } catch (error) {
        // Ignore ws import errors
      }

      const clientOptions: any = {
        url: config.subscriptionEndpoint,
        connectionParams: {
          headers: config.headers,
        },
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
            definition.kind === 'OperationDefinition' &&
            definition.operation === 'subscription'
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
        config.cacheConfig?.paginatedTables &&
        config.cacheConfig.paginatedTables.length > 0
          ? new InMemoryCache({
              typePolicies: {
                // Configure cache strategy for Connection type
                Query: {
                  fields: this.buildCacheFields(config.cacheConfig),
                },
              },
            })
          : new InMemoryCache(), // Use simple cache by default
      defaultOptions: {
        watchQuery: {
          errorPolicy: 'all',
          notifyOnNetworkStatusChange: true,
        },
        query: {
          errorPolicy: 'all',
        },
      },
    });
  }

  /**
   * Execute GraphQL query
   */
  async query<
    TData,
    TVariables extends OperationVariables = OperationVariables,
  >(
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
        pollInterval: options?.pollInterval,
      });

      return {
        data: result.data,
        loading: result.loading,
        error: result.error,
        networkStatus: result.networkStatus,
        refetch: () => this.query(query, variables, options),
      };
    } catch (error) {
      return {
        data: undefined,
        loading: false,
        error: error as Error,
        networkStatus: 8, // NetworkStatus.error
        refetch: () => this.query(query, variables, options),
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
          variables,
        })
        .subscribe({
          next: (result: any) => {
            const subscriptionResult: SubscriptionResult<TData> = {
              data: result.data,
              loading: false,
              error: result.errors?.[0] as Error,
            };
            observer.next(subscriptionResult);
            options?.onData?.(result.data);
          },
          error: (error: any) => {
            const subscriptionResult: SubscriptionResult<TData> = {
              data: undefined,
              loading: false,
              error,
            };
            observer.next(subscriptionResult);
            options?.onError?.(error);
          },
          complete: () => {
            observer.complete();
            options?.onComplete?.();
          },
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
      orderBy: orderByEnums,
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
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      }
    );
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
      query GetTableByCondition(${conditionKeys.map((key, index) => `$${key}: String!`).join(', ')}) {
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
  subscribeToTableChanges<T extends StoreTableRow>(
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
        first,
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
        ...options?.variables,
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
          },
        });

        subscriptions.push({ tableName, subscription });
      });

      // Start all subscriptions
      const activeSubscriptions = subscriptions.map(({ subscription }) =>
        subscription.subscribe()
      );

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
    const tableConfigs: MultiTableSubscriptionConfig[] = tableNames.map(
      (tableName) => ({
        tableName,
        options: {
          ...options,
          // Use same configuration for each table
          fields: options?.fields,
          filter: options?.filter,
          initialEvent: options?.initialEvent,
          first: options?.first,
          topicPrefix: options?.topicPrefix,
        },
      })
    );

    return this.subscribeToMultipleTables<T>(tableConfigs, options);
  }

  /**
   * Build dynamic query - Adapted to API without store prefix
   */
  buildQuery(
    tableName: string,
    fields: string[],
    params?: {
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
  async batchQuery<T extends Record<string, any>>(
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

    return results.reduce(
      (acc, { key, result }) => {
        acc[key] = result;
        return acc;
      },
      {} as Record<string, Connection<StoreTableRow>>
    );
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
        onError: (error) => observer.error(error),
      });

      return () => subscription.subscribe().unsubscribe();
    });
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
  private buildCacheFields(
    cacheConfig?: DubheClientConfig['cacheConfig']
  ): Record<string, any> {
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
        const customStrategy =
          cacheConfig.customMergeStrategies?.[pluralTableName];

        fields[pluralTableName] = {
          keyArgs: customStrategy?.keyArgs || ['filter', 'orderBy'],
          merge: customStrategy?.merge || this.defaultMergeStrategy,
        };
      });
    }

    // Apply custom merge strategies (if any)
    if (cacheConfig.customMergeStrategies) {
      Object.entries(cacheConfig.customMergeStrategies).forEach(
        ([tableName, strategy]) => {
          // If table name hasn't been configured yet, add it
          if (!fields[tableName]) {
            fields[tableName] = {
              keyArgs: strategy.keyArgs || ['filter', 'orderBy'],
              merge: strategy.merge || this.defaultMergeStrategy,
            };
          }
        }
      );
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
      edges: [...(existing.edges || []), ...incoming.edges],
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
      Object.entries(componentObj).forEach(
        ([componentName, componentData]: [string, any]) => {
          this.processTableData(componentName, componentData, enums);
        }
      );
    });

    // Process resources array
    resources.forEach((resourceObj: any) => {
      Object.entries(resourceObj).forEach(
        ([resourceName, resourceData]: [string, any]) => {
          this.processTableData(resourceName, resourceData, enums);
        }
      );
    });
  }

  /**
   * Process data for a single table
   */
  private processTableData(
    tableName: string,
    tableData: any,
    enums: any[]
  ): void {
    // Handle table name: convert to camelCase if it contains underscores, otherwise keep as is
    const normalizedTableName = tableName.includes('_')
      ? this.toCamelCase(tableName)
      : tableName;

    const fields: string[] = [];
    const enumFields: Record<string, string[]> = {};

    // Process fields array
    if (tableData.fields && Array.isArray(tableData.fields)) {
      tableData.fields.forEach((fieldObj: any) => {
        Object.entries(fieldObj).forEach(
          ([fieldName, fieldType]: [string, any]) => {
            const fieldNameCamelCase = this.toCamelCase(fieldName);
            fields.push(fieldNameCamelCase);
            // Check if it's an enum type
            // const typeStr = String(fieldType);
            // if (enums.length > 0) {
            //   // Process enum types as needed here
            //   // enumFields[fieldNameCamelCase] = [...];
            // }
          }
        );
      });
    }

    // Add system fields
    fields.push('createdAtTimestampMs', 'updatedAtTimestampMs', 'isDeleted');

    // Process primary keys
    const primaryKeys: string[] = tableData.keys.map((key: string) =>
      this.toCamelCase(key)
    );

    const tableInfo: ParsedTableInfo = {
      tableName: normalizedTableName,
      fields: [...new Set(fields)], // Remove duplicates
      primaryKeys,
      enumFields,
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

    return ['createdAtTimestampMs', 'updatedAtTimestampMs', 'isDeleted'];
  }

  /**
   * Convert table fields to GraphQL query string
   */
  private convertTableFields(
    tableName: string,
    customFields?: string[]
  ): string {
    let fields: string[];

    if (customFields && customFields.length > 0) {
      fields = customFields;
    } else {
      // Try to get fields from dubhe configuration
      const autoFields = this.getTableFields(tableName);
      if (autoFields.length > 0) {
        fields = autoFields;
      } else {
        fields = ['createdAtTimestampMs', 'updatedAtTimestampMs', 'isDeleted'];
      }
    }

    // Field resolution debug logging disabled for cleaner output

    return fields.join('\n      ');
  }
}

// Export convenience function
export function createDubheGraphqlClient(
  config: DubheClientConfig
): DubheGraphqlClient {
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
      }
    }
  `,
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
