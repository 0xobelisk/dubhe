// ECS type definitions
export type {
  EntityId,
  ComponentType,
  Unsubscribe,
  ComponentCallback,
  ComponentChangeCallback,
  EntityCallback,
  QueryChange,
  QueryChangeCallback,
  QueryWatcher,
  PagedResult,
  PagedQueryResult,
  BatchQueryResult,
  ComponentChangeEvent,
  EntityChangeEvent,
  QueryOptions,
  SubscriptionOptions,
  ComponentMetadata,
  ComponentField,
  ComponentDiscoveryResult,
  ResourceMetadata,
  ResourceDiscoveryResult,
  ECSWorldConfig,
  DubheMetadata,
} from './types';

// Main class exports
export { DubheECSWorld } from './world';
export { ComponentDiscoverer, ResourceDiscoverer } from './world';
export { ECSQuery } from './query';
export { ECSSubscription } from './subscription';

// Factory function exports
export { createECSWorld } from './world';

// Utility function exports
export {
  extractEntityIds,
  extractPagedQueryResult,
  calculateDelta,
  findEntityIntersection,
  findEntityUnion,
  extractIntersectionFromBatchResult,
  extractUnionFromBatchResult,
  debounce,
  normalizeComponentType,
  createCacheKey,
  isValidEntityId,
  isValidComponentType,
  deepEqual,
  safeJsonParse,
  formatError,
  createTimestamp,
  limitArray,
  paginateArray,
} from './utils';

// Default export main class
export { DubheECSWorld as default } from './world';
