// ECS subscription system implementation

import { Observable, Observer } from '@apollo/client';
import { DubheGraphqlClient } from '@0xobelisk/graphql-client';
import {
  EntityId,
  ComponentType,
  // ComponentCallback,
  QueryChangeCallback,
  // QueryWatcher,
  QueryChange,
  SubscriptionOptions
  // Unsubscribe,
  // ComponentChangeEvent,
} from './types';
import { calculateDelta, debounce, isValidComponentType } from './utils';
import { ComponentDiscoverer } from './world';
import pluralize from 'pluralize';

/**
 * ECS subscription result
 */
export interface ECSSubscriptionResult<T = any> {
  entityId: EntityId;
  data: T | null;
  changeType: 'added' | 'updated' | 'removed';
  timestamp: number;
  error?: Error;
}

/**
 * ECS query change result
 */
export interface QueryChangeResult {
  changes: QueryChange;
  error?: Error;
}

/**
 * ECS subscription system core implementation
 */
export class ECSSubscription {
  private graphqlClient: DubheGraphqlClient;
  private subscriptions = new Map<string, any>();
  private queryWatchers = new Map<string, QueryWatcherImpl>();
  private componentDiscoverer: ComponentDiscoverer | null = null;
  private availableComponents: ComponentType[] = [];
  // Component primary key cache - consistent with implementation in query.ts
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
   * Pre-parse and cache all component primary key information (consistent with query.ts)
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
   * Get component's primary key field name (quickly retrieve from cache, consistent with query.ts)
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

  /**
   * Validate if component type is ECS-compliant
   */
  private isECSComponent(componentType: ComponentType): boolean {
    return this.availableComponents.includes(componentType);
  }

  /**
   * Get component field information (intelligent parsing)
   */
  private async getComponentFields(componentType: ComponentType): Promise<string[]> {
    if (this.componentDiscoverer) {
      try {
        const metadata = this.componentDiscoverer.getComponentMetadata(componentType);
        if (metadata) {
          return metadata.fields.map((field: any) => field.name);
        }
      } catch (_error) {
        // Ignore error for now
      }
    }

    // Return basic fields when unable to auto-parse
    return ['createdAt', 'updatedAt'];
  }

  /**
   * Get fields to use for queries (priority: user specified > dubhe config auto-parsed > default fields)
   */
  private async getQueryFields(
    componentType: ComponentType,
    userFields?: string[]
  ): Promise<string[]> {
    if (userFields && userFields.length > 0) {
      return userFields;
    }

    // Use dubhe config auto-parsed fields, return default fields if failed
    return this.getComponentFields(componentType);
  }

  /**
   * Listen to component added events
   */
  onComponentAdded<T>(
    componentType: ComponentType,
    options?: SubscriptionOptions & { fields?: string[] }
  ): Observable<ECSSubscriptionResult<T>> {
    if (!isValidComponentType(componentType)) {
      return new Observable((observer: Observer<ECSSubscriptionResult<T>>) => {
        observer.error(new Error(`Invalid component type: ${componentType}`));
      });
    }

    // Validate if it's an ECS-compliant component
    if (!this.isECSComponent(componentType)) {
      return new Observable((observer: Observer<ECSSubscriptionResult<T>>) => {
        observer.error(
          new Error(`Component type ${componentType} is not ECS-compliant or not available`)
        );
      });
    }

    return new Observable((observer: Observer<ECSSubscriptionResult<T>>) => {
      let subscription: any = null;

      // Asynchronously get fields and create subscription
      this.getQueryFields(componentType, options?.fields)
        .then((subscriptionFields) => {
          const debouncedEmit = options?.debounceMs
            ? debounce(
                (result: ECSSubscriptionResult<T>) => observer.next(result),
                options.debounceMs
              )
            : (result: ECSSubscriptionResult<T>) => observer.next(result);

          const observable = this.graphqlClient.subscribeToTableChanges(componentType, {
            initialEvent: options?.initialEvent ?? false,
            fields: subscriptionFields,
            onData: (data) => {
              try {
                // Process batch data
                const pluralTableName = this.getPluralTableName(componentType);
                const nodes = data?.listen?.query?.[pluralTableName]?.nodes;
                if (nodes && Array.isArray(nodes)) {
                  nodes.forEach((node: any) => {
                    if (node) {
                      const entityId = node.entityId || this.extractEntityId(node, componentType);
                      if (entityId) {
                        const result: ECSSubscriptionResult<T> = {
                          entityId,
                          data: node as T,
                          changeType: 'added',
                          timestamp: Date.now()
                        };
                        debouncedEmit(result);
                      }
                    }
                  });
                }
              } catch (error) {
                observer.error(error);
              }
            },
            onError: (error) => {
              observer.error(error);
            },
            onComplete: () => {
              observer.complete();
            }
          });

          // Start subscription
          subscription = observable.subscribe({});
        })
        .catch((error) => {
          observer.error(error);
        });

      // Return cleanup function
      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    });
  }

  /**
   * Listen to component removed events
   */
  onComponentRemoved<T>(
    componentType: ComponentType,
    options?: SubscriptionOptions & { fields?: string[] }
  ): Observable<ECSSubscriptionResult<T>> {
    if (!isValidComponentType(componentType)) {
      return new Observable((observer: Observer<ECSSubscriptionResult<T>>) => {
        observer.error(new Error(`Invalid component type: ${componentType}`));
      });
    }

    // Validate if it's an ECS-compliant component
    if (!this.isECSComponent(componentType)) {
      return new Observable((observer: Observer<ECSSubscriptionResult<T>>) => {
        observer.error(
          new Error(`Component type ${componentType} is not ECS-compliant or not available`)
        );
      });
    }

    return new Observable((observer: Observer<ECSSubscriptionResult<T>>) => {
      let subscription: any = null;
      let lastKnownEntities = new Set<EntityId>();

      try {
        const debouncedEmit = options?.debounceMs
          ? debounce(
              (result: ECSSubscriptionResult<T>) => observer.next(result),
              options.debounceMs
            )
          : (result: ECSSubscriptionResult<T>) => observer.next(result);

        // First get current entity list
        this.initializeLastKnownEntities(componentType, lastKnownEntities);

        const observable = this.graphqlClient.subscribeToTableChanges(componentType, {
          initialEvent: false,
          fields: ['updatedAt'], // Removal detection only needs basic fields
          onData: (data) => {
            try {
              // Get current entity list
              const pluralTableName = this.getPluralTableName(componentType);
              const nodes = data?.listen?.query?.[pluralTableName]?.nodes || [];
              const currentEntities = new Set<EntityId>(
                nodes
                  .map((node: any) => {
                    const entityId = node.entityId || this.extractEntityId(node, componentType);
                    return entityId;
                  })
                  .filter(Boolean)
              );

              // Find removed entities
              const removedEntities = Array.from(lastKnownEntities).filter(
                (entityId) => !currentEntities.has(entityId)
              );

              removedEntities.forEach((entityId) => {
                const result: ECSSubscriptionResult<T> = {
                  entityId,
                  data: null,
                  changeType: 'removed',
                  timestamp: Date.now()
                };
                debouncedEmit(result);
              });

              lastKnownEntities = currentEntities;
            } catch (error) {
              observer.error(error);
            }
          },
          onError: (error) => {
            observer.error(error);
          },
          onComplete: () => {
            observer.complete();
          }
        });

        // Start subscription
        subscription = observable.subscribe({});
      } catch (error) {
        observer.error(error);
      }

      // Return cleanup function
      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    });
  }

  /**
   * Listen to component changed events (added, removed, modified)
   */
  onComponentChanged<T>(
    componentType: ComponentType,
    options?: SubscriptionOptions & { fields?: string[] }
  ): Observable<ECSSubscriptionResult<T>> {
    if (!isValidComponentType(componentType)) {
      return new Observable((observer: Observer<ECSSubscriptionResult<T>>) => {
        observer.error(new Error(`Invalid component type: ${componentType}`));
      });
    }

    // Validate if it's an ECS-compliant component
    if (!this.isECSComponent(componentType)) {
      return new Observable((observer: Observer<ECSSubscriptionResult<T>>) => {
        observer.error(
          new Error(`Component type ${componentType} is not ECS-compliant or not available`)
        );
      });
    }

    return new Observable((observer: Observer<ECSSubscriptionResult<T>>) => {
      let subscription: any = null;

      // Asynchronously get fields and create subscription
      this.getQueryFields(componentType, options?.fields)
        .then((subscriptionFields) => {
          const debouncedEmit = options?.debounceMs
            ? debounce(
                (result: ECSSubscriptionResult<T>) => observer.next(result),
                options.debounceMs
              )
            : (result: ECSSubscriptionResult<T>) => observer.next(result);

          const observable = this.graphqlClient.subscribeToTableChanges(componentType, {
            initialEvent: options?.initialEvent ?? false,
            fields: subscriptionFields,
            onData: (data) => {
              try {
                // Get plural table name correctly
                const pluralTableName = this.getPluralTableName(componentType);

                const nodes = data?.listen?.query?.[pluralTableName]?.nodes;

                if (nodes && Array.isArray(nodes)) {
                  nodes.forEach((node: any) => {
                    if (node) {
                      // Entity ID may be in different fields
                      const entityId = node.entityId || this.extractEntityId(node, componentType);

                      if (entityId) {
                        const result: ECSSubscriptionResult<T> = {
                          entityId,
                          data: node as T,
                          changeType: 'updated',
                          timestamp: Date.now()
                        };
                        debouncedEmit(result);
                      }
                    }
                  });
                }
              } catch (error) {
                observer.error(error);
              }
            },
            onError: (error) => {
              observer.error(error);
            },
            onComplete: () => {
              observer.complete();
            }
          });

          // Start subscription
          subscription = observable.subscribe({});
        })
        .catch((error) => {
          observer.error(error);
        });

      // Return cleanup function
      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    });
  }

  /**
   * Listen to component changes with specific conditions
   */
  onEntityComponent<T>(
    componentType: ComponentType,
    entityId: string,
    options?: SubscriptionOptions & { fields?: string[] }
  ): Observable<ECSSubscriptionResult<T>> {
    if (!isValidComponentType(componentType)) {
      return new Observable((observer: Observer<ECSSubscriptionResult<T>>) => {
        observer.error(new Error(`Invalid component type: ${componentType}`));
      });
    }

    // Validate if it's an ECS-compliant component
    if (!this.isECSComponent(componentType)) {
      return new Observable((observer: Observer<ECSSubscriptionResult<T>>) => {
        observer.error(
          new Error(`Component type ${componentType} is not ECS-compliant or not available`)
        );
      });
    }

    return new Observable((observer: Observer<ECSSubscriptionResult<T>>) => {
      let subscription: any = null;

      // Asynchronously get fields and create subscription
      this.getQueryFields(componentType, options?.fields)
        .then((subscriptionFields) => {
          const debouncedEmit = options?.debounceMs
            ? debounce(
                (result: ECSSubscriptionResult<T>) => observer.next(result),
                options.debounceMs
              )
            : (result: ECSSubscriptionResult<T>) => observer.next(result);

          // Get component's primary key field name
          const primaryKeyField = this.getComponentPrimaryKeyField(componentType);

          // Construct filter based on entityId and primary key
          const entityFilter = {
            [primaryKeyField]: { equalTo: entityId }
          };

          const observable = this.graphqlClient.subscribeToTableChanges(componentType, {
            initialEvent: options?.initialEvent ?? false,
            fields: subscriptionFields,
            filter: entityFilter,
            onData: (data: any) => {
              try {
                const pluralTableName = this.getPluralTableName(componentType);
                const nodes = data?.listen?.query?.[pluralTableName]?.nodes || [];

                nodes.forEach((node: any) => {
                  if (node) {
                    const entityId = node.entityId || this.extractEntityId(node, componentType);
                    if (entityId) {
                      const result: ECSSubscriptionResult<T> = {
                        entityId,
                        data: node as T,
                        changeType: 'updated',
                        timestamp: Date.now()
                      };
                      debouncedEmit(result);
                    }
                  }
                });
              } catch (error) {
                observer.error(error);
              }
            },
            onError: (error: any) => {
              observer.error(error);
            },
            onComplete: () => {
              observer.complete();
            }
          } as any);

          // Start subscription
          subscription = observable.subscribe({});
        })
        .catch((error) => {
          observer.error(error);
        });

      // Return cleanup function
      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    });
  }

  /**
   * Listen to query result changes
   */
  watchQuery(
    componentTypes: ComponentType[],
    options?: SubscriptionOptions
  ): Observable<QueryChangeResult> {
    const validTypes = componentTypes.filter(isValidComponentType);
    if (validTypes.length === 0) {
      return new Observable((observer: Observer<QueryChangeResult>) => {
        observer.error(new Error('No valid component types for query watching'));
      });
    }

    return new Observable((observer: Observer<QueryChangeResult>) => {
      const watcher = new QueryWatcherImpl(
        this.graphqlClient,
        validTypes,
        (changes: QueryChange) => {
          const result: QueryChangeResult = {
            changes
          };

          if (options?.debounceMs) {
            const debouncedEmit = debounce(() => observer.next(result), options.debounceMs);
            debouncedEmit();
          } else {
            observer.next(result);
          }
        },
        options
      );

      // Return cleanup function
      return () => {
        watcher.dispose();
      };
    });
  }

  /**
   * Create real-time data stream
   */
  createRealTimeStream<T>(
    componentType: ComponentType,
    initialFilter?: Record<string, any>
  ): Observable<Array<{ entityId: EntityId; data: T }>> {
    if (!isValidComponentType(componentType)) {
      return new Observable((observer: Observer<Array<{ entityId: EntityId; data: T }>>) => {
        observer.error(new Error(`Invalid component type: ${componentType}`));
      });
    }

    return new Observable((observer: Observer<Array<{ entityId: EntityId; data: T }>>) => {
      try {
        const subscription = this.graphqlClient.createRealTimeDataStream(componentType, {
          filter: initialFilter
        });

        const streamSubscription = subscription.subscribe({
          next: (connection: any) => {
            const results = connection.edges
              .map((edge: any) => {
                const node = edge.node as any;
                const entityId = node.nodeId || node.entityId || Object.values(node)[0] || '';
                return {
                  entityId,
                  data: node as T
                };
              })
              .filter((result: any) => result.entityId);
            observer.next(results);
          },
          error: (error: any) => {
            observer.error(error);
          },
          complete: () => {
            observer.complete();
          }
        });

        // Return cleanup function
        return () => {
          streamSubscription.unsubscribe();
        };
      } catch (error) {
        observer.error(error);
      }
    });
  }

  /**
   * Initialize known entity list (for deletion detection)
   */
  private async initializeLastKnownEntities(
    componentType: ComponentType,
    lastKnownEntities: Set<EntityId>
  ): Promise<void> {
    try {
      const connection = await this.graphqlClient.getAllTables(componentType, {
        fields: ['updatedAt']
      });

      connection.edges.forEach((edge) => {
        const node = edge.node as any;
        const entityId = node.nodeId || node.entityId || Object.values(node)[0];
        if (entityId) {
          lastKnownEntities.add(entityId);
        }
      });
    } catch (_error) {
      // Ignore error for now
    }
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
   * Convert snake_case to camelCase
   */
  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Extract entity ID from node (using component's primary key field information)
   */
  private extractEntityId(node: any, componentType: ComponentType): string {
    if (!node || typeof node !== 'object') {
      return '';
    }

    // Use component's primary key field (consistent with query.ts)
    const primaryKeyField = this.getComponentPrimaryKeyField(componentType);

    // First try using primary key field
    if (node[primaryKeyField] && typeof node[primaryKeyField] === 'string') {
      return node[primaryKeyField];
    }

    // If primary key field doesn't exist, fallback to default entityId field
    if (primaryKeyField !== 'entityId' && node.entityId && typeof node.entityId === 'string') {
      return node.entityId;
    }

    // Finally try getting first string value as fallback
    const values = Object.values(node);
    for (const value of values) {
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }

    return '';
  }

  /**
   * Unsubscribe all subscriptions
   */
  unsubscribeAll(): void {
    // Unsubscribe regular subscriptions
    this.subscriptions.forEach((subscription) => {
      try {
        subscription?.unsubscribe();
      } catch (_error) {
        // Ignore error for now
      }
    });
    this.subscriptions.clear();

    // Unsubscribe query watchers
    this.queryWatchers.forEach((watcher) => {
      try {
        watcher.dispose();
      } catch (_error) {
        // Ignore error for now
      }
    });
    this.queryWatchers.clear();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.unsubscribeAll();
  }
}

/**
 * Query watcher implementation
 */
class QueryWatcherImpl {
  private graphqlClient: DubheGraphqlClient;
  private componentTypes: ComponentType[];
  private callback: QueryChangeCallback;
  private options?: SubscriptionOptions;
  private subscriptions: any[] = [];
  private currentResults: EntityId[] = [];
  private isInitialized = false;

  constructor(
    graphqlClient: DubheGraphqlClient,
    componentTypes: ComponentType[],
    callback: QueryChangeCallback,
    options?: SubscriptionOptions
  ) {
    this.graphqlClient = graphqlClient;
    this.componentTypes = componentTypes;
    this.callback = callback;
    this.options = options;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Get initial results
      await this.updateCurrentResults();

      // Create subscription for each component type
      this.componentTypes.forEach((componentType) => {
        const observable = this.graphqlClient.subscribeToTableChanges(componentType, {
          initialEvent: false,
          onData: () => {
            // When data changes, recalculate results
            this.handleDataChange();
          },
          onError: (_error) => {
            // Ignore error for now
          }
        });

        // Start subscription
        const actualSubscription = observable.subscribe({});
        this.subscriptions.push(actualSubscription);
      });

      this.isInitialized = true;

      // Trigger initial event (if needed)
      if (this.options?.initialEvent && this.currentResults.length > 0) {
        this.callback({
          added: this.currentResults,
          removed: [],
          current: this.currentResults
        });
      }
    } catch (_error) {
      // Ignore error for now
    }
  }

  private async handleDataChange(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const oldResults = [...this.currentResults];
      await this.updateCurrentResults();

      const changes = calculateDelta(oldResults, this.currentResults);

      if (changes.added.length > 0 || changes.removed.length > 0) {
        const debouncedCallback = this.options?.debounceMs
          ? debounce(this.callback, this.options.debounceMs)
          : this.callback;

        debouncedCallback(changes);
      }
    } catch (_error) {
      // Ignore error for now
    }
  }

  private async updateCurrentResults(): Promise<void> {
    try {
      if (this.componentTypes.length === 1) {
        // Single component query
        const connection = await this.graphqlClient.getAllTables(this.componentTypes[0], {
          fields: ['updatedAt']
        });
        this.currentResults = connection.edges
          .map((edge) => {
            const node = edge.node as any;
            return node.nodeId || node.entityId || Object.values(node)[0] || '';
          })
          .filter(Boolean);
      } else {
        // Multi-component query (intersection)
        const queries = this.componentTypes.map((type) => ({
          key: type,
          tableName: type,
          params: {
            fields: ['updatedAt'],
            filter: {}
          }
        }));

        const batchResult = await this.graphqlClient.batchQuery(queries);

        // Calculate intersection
        const entitySets = this.componentTypes.map((type) => {
          const connection = batchResult[type];
          return connection
            ? connection.edges
                .map((edge) => {
                  const node = edge.node as any;
                  return node.nodeId || node.entityId || Object.values(node)[0] || '';
                })
                .filter(Boolean)
            : [];
        });

        this.currentResults = entitySets.reduce((intersection, currentSet) => {
          const currentSetLookup = new Set(currentSet);
          return intersection.filter((id) => currentSetLookup.has(id));
        });
      }
    } catch (_error) {
      this.currentResults = [];
    }
  }

  getCurrentResults(): EntityId[] {
    return [...this.currentResults];
  }

  dispose(): void {
    this.subscriptions.forEach((subscription) => {
      try {
        subscription?.unsubscribe();
      } catch (_error) {
        // Ignore error for now
      }
    });
    this.subscriptions = [];
  }
}
