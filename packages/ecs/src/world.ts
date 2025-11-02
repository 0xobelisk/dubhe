// ECS World main class implementation

import { DubheGraphqlClient } from '@0xobelisk/graphql-client';
import { ECSQuery } from './query';
import { ECSSubscription } from './subscription';
import {
  EntityId,
  ComponentType,
  QueryOptions,
  SubscriptionOptions,
  PagedResult,
  PagedQueryResult,
  ECSWorldConfig,
  ComponentMetadata,
  ComponentDiscoveryResult,
  ComponentField,
  ResourceMetadata,
  ResourceDiscoveryResult,
  DubheMetadata
} from './types';
import { formatError } from './utils';

/**
 * Component Discoverer - Supports DubheMetadata JSON format
 */
export class ComponentDiscoverer {
  private graphqlClient: DubheGraphqlClient;
  public dubheMetadata: DubheMetadata;
  public discoveryResult: ComponentDiscoveryResult;
  public componentMetadataMap = new Map<ComponentType, ComponentMetadata>();
  public componentTypes: ComponentType[] = [];

  constructor(graphqlClient: DubheGraphqlClient, dubheMetadata: DubheMetadata) {
    this.graphqlClient = graphqlClient;
    this.dubheMetadata = dubheMetadata;

    const components: ComponentMetadata[] = [];
    const errors: string[] = [];

    this.parseFromDubheMetadata(components, errors);

    const result: ComponentDiscoveryResult = {
      components,
      discoveredAt: Date.now(),
      errors: errors.length > 0 ? errors : undefined,
      totalDiscovered: components.length,
      fromDubheMetadata: true
    };

    this.discoveryResult = result;
    this.componentTypes = components.map((comp) => comp.name);

    components.forEach((comp) => {
      this.componentMetadataMap.set(comp.name, comp);
    });
  }

  /**
   * Parse components from DubheMetadata JSON format
   */
  private parseFromDubheMetadata(components: ComponentMetadata[], errors: string[]): void {
    if (!this.dubheMetadata?.components) {
      return;
    }

    for (const componentRecord of this.dubheMetadata.components) {
      for (const [componentName, componentConfig] of Object.entries(componentRecord)) {
        const componentType = this.tableNameToComponentName(componentName);

        try {
          const fields: ComponentField[] = [];
          const primaryKeys: string[] = [];
          const enumFields: string[] = [];

          if (componentConfig.fields && Array.isArray(componentConfig.fields)) {
            for (const fieldRecord of componentConfig.fields) {
              for (const [fieldName, fieldType] of Object.entries(fieldRecord)) {
                const camelFieldName = this.snakeToCamel(fieldName);
                const typeStr = String(fieldType);

                const isCustomKey =
                  componentConfig.keys && componentConfig.keys.includes(fieldName);

                fields.push({
                  name: camelFieldName,
                  type: this.dubheTypeToGraphQLType(typeStr),
                  nullable: !isCustomKey,
                  isPrimaryKey: isCustomKey,
                  isEnum: this.isEnumType(typeStr)
                });

                if (isCustomKey) {
                  primaryKeys.push(camelFieldName);
                }

                if (this.isEnumType(typeStr)) {
                  enumFields.push(camelFieldName);
                }
              }
            }
          }

          // Add default entityId if no custom primary key
          if (primaryKeys.length === 0) {
            fields.unshift({
              name: 'entityId',
              type: 'String',
              nullable: false,
              isPrimaryKey: true,
              isEnum: false
            });
            primaryKeys.push('entityId');
          }

          // Add system fields
          fields.push(
            {
              name: 'createdAtTimestampMs',
              type: 'BigInt',
              nullable: false,
              isPrimaryKey: false,
              isEnum: false
            },
            {
              name: 'updatedAtTimestampMs',
              type: 'BigInt',
              nullable: false,
              isPrimaryKey: false,
              isEnum: false
            },
            {
              name: 'isDeleted',
              type: 'Boolean',
              nullable: false,
              isPrimaryKey: false,
              isEnum: false
            },
            {
              name: 'lastUpdateDigest',
              type: 'String',
              nullable: false,
              isPrimaryKey: false,
              isEnum: false
            }
          );

          // Only register as ECS component if it has a single primary key
          if (primaryKeys.length !== 1) {
            continue;
          }

          const metadata: ComponentMetadata = {
            name: componentType,
            tableName: componentName,
            fields,
            primaryKeys,
            hasDefaultId: primaryKeys.includes('entityId'),
            enumFields,
            lastUpdated: Date.now(),
            description: `Auto-discovered component: ${componentName}`
          };

          components.push(metadata);
        } catch (error) {
          const errorMsg = `Component ${componentType} validation failed: ${formatError(error)}`;
          errors.push(errorMsg);
        }
      }
    }
  }

  getComponentTypes(): ComponentType[] {
    return this.componentTypes;
  }

  getComponentMetadata(componentType: ComponentType): ComponentMetadata | null {
    return this.componentMetadataMap.get(componentType) || null;
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private dubheTypeToGraphQLType(dubheType: string): string {
    if (dubheType.startsWith('vector<') && dubheType.endsWith('>')) {
      return 'String';
    }

    switch (dubheType) {
      case 'u8':
      case 'u16':
      case 'u32':
      case 'u64':
      case 'u128':
      case 'i8':
      case 'i16':
      case 'i32':
      case 'i64':
      case 'i128':
        return 'Int';
      case 'address':
      case 'string':
        return 'String';
      case 'bool':
        return 'Boolean';
      case 'enum':
        return 'String';
      default:
        return 'String';
    }
  }

  private componentNameToTableName(componentName: string): string {
    if (!componentName.endsWith('s')) {
      return componentName + 's';
    }
    return componentName;
  }

  private tableNameToComponentName(tableName: string): string {
    if (tableName.endsWith('s') && tableName.length > 1) {
      return tableName.slice(0, -1);
    }
    return tableName;
  }

  private isEnumType(typeStr: string): boolean {
    return this.dubheMetadata.enums.some(
      (enumDef: any) => typeof enumDef === 'object' && enumDef[typeStr]
    );
  }
}

/**
 * Resource Discoverer - Supports DubheMetadata JSON format
 */
export class ResourceDiscoverer {
  private graphqlClient: DubheGraphqlClient;
  public dubheMetadata: DubheMetadata;
  public discoveryResult: ResourceDiscoveryResult;
  public resourceMetadataMap = new Map<string, ResourceMetadata>();
  public resourceTypes: string[] = [];

  constructor(graphqlClient: DubheGraphqlClient, dubheMetadata: DubheMetadata) {
    this.graphqlClient = graphqlClient;
    this.dubheMetadata = dubheMetadata;

    const resources: ResourceMetadata[] = [];
    const errors: string[] = [];

    this.parseFromDubheMetadata(resources, errors);

    const result: ResourceDiscoveryResult = {
      resources,
      discoveredAt: Date.now(),
      errors: errors.length > 0 ? errors : undefined,
      totalDiscovered: resources.length,
      fromDubheMetadata: true
    };

    this.discoveryResult = result;
    this.resourceTypes = resources.map((res) => res.name);

    resources.forEach((res) => {
      this.resourceMetadataMap.set(res.name, res);
    });
  }

  /**
   * Parse resources from DubheMetadata JSON format
   */
  private parseFromDubheMetadata(resources: ResourceMetadata[], errors: string[]): void {
    if (!this.dubheMetadata?.resources) {
      return;
    }

    for (const resourceRecord of this.dubheMetadata.resources) {
      for (const [resourceName, resourceConfig] of Object.entries(resourceRecord)) {
        try {
          const fields: ComponentField[] = [];
          const primaryKeys: string[] = [];
          const enumFields: string[] = [];

          if (resourceConfig.fields && Array.isArray(resourceConfig.fields)) {
            for (const fieldRecord of resourceConfig.fields) {
              for (const [fieldName, fieldType] of Object.entries(fieldRecord)) {
                const camelFieldName = this.snakeToCamel(fieldName);
                const typeStr = String(fieldType);

                const isCustomKey = resourceConfig.keys && resourceConfig.keys.includes(fieldName);

                fields.push({
                  name: camelFieldName,
                  type: this.dubheTypeToGraphQLType(typeStr),
                  nullable: !isCustomKey,
                  isPrimaryKey: isCustomKey,
                  isEnum: this.isEnumType(typeStr)
                });

                if (isCustomKey) {
                  primaryKeys.push(camelFieldName);
                }

                if (this.isEnumType(typeStr)) {
                  enumFields.push(camelFieldName);
                }
              }
            }
          }

          // Add system fields
          fields.push(
            {
              name: 'createdAtTimestampMs',
              type: 'BigInt',
              nullable: false,
              isPrimaryKey: false,
              isEnum: false
            },
            {
              name: 'updatedAtTimestampMs',
              type: 'BigInt',
              nullable: false,
              isPrimaryKey: false,
              isEnum: false
            },
            {
              name: 'isDeleted',
              type: 'Boolean',
              nullable: false,
              isPrimaryKey: false,
              isEnum: false
            },
            {
              name: 'lastUpdateDigest',
              type: 'String',
              nullable: false,
              isPrimaryKey: false,
              isEnum: false
            }
          );

          const resourceType = resourceName;
          const metadata: ResourceMetadata = {
            name: resourceType,
            tableName: resourceName,
            fields,
            primaryKeys,
            hasCompositeKeys: primaryKeys.length > 1,
            hasNoKeys: primaryKeys.length === 0,
            enumFields,
            lastUpdated: Date.now(),
            description: `Auto-discovered resource: ${resourceName}`
          };

          resources.push(metadata);
        } catch (error) {
          const errorMsg = `Resource ${resourceName} validation failed: ${formatError(error)}`;
          errors.push(errorMsg);
        }
      }
    }
  }

  getResourceTypes(): string[] {
    return this.resourceTypes;
  }

  getResourceMetadata(resourceType: string): ResourceMetadata | null {
    return this.resourceMetadataMap.get(resourceType) || null;
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private dubheTypeToGraphQLType(dubheType: string): string {
    if (dubheType.startsWith('vector<') && dubheType.endsWith('>')) {
      return 'String';
    }

    switch (dubheType) {
      case 'u8':
      case 'u16':
      case 'u32':
      case 'u64':
      case 'u128':
      case 'i8':
      case 'i16':
      case 'i32':
      case 'i64':
      case 'i128':
        return 'Int';
      case 'address':
      case 'string':
        return 'String';
      case 'bool':
        return 'Boolean';
      case 'enum':
        return 'String';
      default:
        return 'String';
    }
  }

  private isEnumType(typeStr: string): boolean {
    return this.dubheMetadata.enums.some(
      (enumDef: any) => typeof enumDef === 'object' && enumDef[typeStr]
    );
  }
}

/**
 * ECS World - Main ECS world class
 */
export class DubheECSWorld {
  private graphqlClient: DubheGraphqlClient;
  private querySystem: ECSQuery;
  private subscriptionSystem: ECSSubscription;
  private componentDiscoverer: ComponentDiscoverer;
  private resourceDiscoverer: ResourceDiscoverer;
  private config: ECSWorldConfig;
  private dubheMetadata: DubheMetadata;

  constructor(graphqlClient: DubheGraphqlClient, config?: Partial<ECSWorldConfig>) {
    this.graphqlClient = graphqlClient;

    this.config = {
      queryConfig: {
        defaultCacheTimeout: 5 * 60 * 1000,
        maxConcurrentQueries: 10,
        enableBatchOptimization: true
      },
      subscriptionConfig: {
        defaultDebounceMs: 100,
        maxSubscriptions: 50,
        reconnectOnError: true
      },
      ...config
    };

    // Get dubheMetadata from config or GraphQL client
    let dubheMetadata = this.config.dubheMetadata;
    if (!dubheMetadata) {
      dubheMetadata = this.graphqlClient.getDubheMetadata();
      if (!dubheMetadata) {
        throw new Error(
          'DubheMetadata is required for ECS World initialization. ' +
            'Please provide it either in ECSWorldConfig or in GraphQL client configuration.'
        );
      }
    }

    this.dubheMetadata = dubheMetadata;

    // Initialize discoverers
    this.componentDiscoverer = new ComponentDiscoverer(graphqlClient, this.dubheMetadata);
    this.resourceDiscoverer = new ResourceDiscoverer(graphqlClient, this.dubheMetadata);

    // Initialize systems
    this.querySystem = new ECSQuery(graphqlClient, this.componentDiscoverer);
    this.subscriptionSystem = new ECSSubscription(graphqlClient, this.componentDiscoverer);

    this.initializeWithConfig();
  }

  private initializeWithConfig(): void {
    try {
      // Get ECS-compliant components (single primary key only)
      const ecsComponents = this.componentDiscoverer.discoveryResult.components.filter((comp) => {
        // Must have exactly one primary key to be ECS-compliant
        return comp.primaryKeys.length === 1;
      });

      // Get all resources
      const _resources = this.resourceDiscoverer.discoveryResult.resources;

      // Initialize query system with ECS components and their metadata
      this.querySystem.setAvailableComponents(ecsComponents.map((comp) => comp.name));

      // Initialize component primary key cache
      this.querySystem.initializeComponentMetadata(
        ecsComponents.map((comp) => ({
          name: comp.name,
          primaryKeys: comp.primaryKeys
        }))
      );

      // Initialize subscription system with ECS components and metadata
      this.subscriptionSystem.setAvailableComponents(ecsComponents.map((comp) => comp.name));

      // Initialize subscription system component metadata cache
      this.subscriptionSystem.initializeComponentMetadata(
        ecsComponents.map((comp) => ({
          name: comp.name,
          primaryKeys: comp.primaryKeys
        }))
      );

      // Configure systems with settings
      if (this.config.queryConfig) {
        // Configure query system
      }

      if (this.config.subscriptionConfig) {
        // Configure subscription system
      }
    } catch (error) {
      throw new Error(`Failed to initialize ECS World: ${formatError(error)}`);
    }
  }

  // ============ Configuration and Initialization ============

  /**
   * Configure ECS world
   */
  configure(config: Partial<ECSWorldConfig>): void {
    this.config = { ...this.config, ...config };

    // Recreate component and resource discoverers if metadata changed
    if (config.dubheMetadata) {
      this.dubheMetadata = config.dubheMetadata;
      this.componentDiscoverer = new ComponentDiscoverer(this.graphqlClient, this.dubheMetadata);
      this.resourceDiscoverer = new ResourceDiscoverer(this.graphqlClient, this.dubheMetadata);

      // Update query and subscription systems
      this.querySystem.setComponentDiscoverer(this.componentDiscoverer);
      this.subscriptionSystem.setComponentDiscoverer(this.componentDiscoverer);

      this.initializeWithConfig();
    }
  }

  // ============ Component Discovery and Information ============

  /**
   * Discover and return all available ECS component types
   */
  discoverComponents(): ComponentType[] {
    return this.componentDiscoverer.getComponentTypes();
  }

  /**
   * Get all available ECS component types (cached)
   */
  getAvailableComponents(): ComponentType[] {
    return this.componentDiscoverer.getComponentTypes();
  }

  /**
   * Get metadata for a specific ECS component
   */
  getComponentMetadata(componentType: ComponentType): ComponentMetadata | null {
    return this.componentDiscoverer.getComponentMetadata(componentType);
  }

  // ============ Resource Discovery and Information ============

  /**
   * Get all available resource types
   */
  getAvailableResources(): string[] {
    return this.resourceDiscoverer.getResourceTypes();
  }

  /**
   * Get metadata for a specific resource
   */
  getResourceMetadata(resourceType: string): ResourceMetadata | null {
    return this.resourceDiscoverer.getResourceMetadata(resourceType);
  }

  // ============ Entity Queries ============

  /**
   * Check if entity exists
   */
  async hasEntity(entityId: EntityId): Promise<boolean> {
    return this.querySystem.hasEntity(entityId);
  }

  /**
   * Get all entity IDs
   */
  async getAllEntities(): Promise<EntityId[]> {
    return this.querySystem.getAllEntities();
  }

  /**
   * Get entity count
   */
  async getEntityCount(): Promise<number> {
    return this.querySystem.getEntityCount();
  }

  // ============ Standard ECS Interface (camelCase naming) ============

  /**
   * Get complete data of a single entity
   * @param entityId Entity ID
   * @returns Complete component data of the entity, or null if entity doesn't exist
   */
  async getEntity(entityId: EntityId): Promise<any | null> {
    try {
      // First check if entity exists
      const exists = await this.hasEntity(entityId);
      if (!exists) {
        return null;
      }

      // Get all components of the entity
      const componentTypes = await this.getComponents(entityId);
      if (componentTypes.length === 0) {
        return null;
      }

      // Get data for all components
      const entityData: Record<string, any> = {
        entityId,
        components: {}
      };

      for (const componentType of componentTypes) {
        const componentData = await this.getComponent(entityId, componentType);
        if (componentData) {
          entityData.components[componentType] = componentData;
        }
      }

      return entityData;
    } catch (error) {
      console.error(`Failed to get entity ${entityId}:`, formatError(error));
      return null;
    }
  }

  /**
   * Get all entity ID list
   * @returns Array of all entity IDs
   */
  async getEntities(): Promise<EntityId[]> {
    return this.getAllEntities();
  }

  /**
   * Get all entities that have a specific component
   * @param componentType Component type
   * @returns Array of entity IDs that have this component
   */
  async getEntitiesByComponent(componentType: ComponentType): Promise<PagedQueryResult<any>> {
    return this.queryWith(componentType);
  }

  // Note: getComponent, getComponents, hasComponent methods are defined below

  // ============ Component Queries ============

  /**
   * Check if entity has specific component
   */
  async hasComponent(entityId: EntityId, componentType: ComponentType): Promise<boolean> {
    return this.querySystem.hasComponent(entityId, componentType);
  }

  /**
   * Get specific component data of entity
   */
  async getComponent<T>(entityId: EntityId, componentType: ComponentType): Promise<T | null> {
    return this.querySystem.getComponent<T>(entityId, componentType);
  }

  /**
   * Get all component types that entity has
   */
  async getComponents(entityId: EntityId): Promise<ComponentType[]> {
    return this.querySystem.getComponents(entityId);
  }

  // ============ World Queries ============

  /**
   * Query all entities that have a specific component
   */
  async queryWith(
    componentType: ComponentType,
    options?: QueryOptions
  ): Promise<PagedQueryResult<any>> {
    return this.querySystem.queryWith(componentType, options);
  }

  /**
   * Query entities that have all specified components (intersection)
   */
  async queryWithAll(componentTypes: ComponentType[], options?: QueryOptions): Promise<EntityId[]> {
    return this.querySystem.queryWithAll(componentTypes, options);
  }

  /**
   * Query entities that have any of the specified components (union)
   */
  async queryWithAny(componentTypes: ComponentType[], options?: QueryOptions): Promise<EntityId[]> {
    return this.querySystem.queryWithAny(componentTypes, options);
  }

  /**
   * Query entities that have include components but not exclude components
   */
  async queryWithout(
    includeTypes: ComponentType[],
    excludeTypes: ComponentType[],
    options?: QueryOptions
  ): Promise<EntityId[]> {
    return this.querySystem.queryWithout(includeTypes, excludeTypes, options);
  }

  // ============ Conditional Queries ============

  /**
   * Query components based on conditions
   */
  async queryWhere<T>(
    componentType: ComponentType,
    predicate: Record<string, any>,
    options?: QueryOptions
  ): Promise<EntityId[]> {
    return this.querySystem.queryWhere<T>(componentType, predicate, options);
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
    return this.querySystem.queryRange(componentType, field, min, max, options);
  }

  /**
   * Paginated query (legacy version using page/pageSize)
   */
  async queryPaged(
    componentTypes: ComponentType[],
    page: number,
    pageSize: number
  ): Promise<PagedResult<EntityId>> {
    return this.querySystem.queryPaged(componentTypes, page, pageSize);
  }

  /**
   * Query with complete pagination info using GraphQL cursor-based pagination
   */
  async queryWithPagination<T = any>(
    componentType: ComponentType,
    options?: QueryOptions
  ): Promise<PagedQueryResult<T>> {
    return this.querySystem.queryWith<T>(componentType, options);
  }

  /**
   * Query components with conditions and complete pagination info
   */
  async queryWherePagination<T = any>(
    componentType: ComponentType,
    predicate: Record<string, any>,
    options?: QueryOptions
  ): Promise<PagedQueryResult<T>> {
    return this.querySystem.queryWhereFullPagination<T>(componentType, predicate, options);
  }

  // ============ Query Builder ============

  /**
   * Create query builder
   */
  query() {
    return this.querySystem.query();
  }

  // ============ Subscription System ============

  /**
   * Listen to component added events
   */
  onComponentAdded<T>(
    componentType: ComponentType,
    options?: SubscriptionOptions & { fields?: string[] }
  ) {
    return this.subscriptionSystem.onComponentAdded<T>(componentType, options);
  }

  /**
   * Listen to component removed events
   */
  onComponentRemoved<T>(
    componentType: ComponentType,
    options?: SubscriptionOptions & { fields?: string[] }
  ) {
    return this.subscriptionSystem.onComponentRemoved<T>(componentType, options);
  }

  /**
   * Listen to component changed events
   */
  onComponentChanged<T>(
    componentType: ComponentType,
    options?: SubscriptionOptions & { fields?: string[] }
  ) {
    return this.subscriptionSystem.onComponentChanged<T>(componentType, options);
  }

  /**
   * Listen to component changes with specific conditions
   */
  onEntityComponent<T>(
    componentType: ComponentType,
    entityId: string,
    options?: SubscriptionOptions & { fields?: string[] }
  ) {
    return this.subscriptionSystem.onEntityComponent<T>(componentType, entityId, options);
  }

  /**
   * Listen to query result changes
   */
  watchQuery(componentTypes: ComponentType[], options?: SubscriptionOptions) {
    return this.subscriptionSystem.watchQuery(componentTypes, options);
  }

  /**
   * Create real-time data stream
   */
  createRealTimeStream<T>(componentType: ComponentType, initialFilter?: Record<string, any>) {
    return this.subscriptionSystem.createRealTimeStream<T>(componentType, initialFilter);
  }

  // ============ Convenience Methods ============

  /**
   * Query entity data with specific component (includes component data)
   */
  async queryWithComponentData<T>(
    componentType: ComponentType,
    options?: QueryOptions
  ): Promise<Array<{ entityId: EntityId; data: T }>> {
    try {
      const data = await this.queryWith(componentType, options);
      const results: Array<{ entityId: EntityId; data: T }> = [];

      for (const entityId of data.entityIds) {
        const componentData = await this.getComponent<T>(entityId, componentType);
        if (componentData) {
          results.push({ entityId, data: componentData });
        }
      }

      return results;
    } catch (_error) {
      return [];
    }
  }

  /**
   * Query multi-component entity data
   */
  async queryMultiComponentData<T1, T2>(
    component1Type: ComponentType,
    component2Type: ComponentType,
    options?: QueryOptions
  ): Promise<Array<{ entityId: EntityId; data1: T1; data2: T2 }>> {
    try {
      const entityIds = await this.queryWithAll([component1Type, component2Type], options);
      const results: Array<{ entityId: EntityId; data1: T1; data2: T2 }> = [];

      for (const entityId of entityIds) {
        const [data1, data2] = await Promise.all([
          this.getComponent<T1>(entityId, component1Type),
          this.getComponent<T2>(entityId, component2Type)
        ]);

        if (data1 && data2) {
          results.push({ entityId, data1, data2 });
        }
      }

      return results;
    } catch (_error) {
      return [];
    }
  }

  /**
   * Get complete entity state (all component data)
   */
  async getEntityState(entityId: EntityId): Promise<{
    entityId: EntityId;
    components: Record<ComponentType, any>;
  } | null> {
    try {
      const componentTypes = await this.getComponents(entityId);
      if (componentTypes.length === 0) return null;

      const components: Record<ComponentType, any> = {};

      for (const componentType of componentTypes) {
        const componentData = await this.getComponent(entityId, componentType);
        if (componentData) {
          components[componentType] = componentData;
        }
      }

      return { entityId, components };
    } catch (_error) {
      return null;
    }
  }

  // ============ Statistics and Analysis ============

  /**
   * Get component statistics
   */
  async getComponentStats(): Promise<Record<ComponentType, number>> {
    try {
      const stats: Record<ComponentType, number> = {};

      // Get all available component types
      const componentTypes = await this.getAvailableComponents();

      await Promise.all(
        componentTypes.map(async (componentType) => {
          try {
            const entities = await this.queryWith(componentType);
            stats[componentType] = entities.totalCount;
          } catch (_error) {
            stats[componentType] = 0;
          }
        })
      );

      return stats;
    } catch (_error) {
      return {};
    }
  }

  /**
   * Find orphan entities (entities with only one component)
   */
  async findOrphanEntities(): Promise<EntityId[]> {
    try {
      const allEntities = await this.getAllEntities();
      const orphanEntities: EntityId[] = [];

      for (const entityId of allEntities) {
        const components = await this.getComponents(entityId);
        if (components.length === 1) {
          orphanEntities.push(entityId);
        }
      }

      return orphanEntities;
    } catch (_error) {
      return [];
    }
  }

  // ============ Resource Management ============

  /**
   * Unsubscribe all subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptionSystem.unsubscribeAll();
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.querySystem.dispose();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.querySystem.dispose();
    this.subscriptionSystem.dispose();
  }

  // ============ Get Underlying Clients ============

  /**
   * Get GraphQL client (for advanced operations)
   */
  getGraphQLClient(): DubheGraphqlClient {
    return this.graphqlClient;
  }

  /**
   * Get query system (for advanced query operations)
   */
  getQuerySystem(): ECSQuery {
    return this.querySystem;
  }

  /**
   * Get subscription system (for advanced subscription operations)
   */
  getSubscriptionSystem(): ECSSubscription {
    return this.subscriptionSystem;
  }

  /**
   * Get ECS world configuration
   */
  getConfig(): ECSWorldConfig {
    return { ...this.config };
  }

  /**
   * Update ECS World configuration dynamically
   * @param config - Partial configuration to update (same type as constructor)
   */
  updateConfig(config: Partial<ECSWorldConfig>): void {
    // Update dubheMetadata if provided
    if (config.dubheMetadata !== undefined) {
      this.dubheMetadata = config.dubheMetadata;
      this.config.dubheMetadata = config.dubheMetadata;

      // Recreate discoverers with new metadata
      this.componentDiscoverer = new ComponentDiscoverer(this.graphqlClient, this.dubheMetadata);
      this.resourceDiscoverer = new ResourceDiscoverer(this.graphqlClient, this.dubheMetadata);

      // Reinitialize query and subscription systems
      this.querySystem.setComponentDiscoverer(this.componentDiscoverer);
      this.subscriptionSystem.setComponentDiscoverer(this.componentDiscoverer);

      // Reinitialize with new config
      this.initializeWithConfig();
    }

    // Update query configuration
    if (config.queryConfig) {
      this.config.queryConfig = {
        ...this.config.queryConfig,
        ...config.queryConfig
      };

      // Update query system cache timeout if provided
      if (config.queryConfig.defaultCacheTimeout !== undefined) {
        // Access private property through type assertion
        (this.querySystem as any).cacheTimeout = config.queryConfig.defaultCacheTimeout;
      }
    }

    // Update subscription configuration
    if (config.subscriptionConfig) {
      this.config.subscriptionConfig = {
        ...this.config.subscriptionConfig,
        ...config.subscriptionConfig
      };
    }
  }

  /**
   * Get dubhe metadata info (JSON format)
   */
  getDubheMetadata(): DubheMetadata {
    return this.dubheMetadata;
  }

  // ============ Resource Queries ============

  /**
   * Query resource by primary keys
   */
  async getResource<T>(
    resourceType: string,
    keyValues?: Record<string, any>,
    options?: QueryOptions
  ): Promise<T | null> {
    try {
      // Verify if it's a known resource type
      const resourceMetadata = this.resourceDiscoverer.getResourceMetadata(resourceType);
      if (!resourceMetadata) {
        return null;
      }
      keyValues = keyValues || {};

      // Build where condition for keys
      const whereConditions: Record<string, any> = {};
      for (const [key, value] of Object.entries(keyValues)) {
        whereConditions[key] = { equalTo: value };
      }

      // Build pagination parameters, defaulting to first: 1 for single resource query
      const paginationParams = {
        first: options?.first ?? options?.limit ?? 1,
        last: options?.last,
        after: options?.after,
        before: options?.before
      };

      const result = await this.graphqlClient.getAllTables(resourceType, {
        ...paginationParams,
        filter: whereConditions,
        fields: options?.fields || resourceMetadata.fields.map((f) => f.name),
        orderBy: options?.orderBy
      });

      const record = result.edges[0]?.node;
      return record ? (record as T) : null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Query multiple resources with complete pagination info
   */
  async getResources<T>(
    resourceType: string,
    options?: QueryOptions
  ): Promise<PagedQueryResult<T>> {
    try {
      // Verify if it's a known resource type
      const resourceMetadata = this.resourceDiscoverer.getResourceMetadata(resourceType);
      if (!resourceMetadata) {
        return {
          entityIds: [], // Resources don't have entityIds, but include for compatibility
          items: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false
          },
          totalCount: 0
        };
      }

      // Build where condition
      const whereConditions: Record<string, any> = {};
      if (options?.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
          if (typeof value === 'object' && value !== null) {
            // If value is already a filter object, use it directly
            whereConditions[key] = value;
          } else {
            // Otherwise, wrap in equalTo
            whereConditions[key] = { equalTo: value };
          }
        }
      }

      // Build pagination parameters
      const paginationParams = {
        first: options?.first ?? options?.limit,
        last: options?.last,
        after: options?.after,
        before: options?.before
      };

      const result = await this.graphqlClient.getAllTables(resourceType, {
        ...paginationParams,
        filter: Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
        fields: options?.fields || resourceMetadata.fields.map((f) => f.name),
        orderBy: options?.orderBy
      });

      const items = result.edges.map((edge) => edge.node as T);

      return {
        entityIds: [], // Resources don't have entityIds, but include for compatibility
        items,
        pageInfo: {
          hasNextPage: result.pageInfo.hasNextPage,
          hasPreviousPage: result.pageInfo.hasPreviousPage,
          startCursor: result.pageInfo.startCursor,
          endCursor: result.pageInfo.endCursor
        },
        totalCount: result.totalCount || 0
      };
    } catch (_error) {
      return {
        entityIds: [], // Resources don't have entityIds, but include for compatibility
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false
        },
        totalCount: 0
      };
    }
  }

  /**
   * Check if a resource exists
   */
  async hasResource(resourceType: string, keyValues: Record<string, any>): Promise<boolean> {
    const resource = await this.getResource(resourceType, keyValues);
    return resource !== null;
  }

  /**
   * Get resource count
   */
  async getResourceCount(resourceType: string): Promise<number> {
    try {
      const result = await this.graphqlClient.getAllTables(resourceType, {
        first: 1 // Only need count, not actual data
      });
      return result.totalCount || 0;
    } catch (_error) {
      return 0;
    }
  }

  /**
   * Subscribe to resource changes
   */
  subscribeToResourceChanges<_T = any>(
    resourceType: string,
    options?: SubscriptionOptions & {
      fields?: string[];
      initialEvent?: boolean;
      filter?: Record<string, any>;
    }
  ) {
    // Verify if it's a known resource type
    const resourceMetadata = this.resourceDiscoverer.getResourceMetadata(resourceType);
    if (!resourceMetadata) {
      throw new Error(
        `Unknown resource type: ${resourceType}. Available resources: [${this.getAvailableResources().join(
          ', '
        )}]`
      );
    }

    const subscriptionFields = options?.fields || resourceMetadata.fields.map((f) => f.name);

    return this.graphqlClient.subscribeToTableChanges(resourceType, {
      ...options,
      fields: subscriptionFields
    });
  }
}

/**
 * Factory function to create ECS world instance
 */
export function createECSWorld(
  graphqlClient: DubheGraphqlClient,
  config?: Partial<ECSWorldConfig>
): DubheECSWorld {
  return new DubheECSWorld(graphqlClient, config);
}
