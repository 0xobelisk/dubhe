import { DocumentNode } from '@apollo/client';

// DubheMetadata type definition for JSON format dubhe configuration
export type DubheMetadata = {
  components: Array<
    Record<
      string,
      {
        fields: Array<Record<string, any>>;
        keys: string[];
      }
    >
  >;
  resources: Array<
    Record<
      string,
      {
        fields: Array<Record<string, any>>;
        keys: string[];
      }
    >
  >;
  enums: any[];
};

// Basic pagination information
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

// Connection response common type
export interface Connection<T> {
  edges: Array<{
    cursor: string;
    node: T;
  }>;
  pageInfo: PageInfo;
  totalCount?: number;
}

// Basic query parameters
export interface BaseQueryParams {
  first?: number;
  last?: number;
  after?: string;
  before?: string;
}

// Sort parameters
export interface OrderBy {
  field: string;
  direction: 'ASC' | 'DESC';
}

// JSON path sort parameters
export interface JsonPathOrder {
  path: string;
  direction: 'ASC' | 'DESC';
  type?: 'STRING' | 'INTEGER' | 'FLOAT' | 'BOOLEAN';
}

// Query filter base type
export interface FilterCondition {
  equalTo?: any;
  notEqualTo?: any;
  lessThan?: any;
  lessThanOrEqualTo?: any;
  greaterThan?: any;
  greaterThanOrEqualTo?: any;
  in?: any[];
  notIn?: any[];
  like?: string;
  notLike?: string;
  isNull?: boolean;
}

// String filter
export interface StringFilter extends FilterCondition {
  like?: string;
  notLike?: string;
  ilike?: string;
  notIlike?: string;
  startsWith?: string;
  endsWith?: string;
  includes?: string;
  notIncludes?: string;
}

// Number filter
export interface NumberFilter extends FilterCondition {
  lessThan?: number;
  lessThanOrEqualTo?: number;
  greaterThan?: number;
  greaterThanOrEqualTo?: number;
}

// Date filter
export interface DateFilter extends FilterCondition {
  lessThan?: string;
  lessThanOrEqualTo?: string;
  greaterThan?: string;
  greaterThanOrEqualTo?: string;
}

// Store table base type
export interface StoreTableRow {
  createdAtTimestampMs: string;
  updatedAtTimestampMs: string;
  [key: string]: any;
}

// Query builder type
export interface QueryBuilder<T> {
  where?: Record<string, any>;
  orderBy?: OrderBy[];
  first?: number;
  last?: number;
  after?: string;
  before?: string;
}

// Subscription type
export interface SubscriptionOptions {
  onData?: (data: any) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

// PostGraphile Listen subscription related types
export interface ListenPayload<T = any> {
  query: T;
}

export interface ListenSubscriptionResult<T = any> {
  listen: ListenPayload<T>;
}

// Advanced subscription options
export interface AdvancedSubscriptionOptions extends SubscriptionOptions {
  initialEvent?: boolean;
  variables?: Record<string, any>;
}

// Listen subscription configuration
export interface ListenSubscriptionConfig {
  topic: string;
  initialEvent?: boolean;
  filter?: Record<string, any>;
  orderBy?: OrderBy[];
  first?: number;
  fields?: string[];
}

// Query operation type
export type QueryOperation = 'query' | 'subscription';

// Typed GraphQL query
export interface TypedDocumentNode<TResult = any, TVariables = any>
  extends DocumentNode {
  __resultType?: TResult;
  __variablesType?: TVariables;
}

// Retry configuration options
export interface RetryOptions {
  max?: number;
  delay?: {
    initial?: number;
    max?: number;
    jitter?: boolean;
  };
  attempts?: {
    max?: number;
    retryIf?: (error: any, _operation: any) => boolean;
  };
}

// Query cache policy
export type CachePolicy =
  | 'cache-first'
  | 'network-only'
  | 'cache-only'
  | 'no-cache'
  | 'standby';

// Pagination cache strategy
export type PaginationCacheStrategy =
  | 'none'
  | 'filter-only'
  | 'filter-orderby'
  | 'table-level';

// Query options
export interface QueryOptions {
  cachePolicy?: CachePolicy;
  pollInterval?: number;
  notifyOnNetworkStatusChange?: boolean;
}

// GraphQL error types
export interface GraphQLFormattedError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
  extensions?: any;
}

// Query result
export interface QueryResult<TData = any> {
  data?: TData;
  loading: boolean;
  error?: Error;
  networkStatus: number;
  refetch: () => Promise<QueryResult<TData>>;
}

// Subscription result
export interface SubscriptionResult<TData = any> {
  data?: TData;
  loading: boolean;
  error?: Error;
}

// Multi-table subscription configuration
export interface MultiTableSubscriptionConfig {
  tableName: string;
  options?: SubscriptionOptions & {
    fields?: string[];
    filter?: Record<string, any>;
    initialEvent?: boolean;
    first?: number;
    orderBy?: OrderBy[];
    topicPrefix?: string;
  };
}

// Multi-table subscription result
export interface MultiTableSubscriptionResult {
  [tableName: string]: SubscriptionResult<{ listen: { query: any } }>;
}

// Multi-table subscription data result
export interface MultiTableSubscriptionData {
  [tableName: string]: {
    listen: {
      query: any;
    };
  };
}

// Dubhe component field
export interface DubheComponentField {
  type: string;
}

export interface DubheComponent {
  fields?: Record<string, string | DubheComponentField>;
  keys?: string[];
}

// Auto-parsed field information
export interface ParsedTableInfo {
  tableName: string;
  fields: string[];
  primaryKeys: string[];
  enumFields: Record<string, string[]>;
}

// Client configuration
export interface DubheClientConfig {
  endpoint: string;
  subscriptionEndpoint?: string;
  headers?: Record<string, string>;
  fetchOptions?: RequestInit;
  retryOptions?: RetryOptions;
  dubheMetadata?: any;
  cacheConfig?: {
    paginatedTables?: string[];
    strategy?: PaginationCacheStrategy;
    customMergeStrategies?: Record<
      string,
      {
        keyArgs?: string[];
        merge?: (existing: any, incoming: any) => any;
      }
    >;
  };
}
