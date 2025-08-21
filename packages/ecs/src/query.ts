// ECS query system implementation

import { DubheGraphqlClient } from '@0xobelisk/graphql-client';
import { EntityId, ComponentType, QueryOptions, PagedResult, PagedQueryResult } from './types';
import {
  extractIntersectionFromBatchResult,
  extractUnionFromBatchResult,
  extractPagedQueryResult,
  isValidEntityId,
  isValidComponentType,
  createCacheKey,
  paginateArray
} from './utils';
import { ComponentDiscoverer } from './world';

/**
 * ECS query system core implementation
 */
export class ECSQuery {
  private graphqlClient: DubheGraphqlClient;
  private queryCache = new Map<string, { result: EntityId[]; timestamp: number }>();
  private cacheTimeout = 5000; // 5 second cache timeout
  private availableComponents: ComponentType[] = [];
  private componentDiscoverer: ComponentDiscoverer | null = null;
  // Component primary key cache - pre-parsed during initialization
  private componentPrimaryKeys = new Map<ComponentType, string>();

  constructor(graphqlClient: DubheGraphqlClient, componentDiscoverer?: ComponentDiscoverer) {
    this.graphqlClient = graphqlClient;
    this.componentDiscoverer = componentDiscoverer || null;
  }

  /**
   * Set available component list
   */
  setAvailableComponents(componentTypes: ComponentType[]): void {
    this.availableComponents = componentTypes;
  }

  /**
   * Pre-parse and cache all component primary key information
   */
  initializeComponentMetadata(
    componentMetadataList: Array<{ name: ComponentType; primaryKeys: string[] }>
  ) {
    this.componentPrimaryKeys.clear();

    for (const metadata of componentMetadataList) {
      if (metadata.primaryKeys.length === 1) {
        this.componentPrimaryKeys.set(metadata.name, metadata.primaryKeys[0]);
      }
    }
  }

  /**
   * Get component's primary key field name (quickly retrieve from cache)
   */
  getComponentPrimaryKeyField(componentType: ComponentType): string {
    return this.componentPrimaryKeys.get(componentType) || 'entityId';
  }

  /**
   * Set component discoverer
   */
  setComponentDiscoverer(discoverer: ComponentDiscoverer): void {
    this.componentDiscoverer = discoverer;
  }

  private buildPaginationParams(options?: QueryOptions): {
    first?: number;
    last?: number;
    after?: string;
    before?: string;
  } {
    const params: {
      first?: number;
      last?: number;
      after?: string;
      before?: string;
    } = {};

    // Priority: new pagination params > legacy params
    if (options?.first !== undefined) {
      params.first = options.first;
    } else if (options?.limit !== undefined) {
      // Backward compatibility: map limit to first
      params.first = options.limit;
      if (options?.offset !== undefined) {
        console.warn(
          'ECS Query: offset parameter is not supported with GraphQL cursor-based pagination. Use after/before instead.'
        );
      }
    }

    if (options?.last !== undefined) {
      params.last = options.last;
    }

    if (options?.after !== undefined) {
      params.after = options.after;
    }

    if (options?.before !== undefined) {
      params.before = options.before;
    }

    return params;
  }

  /**
   * Get component field information
   */
  private async getComponentFields(componentType: ComponentType): Promise<string[]> {
    if (this.componentDiscoverer) {
      try {
        const metadata = this.componentDiscoverer.getComponentMetadata(componentType);
        if (metadata) {
          return metadata.fields.map((field) => field.name);
        }
      } catch (_error) {
        // Ignore error for now
      }
    }

    // Throw error when unable to auto-parse, requiring user to explicitly specify
    throw new Error(
      `Unable to get field information for component ${componentType}. Please explicitly specify fields in QueryOptions or ensure component discoverer is properly configured.`
    );
  }

  /**
   * Get component's primary key fields
   */
  private async getComponentPrimaryKeys(componentType: ComponentType): Promise<string[]> {
    if (this.componentDiscoverer) {
      try {
        const metadata = this.componentDiscoverer.getComponentMetadata(componentType);
        if (metadata && metadata.primaryKeys.length > 0) {
          return metadata.primaryKeys;
        }
      } catch (_error) {
        // Ignore error for now
      }
    }

    // Throw error when unable to auto-parse, requiring user to explicitly specify
    throw new Error(
      `Unable to get primary key information for component ${componentType}. Please explicitly specify idFields in QueryOptions or ensure component discoverer is properly configured.`
    );
  }

  /**
   * Get fields to use for queries (priority: user specified > dubhe config auto-parsed)
   */
  private async getQueryFields(
    componentType: ComponentType,
    userFields?: string[]
  ): Promise<string[]> {
    if (userFields && userFields.length > 0) {
      return userFields;
    }

    // Use dubhe config auto-parsed fields, will throw error if failed requiring explicit specification
    return this.getComponentFields(componentType);
  }

  /**
   * Check if entity exists
   */
  async hasEntity(entityId: EntityId): Promise<boolean> {
    if (!isValidEntityId(entityId)) return false;

    try {
      // Check entity existence by querying any possible component tables
      // This can be optimized to query a dedicated entity table
      const tables = await this.getAvailableComponents();
      for (const table of tables) {
        // for (const table of tables.slice(0, 3)) {
        // Only check first 3 tables to avoid too many queries
        try {
          const condition = this.buildEntityCondition(table, entityId);
          const component = await this.graphqlClient.getTableByCondition(table, condition);
          if (component) return true;
        } catch (_error) {
          // If query fails for a table, continue checking next table
        }
      }

      return false;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get all entity IDs (collected from all component tables)
   */
  async getAllEntities(): Promise<EntityId[]> {
    try {
      const tables = await this.getAvailableComponents();

      // Query all tables in parallel using cached field information
      const queries = await Promise.all(
        tables.map(async (table) => {
          const fields = await this.getQueryFields(table);
          const primaryKey = this.componentPrimaryKeys.get(table) || 'entityId';

          return {
            key: table,
            tableName: table,
            params: {
              fields: fields,
              filter: {}
            },
            primaryKey // Use cached primary key information
          };
        })
      );

      const batchResult = await this.graphqlClient.batchQuery(
        queries.map((q) => ({
          key: q.key,
          tableName: q.tableName,
          params: q.params
        }))
      );

      // Extract entity IDs using cached primary key fields
      return extractUnionFromBatchResult(batchResult, tables, {
        idFields: undefined, // Let extractEntityIds auto-infer
        composite: false
      });
    } catch (_error) {
      return [];
    }
  }

  /**
   * Get entity count
   */
  async getEntityCount(): Promise<number> {
    const entities = await this.getAllEntities();
    return entities.length;
  }

  /**
   * Check if entity has specific component
   */
  async hasComponent(entityId: EntityId, componentType: ComponentType): Promise<boolean> {
    if (!isValidEntityId(entityId) || !isValidComponentType(componentType)) {
      return false;
    }

    // Validate if it's an ECS-compliant component
    if (!this.isECSComponent(componentType)) {
      return false;
    }

    try {
      const condition = this.buildEntityCondition(componentType, entityId);
      const component = await this.graphqlClient.getTableByCondition(componentType, condition);
      return component !== null;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get specific component data of entity
   */
  async getComponent<T>(entityId: EntityId, componentType: ComponentType): Promise<T | null> {
    if (!isValidEntityId(entityId) || !isValidComponentType(componentType)) {
      return null;
    }

    // Validate if it's an ECS-compliant component
    if (!this.isECSComponent(componentType)) {
      return null;
    }

    try {
      const condition = this.buildEntityCondition(componentType, entityId);
      const component = await this.graphqlClient.getTableByCondition(componentType, condition);
      return component as T;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Get all component types that entity has
   */
  async getComponents(entityId: EntityId): Promise<ComponentType[]> {
    if (!isValidEntityId(entityId)) return [];

    try {
      const tables = await this.getAvailableComponents();
      const componentTypes: ComponentType[] = [];

      // Check if entity exists in each table
      await Promise.all(
        tables.map(async (table) => {
          const hasComp = await this.hasComponent(entityId, table);
          if (hasComp) {
            componentTypes.push(table);
          }
        })
      );

      return componentTypes;
    } catch (_error) {
      return [];
    }
  }

  /**
   * Validate if component type is ECS-compliant
   */
  private isECSComponent(componentType: ComponentType): boolean {
    return this.availableComponents.includes(componentType);
  }

  /**
   * Build entity query condition (using cached primary key field name)
   */
  private buildEntityCondition(
    componentType: ComponentType,
    entityId: EntityId
  ): Record<string, any> {
    // Get primary key field name from cache
    const primaryKeyField = this.componentPrimaryKeys.get(componentType);
    if (primaryKeyField) {
      return { [primaryKeyField]: entityId };
    } else {
      // If not in cache, fallback to default 'entityId' field
      return { entityId: entityId };
    }
  }

  /**
   * Filter and validate component type list, keeping only ECS-compliant components
   */
  private filterValidECSComponents(componentTypes: ComponentType[]): ComponentType[] {
    const validComponents = componentTypes.filter((componentType) => {
      if (!isValidComponentType(componentType)) {
        return false;
      }

      if (!this.isECSComponent(componentType)) {
        return false;
      }

      return true;
    });

    return validComponents;
  }

  /**
   * Query all entities that have a specific component with full pagination info
   */
  async queryWithFullPagination<T = any>(
    componentType: ComponentType,
    options?: QueryOptions
  ): Promise<PagedQueryResult<T>> {
    const emptyResult: PagedQueryResult<T> = {
      entityIds: [],
      items: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false
      },
      totalCount: 0
    };

    if (!isValidComponentType(componentType)) return emptyResult;

    // Validate if it's an ECS-compliant component
    if (!this.isECSComponent(componentType)) {
      return emptyResult;
    }

    try {
      // Intelligently get query fields and primary key information
      const queryFields = await this.getQueryFields(componentType, options?.fields);
      const primaryKeys = await this.getComponentPrimaryKeys(componentType);

      const paginationParams = this.buildPaginationParams(options);
      const connection = await this.graphqlClient.getAllTables(componentType, {
        ...paginationParams,
        fields: queryFields,
        orderBy: options?.orderBy
      });

      return extractPagedQueryResult(connection, {
        idFields: options?.idFields || primaryKeys,
        composite: options?.compositeId
      }) as PagedQueryResult<T>;
    } catch (_error) {
      return emptyResult;
    }
  }

  /**
   * Query all entities that have a specific component
   * Returns complete pagination information including entity IDs, actual data, and page info
   */
  async queryWith<T = any>(
    componentType: ComponentType,
    options?: QueryOptions
  ): Promise<PagedQueryResult<T>> {
    return this.queryWithFullPagination(componentType, options);
  }

  /**
   * Query entities that have all specified components (intersection)
   */
  async queryWithAll(componentTypes: ComponentType[], options?: QueryOptions): Promise<EntityId[]> {
    if (componentTypes.length === 0) return [];
    if (componentTypes.length === 1) {
      const result = await this.queryWith(componentTypes[0], options);
      return result.entityIds;
    }

    const validTypes = this.filterValidECSComponents(componentTypes);
    if (validTypes.length === 0) return [];

    const cacheKey = createCacheKey('queryWithAll', validTypes, options);
    const cached = this.getCachedResult(cacheKey);
    if (cached && options?.cache !== false) return cached;

    try {
      // Batch query all component tables using intelligent field resolution
      const paginationParams = this.buildPaginationParams(options);
      const queries = await Promise.all(
        validTypes.map(async (type) => {
          const queryFields = await this.getQueryFields(type, options?.fields);
          return {
            key: type,
            tableName: type,
            params: {
              fields: queryFields,
              ...paginationParams,
              orderBy: options?.orderBy
            }
          };
        })
      );

      const batchResult = await this.graphqlClient.batchQuery(queries);

      // If user didn't specify idFields, try using first component's primary key
      let idFields = options?.idFields;
      if (!idFields && validTypes.length > 0) {
        try {
          idFields = await this.getComponentPrimaryKeys(validTypes[0]);
        } catch (_error) {
          // If unable to get primary key, keep idFields undefined, let extractEntityIds auto-infer
        }
      }

      const result = extractIntersectionFromBatchResult(batchResult, validTypes, {
        idFields,
        composite: options?.compositeId
      });

      this.setCachedResult(cacheKey, result);
      return result;
    } catch (_error) {
      return [];
    }
  }

  /**
   * Query entities that have any of the specified components (union)
   */
  async queryWithAny(componentTypes: ComponentType[], options?: QueryOptions): Promise<EntityId[]> {
    if (componentTypes.length === 0) return [];
    if (componentTypes.length === 1) {
      const result = await this.queryWith(componentTypes[0], options);
      return result.entityIds;
    }

    const validTypes = this.filterValidECSComponents(componentTypes);
    if (validTypes.length === 0) return [];

    const cacheKey = createCacheKey('queryWithAny', validTypes, options);
    const cached = this.getCachedResult(cacheKey);
    if (cached && options?.cache !== false) return cached;

    try {
      // Batch query all component tables using intelligent field resolution
      const paginationParams = this.buildPaginationParams(options);
      const queries = await Promise.all(
        validTypes.map(async (type) => {
          const queryFields = await this.getQueryFields(type, options?.fields);
          return {
            key: type,
            tableName: type,
            params: {
              fields: queryFields,
              ...paginationParams,
              orderBy: options?.orderBy
            }
          };
        })
      );

      const batchResult = await this.graphqlClient.batchQuery(queries);

      // If user didn't specify idFields, try using first component's primary key
      let idFields = options?.idFields;
      if (!idFields && validTypes.length > 0) {
        try {
          idFields = await this.getComponentPrimaryKeys(validTypes[0]);
        } catch (_error) {
          // If unable to get primary key, keep idFields undefined, let extractEntityIds auto-infer
        }
      }

      const result = extractUnionFromBatchResult(batchResult, validTypes, {
        idFields,
        composite: options?.compositeId
      });

      this.setCachedResult(cacheKey, result);
      return result;
    } catch (_error) {
      return [];
    }
  }

  /**
   * Query entities that have include components but not exclude components
   */
  async queryWithout(
    includeTypes: ComponentType[],
    excludeTypes: ComponentType[],
    options?: QueryOptions
  ): Promise<EntityId[]> {
    if (includeTypes.length === 0) return [];

    // Validate include types are all ECS-compliant components
    const validIncludeTypes = this.filterValidECSComponents(includeTypes);
    if (validIncludeTypes.length === 0) return [];

    // Validate exclude types are all ECS-compliant components
    const validExcludeTypes = this.filterValidECSComponents(excludeTypes);

    try {
      // First get entities that have all include components
      const includedEntities = await this.queryWithAll(validIncludeTypes, options);

      if (validExcludeTypes.length === 0) return includedEntities;

      // Get entities that have any exclude components
      const excludedEntities = await this.queryWithAny(validExcludeTypes);
      const excludedSet = new Set(excludedEntities);

      // Remove excluded entities from included entities
      return includedEntities.filter((entityId) => !excludedSet.has(entityId));
    } catch (_error) {
      return [];
    }
  }

  /**
   * Query components based on conditions with full pagination info
   */
  async queryWhereFullPagination<T = any>(
    componentType: ComponentType,
    predicate: Record<string, any>,
    options?: QueryOptions
  ): Promise<PagedQueryResult<T>> {
    const emptyResult: PagedQueryResult<T> = {
      entityIds: [],
      items: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false
      },
      totalCount: 0
    };

    if (!isValidComponentType(componentType)) return emptyResult;

    // Validate if it's an ECS-compliant component
    if (!this.isECSComponent(componentType)) {
      return emptyResult;
    }

    try {
      // Intelligently get query fields and primary key information
      const queryFields = await this.getQueryFields(componentType, options?.fields);
      const primaryKeys = await this.getComponentPrimaryKeys(componentType);

      const paginationParams = this.buildPaginationParams(options);
      const connection = await this.graphqlClient.getAllTables(componentType, {
        filter: predicate,
        ...paginationParams,
        fields: queryFields,
        orderBy: options?.orderBy
      });

      return extractPagedQueryResult(connection, {
        idFields: options?.idFields || primaryKeys,
        composite: options?.compositeId
      }) as PagedQueryResult<T>;
    } catch (_error) {
      return emptyResult;
    }
  }

  /**
   * Query components based on conditions
   */
  async queryWhere<_T = any>(
    componentType: ComponentType,
    predicate: Record<string, any>,
    options?: QueryOptions
  ): Promise<EntityId[]> {
    const result = await this.queryWhereFullPagination(componentType, predicate, options);
    return result.entityIds;
  }

  /**
   * Range query
   */
  async queryRange(
    componentType: ComponentType,
    field: string,
    min: any,
    max: any,
    options?: QueryOptions
  ): Promise<EntityId[]> {
    if (!isValidComponentType(componentType)) return [];

    // Validate if it's an ECS-compliant component
    if (!this.isECSComponent(componentType)) {
      return [];
    }

    const predicate = {
      [field]: {
        greaterThanOrEqualTo: min,
        lessThanOrEqualTo: max
      }
    };

    return this.queryWhere(componentType, predicate, options);
  }

  /**
   * Paginated query
   */
  async queryPaged(
    componentTypes: ComponentType[],
    page: number,
    pageSize: number
  ): Promise<PagedResult<EntityId>> {
    try {
      const allResults =
        componentTypes.length === 1
          ? (await this.queryWith(componentTypes[0])).entityIds
          : await this.queryWithAll(componentTypes);

      return paginateArray(allResults, page, pageSize);
    } catch (_error) {
      return {
        items: [],
        totalCount: 0,
        hasMore: false,
        page,
        pageSize
      };
    }
  }

  /**
   * Create query builder
   */
  query(): ECSQueryBuilder {
    return new ECSQueryBuilder(this);
  }

  /**
   * Get cached result
   */
  private getCachedResult(cacheKey: string): EntityId[] | null {
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }
    return null;
  }

  /**
   * Set cached result
   */
  private setCachedResult(cacheKey: string, result: EntityId[]): void {
    this.queryCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clean expired cache
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.queryCache.entries()) {
      if (now - cached.timestamp >= this.cacheTimeout) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Get available component list
   */
  private async getAvailableComponents(): Promise<string[]> {
    if (this.availableComponents.length > 0) {
      return this.availableComponents;
    }

    // Return empty array by default, set by component discovery system
    return [];
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.queryCache.clear();
  }
}

/**
 * Query builder implementation
 */
export class ECSQueryBuilder {
  private ecsQuery: ECSQuery;
  private includeTypes: ComponentType[] = [];
  private excludeTypes: ComponentType[] = [];
  private whereConditions: Array<{
    componentType: ComponentType;
    predicate: Record<string, any>;
  }> = [];
  private orderByOptions: Array<{
    componentType: ComponentType;
    field: string;
    direction: 'ASC' | 'DESC';
  }> = [];
  private limitValue?: number;
  private offsetValue?: number;

  constructor(ecsQuery: ECSQuery) {
    this.ecsQuery = ecsQuery;
  }

  with(...componentTypes: ComponentType[]): ECSQueryBuilder {
    this.includeTypes.push(...componentTypes);
    return this;
  }

  without(...componentTypes: ComponentType[]): ECSQueryBuilder {
    this.excludeTypes.push(...componentTypes);
    return this;
  }

  where<_T = any>(componentType: ComponentType, predicate: Record<string, any>): ECSQueryBuilder {
    this.whereConditions.push({ componentType, predicate });
    return this;
  }

  orderBy(
    componentType: ComponentType,
    field: string,
    direction: 'ASC' | 'DESC' = 'ASC'
  ): ECSQueryBuilder {
    this.orderByOptions.push({ componentType, field, direction });
    return this;
  }

  limit(count: number): ECSQueryBuilder {
    this.limitValue = count;
    return this;
  }

  offset(count: number): ECSQueryBuilder {
    this.offsetValue = count;
    return this;
  }

  async execute(): Promise<EntityId[]> {
    try {
      const options: QueryOptions = {
        limit: this.limitValue,
        offset: this.offsetValue,
        orderBy: this.orderByOptions.map((order) => ({
          field: order.field,
          direction: order.direction
        }))
      };

      // If there are where conditions, handle filtering first
      if (this.whereConditions.length > 0) {
        const filteredResults: EntityId[][] = [];

        for (const condition of this.whereConditions) {
          const result = await this.ecsQuery.queryWhere(
            condition.componentType,
            condition.predicate,
            options
          );
          filteredResults.push(result);
        }

        // Find intersection
        const intersection = filteredResults.reduce((acc, current) => {
          const currentSet = new Set(current);
          return acc.filter((id) => currentSet.has(id));
        });

        return intersection;
      }

      // Handle basic include/exclude queries
      if (this.excludeTypes.length > 0) {
        return this.ecsQuery.queryWithout(this.includeTypes, this.excludeTypes, options);
      } else {
        return this.ecsQuery.queryWithAll(this.includeTypes, options);
      }
    } catch (_error) {
      return [];
    }
  }
}
