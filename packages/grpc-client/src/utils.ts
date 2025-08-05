import {
  SimpleFilter,
  FilterOperator,
  FilterValue,
  FilterCondition,
  TableChange,
} from './types';

/**
 * Utility functions for gRPC client operations
 */

/**
 * Parse field value with type detection
 */
export function parseFieldValue(value: any): any {
  if (value === null || value === undefined) return null;

  // If it's already a primitive type, return as-is
  if (typeof value !== 'string') return value;

  // Try to parse as number
  if (/^-?\d+$/.test(value)) {
    return parseInt(value, 10);
  }

  // Try to parse as float
  if (/^-?\d+\.\d+$/.test(value)) {
    return parseFloat(value);
  }

  // Try to parse as boolean
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;

  // Try to parse as JSON
  try {
    return JSON.parse(value);
  } catch {
    // Return as string if parsing fails
    return value;
  }
}

/**
 * Convert a data row to a more usable format with type conversion
 */
export function parseDataRow(row: Record<string, any>): Record<string, any> {
  const parsed: Record<string, any> = {};

  for (const [key, value] of Object.entries(row)) {
    parsed[key] = parseFieldValue(value);
  }

  return parsed;
}

/**
 * Parse multiple data rows
 */
export function parseDataRows(
  rows: Record<string, any>[]
): Record<string, any>[] {
  return rows.map((row) => parseDataRow(row));
}

/**
 * Format table change for display
 */
export function formatTableChange(change: TableChange): string {
  const formattedData = JSON.stringify(change.data, null, 2);
  return `Table: ${change.table_id}\nData: ${formattedData}`;
}

/**
 * Create a filter condition helper
 */
export function createFilter(
  fieldName: string,
  operator: FilterOperator,
  value: any
): FilterCondition {
  return {
    fieldName,
    operator,
    value: convertToFilterValue(value),
  };
}

/**
 * Convert a JavaScript value to FilterValue
 */
function convertToFilterValue(value: any): FilterValue {
  if (typeof value === 'string') {
    return { stringValue: value };
  } else if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { intValue: value };
    } else {
      return { floatValue: value };
    }
  } else if (typeof value === 'boolean') {
    return { boolValue: value };
  } else if (Array.isArray(value)) {
    if (value.length > 0) {
      if (typeof value[0] === 'string') {
        return { stringList: { values: value } };
      } else if (typeof value[0] === 'number') {
        return { intList: { values: value } };
      }
    }
  } else if (value === null || value === undefined) {
    return { nullValue: true };
  }

  // Fallback to string representation
  return { stringValue: String(value) };
}

/**
 * Helper to create common filter conditions
 */
export const FilterHelpers = {
  equals: (fieldName: string, value: string | number | boolean) =>
    createFilter(fieldName, FilterOperator.EQUALS, value),

  notEquals: (fieldName: string, value: string | number | boolean) =>
    createFilter(fieldName, FilterOperator.NOT_EQUALS, value),

  greaterThan: (fieldName: string, value: number) =>
    createFilter(fieldName, FilterOperator.GREATER_THAN, value),

  greaterThanOrEqual: (fieldName: string, value: number) =>
    createFilter(fieldName, FilterOperator.GREATER_THAN_EQUAL, value),

  lessThan: (fieldName: string, value: number) =>
    createFilter(fieldName, FilterOperator.LESS_THAN, value),

  lessThanOrEqual: (fieldName: string, value: number) =>
    createFilter(fieldName, FilterOperator.LESS_THAN_EQUAL, value),

  like: (fieldName: string, pattern: string) =>
    createFilter(fieldName, FilterOperator.LIKE, pattern),

  notLike: (fieldName: string, pattern: string) =>
    createFilter(fieldName, FilterOperator.NOT_LIKE, pattern),

  in: (fieldName: string, values: string[] | number[]) =>
    createFilter(fieldName, FilterOperator.IN, values),

  notIn: (fieldName: string, values: string[] | number[]) =>
    createFilter(fieldName, FilterOperator.NOT_IN, values),

  isNull: (fieldName: string) =>
    createFilter(fieldName, FilterOperator.IS_NULL, null),

  isNotNull: (fieldName: string) =>
    createFilter(fieldName, FilterOperator.IS_NOT_NULL, null),

  between: (fieldName: string, start: string | number, end: string | number) =>
    createFilter(fieldName, FilterOperator.BETWEEN, { start, end }),

  notBetween: (
    fieldName: string,
    start: string | number,
    end: string | number
  ) => createFilter(fieldName, FilterOperator.NOT_BETWEEN, { start, end }),
};

/**
 * Helper to build simple WHERE conditions
 */
export function buildWhereConditions(
  conditions: Record<string, any>
): FilterCondition[] {
  return Object.entries(conditions).map(([fieldName, value]) => {
    if (value === null) {
      return FilterHelpers.isNull(fieldName);
    } else if (Array.isArray(value)) {
      return FilterHelpers.in(fieldName, value);
    } else if (
      typeof value === 'object' &&
      value.min !== undefined &&
      value.max !== undefined
    ) {
      return FilterHelpers.between(fieldName, value.min, value.max);
    } else {
      return FilterHelpers.equals(fieldName, value);
    }
  });
}

/**
 * Helper to validate table names
 */
export function validateTableName(tableName: string): boolean {
  // Basic validation - adjust regex as needed for your naming conventions
  const tableNameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
  return tableNameRegex.test(tableName);
}

/**
 * Helper to validate field names
 */
export function validateFieldName(fieldName: string): boolean {
  // Basic validation - adjust regex as needed for your naming conventions
  const fieldNameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
  return fieldNameRegex.test(fieldName);
}

/**
 * Helper to extract specific fields from rows
 */
export function extractFields(
  rows: Record<string, any>[],
  fieldNames: string[]
): Record<string, any>[] {
  return rows.map((row) => {
    const extracted: Record<string, any> = {};
    fieldNames.forEach((fieldName) => {
      if (fieldName in row) {
        extracted[fieldName] = row[fieldName];
      }
    });
    return extracted;
  });
}

/**
 * Helper to group rows by a field value
 */
export function groupByField(
  rows: Record<string, any>[],
  fieldName: string
): Record<string, Record<string, any>[]> {
  return rows.reduce(
    (groups, row) => {
      const key = String(row[fieldName] || 'null');
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(row);
      return groups;
    },
    {} as Record<string, Record<string, any>[]>
  );
}

/**
 * Helper to sort rows by field values
 */
export function sortRows(
  rows: Record<string, any>[],
  fieldName: string,
  direction: 'asc' | 'desc' = 'asc'
): Record<string, any>[] {
  return [...rows].sort((a, b) => {
    const aVal = a[fieldName];
    const bVal = b[fieldName];

    if (aVal === bVal) return 0;
    if (aVal == null) return direction === 'asc' ? -1 : 1;
    if (bVal == null) return direction === 'asc' ? 1 : -1;

    if (direction === 'asc') {
      return aVal < bVal ? -1 : 1;
    } else {
      return aVal > bVal ? -1 : 1;
    }
  });
}

/**
 * Helper to filter rows using simple conditions
 */
export function filterRows(
  rows: Record<string, any>[],
  conditions: SimpleFilter
): Record<string, any>[] {
  return rows.filter((row) => {
    return Object.entries(conditions).every(([fieldName, condition]) => {
      const fieldValue = row[fieldName];

      if (condition === null) {
        return fieldValue == null;
      }

      if (
        typeof condition === 'string' ||
        typeof condition === 'number' ||
        typeof condition === 'boolean'
      ) {
        return fieldValue === condition;
      }

      if (Array.isArray(condition)) {
        return (condition as (string | number | boolean)[]).includes(
          fieldValue
        );
      }

      if (typeof condition === 'object' && condition !== null) {
        if ('operator' in condition && 'value' in condition) {
          // Handle custom operator conditions
          return evaluateCondition(
            fieldValue,
            condition.operator,
            condition.value
          );
        }

        if ('min' in condition && 'max' in condition) {
          // Handle range conditions
          return fieldValue >= condition.min && fieldValue <= condition.max;
        }
      }

      return false;
    });
  });
}

/**
 * Helper to evaluate a condition
 */
function evaluateCondition(
  fieldValue: any,
  operator: FilterOperator,
  conditionValue: any
): boolean {
  switch (operator) {
    case FilterOperator.EQUALS:
      return fieldValue === conditionValue;
    case FilterOperator.NOT_EQUALS:
      return fieldValue !== conditionValue;
    case FilterOperator.GREATER_THAN:
      return fieldValue > conditionValue;
    case FilterOperator.GREATER_THAN_EQUAL:
      return fieldValue >= conditionValue;
    case FilterOperator.LESS_THAN:
      return fieldValue < conditionValue;
    case FilterOperator.LESS_THAN_EQUAL:
      return fieldValue <= conditionValue;
    case FilterOperator.LIKE:
      return String(fieldValue).includes(
        String(conditionValue).replace(/%/g, '')
      );
    case FilterOperator.NOT_LIKE:
      return !String(fieldValue).includes(
        String(conditionValue).replace(/%/g, '')
      );
    case FilterOperator.IN:
      return (
        Array.isArray(conditionValue) && conditionValue.includes(fieldValue)
      );
    case FilterOperator.NOT_IN:
      return (
        Array.isArray(conditionValue) && !conditionValue.includes(fieldValue)
      );
    case FilterOperator.IS_NULL:
      return fieldValue == null;
    case FilterOperator.IS_NOT_NULL:
      return fieldValue != null;
    case FilterOperator.BETWEEN:
      if (
        typeof conditionValue === 'object' &&
        conditionValue.start !== undefined &&
        conditionValue.end !== undefined
      ) {
        return (
          fieldValue >= conditionValue.start && fieldValue <= conditionValue.end
        );
      }
      return false;
    case FilterOperator.NOT_BETWEEN:
      if (
        typeof conditionValue === 'object' &&
        conditionValue.start !== undefined &&
        conditionValue.end !== undefined
      ) {
        return (
          fieldValue < conditionValue.start || fieldValue > conditionValue.end
        );
      }
      return false;
    default:
      return false;
  }
}

/**
 * Helper to calculate pagination info
 */
export function calculatePagination(
  totalItems: number,
  currentPage: number,
  pageSize: number
) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    startIndex: (currentPage - 1) * pageSize,
    endIndex: Math.min(currentPage * pageSize - 1, totalItems - 1),
  };
}

/**
 * Helper to create query debugging info
 */
export function debugQuery(
  tableName: string,
  conditions?: FilterCondition[]
): string {
  let debug = `Query Table: ${tableName}\n`;

  if (conditions && conditions.length > 0) {
    debug += 'Conditions:\n';
    conditions.forEach((condition, index) => {
      debug += `  ${index + 1}. ${condition.fieldName} ${condition.operator} ${JSON.stringify(condition.value)}\n`;
    });
  }

  return debug;
}
