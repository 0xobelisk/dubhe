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

// ECS type definitions

export type EntityId = string;
export type ComponentType = string;

// Unsubscribe function
export type Unsubscribe = () => void;

// Component callback functions
export type ComponentCallback<T> = (entityId: EntityId, component: T) => void;
export type ComponentChangeCallback<T> = (
  entityId: EntityId,
  oldComponent: T,
  newComponent: T
) => void;
export type EntityCallback = (entityId: EntityId) => void;

// Query change results
export interface QueryChange {
  added: EntityId[]; // Newly matched entities
  removed: EntityId[]; // Entities that no longer match
  current: EntityId[]; // All currently matched entities
}

export type QueryChangeCallback = (changes: QueryChange) => void;

// Query watcher
export interface QueryWatcher {
  unsubscribe: Unsubscribe;
  getCurrentResults: () => EntityId[];
}

// Paginated query results (legacy)
export interface PagedResult<T = EntityId> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
}

// Complete paginated query results with GraphQL connection info
export interface PagedQueryResult<T = any> {
  // Entity IDs for ECS queries
  entityIds: EntityId[];
  // Actual data items (can be component data, resource data, etc.)
  items: T[];
  // GraphQL pagination info
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  // Total count of items
  totalCount: number;
}

// Batch query results
export interface BatchQueryResult {
  [componentType: string]: EntityId[];
}

// Component change events
export interface ComponentChangeEvent<T = any> {
  entityId: EntityId;
  componentType: ComponentType;
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED';
  oldValue?: T;
  newValue?: T;
  timestamp: number;
}

// Entity change events
export interface EntityChangeEvent {
  entityId: EntityId;
  changeType: 'CREATED' | 'DESTROYED';
  componentTypes: ComponentType[];
  timestamp: number;
}

// Query options
export interface QueryOptions {
  fields?: string[]; // Field names to query
  idFields?: string[]; // Field names to use as entity ID, defaults to ['nodeId', 'entityId']
  compositeId?: boolean; // Whether to compose multiple fields as ID, defaults to false

  // GraphQL pagination parameters (aligned with GraphQL client)
  first?: number; // Get first N records (replaces limit)
  last?: number; // Get last N records
  after?: string; // Cursor-based pagination start position
  before?: string; // Cursor-based pagination end position

  // Legacy pagination parameters (for backward compatibility, will be converted)
  limit?: number; // Will be mapped to first
  offset?: number; // Will be ignored with warning (use cursor-based pagination instead)

  filters?: Record<string, any>;

  orderBy?: Array<{
    field: string;
    direction: 'ASC' | 'DESC';
  }>;
  cache?: boolean;
}

// Subscription options
export interface SubscriptionOptions {
  initialEvent?: boolean;
  debounceMs?: number;
  filter?: Record<string, any>;
}

// Component metadata
export interface ComponentMetadata {
  name: ComponentType;
  tableName: string; // Corresponding database table name
  description?: string; // Component description
  fields: ComponentField[]; // Field information
  primaryKeys: string[]; // Primary key field list
  hasDefaultId: boolean; // Whether has default ID field
  enumFields: string[]; // Enum field list
  lastUpdated: number; // Last updated timestamp
}

// Component field information
export interface ComponentField {
  name: string;
  type: string; // GraphQL type
  nullable: boolean;
  description?: string;
  isEnum?: boolean; // Whether is enum field
  isPrimaryKey?: boolean; // Whether is primary key field
}

// Component discovery results
export interface ComponentDiscoveryResult {
  components: ComponentMetadata[];
  discoveredAt: number;
  errors?: string[];
  totalDiscovered?: number; // Total number of discovered components
  fromDubheMetadata?: boolean; // Whether from dubhe metadata
}

// Resource metadata
export interface ResourceMetadata {
  name: string;
  tableName: string; // Corresponding database table name
  description?: string; // Resource description
  fields: ComponentField[]; // Field information
  primaryKeys: string[]; // Primary key field list
  hasCompositeKeys: boolean; // Whether has composite primary keys
  hasNoKeys: boolean; // Whether has no primary keys
  enumFields: string[]; // Enum field list
  lastUpdated: number; // Last updated timestamp
}

// Resource discovery results
export interface ResourceDiscoveryResult {
  resources: ResourceMetadata[];
  discoveredAt: number;
  errors?: string[];
  totalDiscovered?: number; // Total number of discovered resources
  fromDubheMetadata?: boolean; // Whether from dubhe metadata
}

// ECS world configuration
export interface ECSWorldConfig {
  // Dubhe Metadata (JSON format, optional - if not provided, gets from GraphQL client)
  dubheMetadata?: DubheMetadata;

  // Query configuration
  queryConfig?: {
    defaultCacheTimeout?: number; // Default cache timeout
    maxConcurrentQueries?: number; // Maximum concurrent queries
    enableBatchOptimization?: boolean; // Enable batch query optimization
  };

  // Subscription configuration
  subscriptionConfig?: {
    defaultDebounceMs?: number; // Default debounce time
    maxSubscriptions?: number; // Maximum subscriptions
    reconnectOnError?: boolean; // Auto reconnect on error
  };
}
