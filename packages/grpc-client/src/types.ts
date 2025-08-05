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

// gRPC Client Configuration
export interface DubheGrpcClientConfig {
  endpoint: string;
  enableRetry?: boolean;
  retryAttempts?: number;
  timeout?: number;
}

// Filter operators corresponding to protobuf FilterOperator enum
export enum FilterOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_THAN_EQUAL = 'GREATER_THAN_EQUAL',
  LESS_THAN = 'LESS_THAN',
  LESS_THAN_EQUAL = 'LESS_THAN_EQUAL',
  LIKE = 'LIKE',
  NOT_LIKE = 'NOT_LIKE',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  IS_NULL = 'IS_NULL',
  IS_NOT_NULL = 'IS_NOT_NULL',
  BETWEEN = 'BETWEEN',
  NOT_BETWEEN = 'NOT_BETWEEN',
}

// Sort direction corresponding to protobuf SortDirection enum
export enum SortDirection {
  ASCENDING = 'ASCENDING',
  DESCENDING = 'DESCENDING',
}

// Filter value types
export interface StringList {
  values: string[];
}

export interface IntList {
  values: number[];
}

export interface ValueRange {
  start?: string | number;
  end?: string | number;
}

// Filter value union type
export type FilterValue =
  | { stringValue: string }
  | { intValue: number }
  | { floatValue: number }
  | { boolValue: boolean }
  | { stringList: StringList }
  | { intList: IntList }
  | { range: ValueRange }
  | { nullValue: boolean };

// Filter condition corresponding to protobuf FilterCondition
export interface FilterCondition {
  fieldName: string;
  operator: FilterOperator;
  value: FilterValue;
}

// Sort specification corresponding to protobuf SortSpecification
export interface SortSpecification {
  fieldName: string;
  direction: SortDirection;
  priority?: number;
}

// Pagination request corresponding to protobuf PaginationRequest
export interface PaginationRequest {
  page: number;
  pageSize: number;
  offset?: number;
}

// Pagination response corresponding to protobuf PaginationResponse
export interface PaginationResponse {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Query request corresponding to protobuf QueryRequest
export interface QueryRequest {
  tableName: string;
  selectFields?: string[];
  filters?: FilterCondition[];
  sorts?: SortSpecification[];
  pagination?: PaginationRequest;
  includeTotalCount?: boolean;
}

// Query response corresponding to protobuf QueryResponse
export interface QueryResponse {
  rows: Record<string, any>[]; // google.protobuf.Struct becomes Record<string, any>
  pagination?: PaginationResponse;
}

// Subscribe request corresponding to protobuf SubscribeRequest
export interface SubscribeRequest {
  table_ids: string[]; // Use snake_case to match protobuf definition
}

// Table change corresponding to protobuf TableChange
export interface TableChange {
  table_id: string; // Use snake_case to match protobuf definition
  data: Record<string, any>; // google.protobuf.Struct becomes Record<string, any>
}

// Subscription callback types
export type SubscriptionCallback = (change: TableChange) => void;
export type ErrorCallback = (error: Error) => void;

// Subscription options
export interface SubscriptionOptions {
  onUpdate: SubscriptionCallback;
  onError?: ErrorCallback;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

// Query options
export interface QueryOptions {
  timeout?: number;
  retryAttempts?: number;
}

// Connection status
export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

// Client events
export interface ClientEvents {
  connect: () => void;
  disconnect: () => void;
  error: (error: Error) => void;
  reconnect: () => void;
}

// Helper types for building queries more easily
export interface SimpleFilter {
  [fieldName: string]:
    | string
    | number
    | boolean
    | null
    | string[]
    | number[]
    | { operator: FilterOperator; value: any }
    | { min: number | string; max: number | string }; // for BETWEEN
}

// Helper interface for building queries with simpler syntax
export interface SimpleQueryOptions {
  select?: string[];
  where?: SimpleFilter;
  orderBy?: string | { field: string; direction?: 'asc' | 'desc' }[];
  page?: number;
  pageSize?: number;
  offset?: number;
  includeTotalCount?: boolean;
}

// Utility type for query builder results
export interface QueryBuilder {
  tableName(name: string): QueryBuilder;
  select(...fields: string[]): QueryBuilder;
  where(conditions: SimpleFilter): QueryBuilder;
  orderBy(field: string, direction?: 'asc' | 'desc'): QueryBuilder;
  page(page: number, pageSize: number): QueryBuilder;
  offset(offset: number, limit: number): QueryBuilder;
  build(): QueryRequest;
}
