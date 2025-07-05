// ECS utility functions

import {
  EntityId,
  ComponentType,
  QueryChange,
  PagedQueryResult,
} from './types';
import { Connection, StoreTableRow } from '@0xobelisk/graphql-client';

/**
 * Extract entity IDs from GraphQL query results
 * @param connection GraphQL query result
 * @param options Extraction options
 * @param options.idFields Field names to use as entity ID, defaults to ['nodeId', 'entityId']
 * @param options.composite Whether to compose multiple fields as ID, defaults to false
 */
export function extractEntityIds<T extends StoreTableRow>(
  connection: Connection<T>,
  options?: {
    idFields?: string[];
    composite?: boolean;
  }
): EntityId[] {
  const { idFields = ['nodeId', 'entityId'], composite = false } =
    options || {};

  return connection.edges
    .map((edge) => {
      const node = edge.node as any;

      if (composite) {
        // Compose multiple fields as ID
        const idParts = idFields
          .map((field) => node[field] || '')
          .filter(Boolean);
        return idParts.join('|'); // Use | separator to compose
      } else {
        // Try to find the first existing field as ID
        for (const field of idFields) {
          if (node[field] !== undefined && node[field] !== null) {
            return node[field] as EntityId;
          }
        }

        // If none found, return the first available value or empty string
        return (Object.values(node)[0] as EntityId) || '';
      }
    })
    .filter(Boolean); // Filter out empty values
}

/**
 * Extract complete paginated query result from GraphQL connection
 * @param connection GraphQL query result
 * @param options Extraction options
 * @param options.idFields Field names to use as entity ID, defaults to ['nodeId', 'entityId']
 * @param options.composite Whether to compose multiple fields as ID, defaults to false
 */
export function extractPagedQueryResult<T extends StoreTableRow>(
  connection: Connection<T>,
  options?: {
    idFields?: string[];
    composite?: boolean;
  }
): PagedQueryResult<T> {
  const entityIds = extractEntityIds(connection, options);
  const items = connection.edges.map((edge) => edge.node);

  return {
    entityIds,
    items,
    pageInfo: {
      hasNextPage: connection.pageInfo.hasNextPage,
      hasPreviousPage: connection.pageInfo.hasPreviousPage,
      startCursor: connection.pageInfo.startCursor,
      endCursor: connection.pageInfo.endCursor,
    },
    totalCount: connection.totalCount || 0,
  };
}

/**
 * Calculate differences between two entity ID arrays
 */
export function calculateDelta(
  oldResults: EntityId[],
  newResults: EntityId[]
): QueryChange {
  const oldSet = new Set(oldResults);
  const newSet = new Set(newResults);

  const added = newResults.filter((id) => !oldSet.has(id));
  const removed = oldResults.filter((id) => !newSet.has(id));

  return {
    added,
    removed,
    current: newResults,
  };
}

/**
 * Find intersection of multiple entity ID arrays
 */
export function findEntityIntersection(entitySets: EntityId[][]): EntityId[] {
  if (entitySets.length === 0) return [];
  if (entitySets.length === 1) return entitySets[0];

  return entitySets.reduce((intersection, currentSet) => {
    const currentSetLookup = new Set(currentSet);
    return intersection.filter((id) => currentSetLookup.has(id));
  });
}

/**
 * Find union of multiple entity ID arrays
 */
export function findEntityUnion(entitySets: EntityId[][]): EntityId[] {
  const unionSet = new Set<EntityId>();

  entitySets.forEach((set) => {
    set.forEach((id) => unionSet.add(id));
  });

  return Array.from(unionSet);
}

/**
 * Extract entity intersection from batch query results
 */
export function extractIntersectionFromBatchResult(
  batchResult: Record<string, Connection<StoreTableRow>>,
  componentTypes: ComponentType[],
  options?: {
    idFields?: string[];
    composite?: boolean;
  }
): EntityId[] {
  const entitySets = componentTypes.map((type) => {
    const connection = batchResult[type];
    return connection ? extractEntityIds(connection, options) : [];
  });

  return findEntityIntersection(entitySets);
}

/**
 * Extract entity union from batch query results
 */
export function extractUnionFromBatchResult(
  batchResult: Record<string, Connection<StoreTableRow>>,
  componentTypes: ComponentType[],
  options?: {
    idFields?: string[];
    composite?: boolean;
  }
): EntityId[] {
  const entitySets = componentTypes.map((type) => {
    const connection = batchResult[type];
    return connection ? extractEntityIds(connection, options) : [];
  });

  return findEntityUnion(entitySets);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, waitMs);
  };
}

/**
 * Normalize component type name (handle singular/plural)
 */
export function normalizeComponentType(componentType: ComponentType): {
  singular: string;
  plural: string;
} {
  // Simple singular/plural conversion logic
  const singular = componentType.endsWith('s')
    ? componentType.slice(0, -1)
    : componentType;

  const plural = componentType.endsWith('s')
    ? componentType
    : componentType + 's';

  return { singular, plural };
}

/**
 * Create cache key
 */
export function createCacheKey(
  operation: string,
  componentTypes: ComponentType[],
  options?: Record<string, any>
): string {
  const sortedTypes = [...componentTypes].sort();
  const optionsStr = options ? JSON.stringify(options) : '';
  return `${operation}:${sortedTypes.join(',')}:${optionsStr}`;
}

/**
 * Validate entity ID format
 */
export function isValidEntityId(entityId: any): entityId is EntityId {
  return typeof entityId === 'string' && entityId.length > 0;
}

/**
 * Validate component type format
 */
export function isValidComponentType(
  componentType: any
): componentType is ComponentType {
  return typeof componentType === 'string' && componentType.length > 0;
}

/**
 * Deep compare two objects for equality
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;

  if (obj1 == null || obj2 == null) return false;

  if (typeof obj1 !== typeof obj2) return false;

  if (typeof obj1 !== 'object') return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

/**
 * Safely parse JSON
 */
export function safeJsonParse<T = any>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

/**
 * Format error message
 */
export function formatError(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return JSON.stringify(error);
}

/**
 * Create timestamp
 */
export function createTimestamp(): number {
  return Date.now();
}

/**
 * Limit array size
 */
export function limitArray<T>(array: T[], limit: number): T[] {
  return limit > 0 ? array.slice(0, limit) : array;
}

/**
 * Paginate array
 */
export function paginateArray<T>(
  array: T[],
  page: number,
  pageSize: number
): {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
} {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const items = array.slice(startIndex, endIndex);

  return {
    items,
    totalCount: array.length,
    hasMore: endIndex < array.length,
    page,
    pageSize,
  };
}
