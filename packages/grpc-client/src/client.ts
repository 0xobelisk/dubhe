import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { EventEmitter } from 'events';
import path from 'path';

import {
  DubheGrpcClientConfig,
  QueryRequest,
  QueryResponse,
  SubscribeRequest,
  TableChange,
  SubscriptionOptions,
  QueryOptions,
  ConnectionStatus,
  FilterCondition,
  FilterOperator,
  FilterValue,
  SortSpecification,
  SortDirection,
  SimpleQueryOptions,
  SimpleFilter,
  QueryBuilder,
} from './types';

// Load protobuf definition
const PROTO_PATH = path.join(__dirname, '../proto/dubhe_grpc.proto');

interface ProtoGrpcType {
  dubhe_grpc: {
    DubheGrpc: grpc.ServiceClientConstructor;
    QueryRequest: any;
    QueryResponse: any;
    SubscribeRequest: any;
    TableChange: any;
    FilterOperator: any;
    SortDirection: any;
  };
}

export class DubheGrpcClient extends EventEmitter {
  private client: grpc.Client | null = null;
  private config: DubheGrpcClientConfig;
  private status: ConnectionStatus = 'disconnected';
  private activeSubscriptions: Map<string, grpc.ClientReadableStream<any>> =
    new Map();

  constructor(config: DubheGrpcClientConfig) {
    super();
    this.config = {
      enableRetry: true,
      retryAttempts: 3,
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Connect to the gRPC server
   */
  async connect(): Promise<void> {
    try {
      this.status = 'connecting';
      this.emit('connecting');

      // Load protobuf definition
      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const protoDescriptor = grpc.loadPackageDefinition(
        packageDefinition
      ) as unknown as ProtoGrpcType;
      const DubheGrpc = protoDescriptor.dubhe_grpc.DubheGrpc;

      // Create client
      this.client = new DubheGrpc(
        this.config.endpoint,
        grpc.credentials.createInsecure()
      ) as grpc.Client;

      this.status = 'connected';
      this.emit('connect');
    } catch (error) {
      this.status = 'error';
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect from the gRPC server
   */
  disconnect(): void {
    // Close all active subscriptions
    this.activeSubscriptions.forEach((stream, _id) => {
      stream.cancel();
    });
    this.activeSubscriptions.clear();

    if (this.client) {
      this.client.close();
      this.client = null;
    }

    this.status = 'disconnected';
    this.emit('disconnect');
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Query table with full QueryRequest options
   */
  async queryTable(
    request: QueryRequest,
    options: QueryOptions = {}
  ): Promise<QueryResponse> {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    return new Promise((resolve, reject) => {
      const deadline = new Date();
      deadline.setMilliseconds(
        deadline.getMilliseconds() + (options.timeout || this.config.timeout!)
      );

      // Convert our TypeScript types to protobuf format
      const protoRequest = this.convertQueryRequestToProto(request);

      (this.client as any).queryTable(
        protoRequest,
        { deadline },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            reject(new Error(`Query failed: ${error.message}`));
          } else {
            // Convert protobuf response to our TypeScript format
            const convertedResponse =
              this.convertQueryResponseFromProto(response);
            resolve(convertedResponse);
          }
        }
      );
    });
  }

  /**
   * Query table with simplified options
   */
  async query(
    tableName: string,
    options: SimpleQueryOptions = {}
  ): Promise<QueryResponse> {
    const queryRequest = this.buildQueryRequest(tableName, options);
    return this.queryTable(queryRequest);
  }

  /**
   * Subscribe to table updates (inspired by Rust test implementation)
   */
  subscribeTable(tableIds: string[], options: SubscriptionOptions): string {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    const request: SubscribeRequest = {
      table_ids: tableIds,
    };

    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const stream = (this.client as any).subscribeTable(request);

      // Handle successful data reception
      stream.on('data', (change: any) => {
        try {
          // Convert protobuf TableChange to our TypeScript format
          const convertedChange = this.convertTableChangeFromProto(change);
          options.onUpdate(convertedChange);
        } catch (error) {
          console.error('❌ Error processing table change:', error);
          if (options.onError) {
            options.onError(error as Error);
          }
        }
      });

      // Handle stream errors (similar to Rust error handling)
      stream.on('error', (error: Error) => {
        console.error('❌ gRPC stream error:', error);
        this.activeSubscriptions.delete(subscriptionId);
        if (options.onError) {
          options.onError(error);
        }
      });

      // Handle stream end/disconnection
      stream.on('end', () => {
        console.log('❌ gRPC subscription closed');
        this.activeSubscriptions.delete(subscriptionId);
        if (options.onDisconnect) {
          options.onDisconnect();
        }
      });

      // Handle stream cancellation
      stream.on('cancelled', () => {
        console.log('🛑 gRPC subscription cancelled');
        this.activeSubscriptions.delete(subscriptionId);
        if (options.onDisconnect) {
          options.onDisconnect();
        }
      });

      // Store the stream for later cleanup
      this.activeSubscriptions.set(subscriptionId, stream);

      // Notify successful connection
      if (options.onConnect) {
        options.onConnect();
      }

      return subscriptionId;
    } catch (error) {
      console.error('❌ Failed to create subscription:', error);
      if (options.onError) {
        options.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Unsubscribe from a table subscription
   */
  unsubscribe(subscriptionId: string): void {
    const stream = this.activeSubscriptions.get(subscriptionId);
    if (stream) {
      stream.cancel();
      this.activeSubscriptions.delete(subscriptionId);
    }
  }

  /**
   * Get all active subscription IDs
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.activeSubscriptions.keys());
  }

  /**
   * Create a query builder for fluent query construction
   */
  createQueryBuilder(): QueryBuilder {
    return new QueryBuilderImpl();
  }

  /**
   * Helper method to build QueryRequest from simple options
   */
  private buildQueryRequest(
    tableName: string,
    options: SimpleQueryOptions
  ): QueryRequest {
    const request: QueryRequest = {
      tableName,
    };

    if (options.select) {
      request.selectFields = options.select;
    }

    if (options.where) {
      request.filters = this.buildFiltersFromSimple(options.where);
    }

    if (options.orderBy) {
      request.sorts = this.buildSortsFromSimple(options.orderBy);
    }

    if (options.page && options.pageSize) {
      request.pagination = {
        page: options.page,
        pageSize: options.pageSize,
      };
    } else if (options.offset !== undefined) {
      request.pagination = {
        page: 1,
        pageSize: options.pageSize || 100,
        offset: options.offset,
      };
    }

    if (options.includeTotalCount !== undefined) {
      request.includeTotalCount = options.includeTotalCount;
    }

    return request;
  }

  /**
   * Build filters from simple filter format
   */
  private buildFiltersFromSimple(
    simpleFilter: SimpleFilter
  ): FilterCondition[] {
    const filters: FilterCondition[] = [];

    for (const [fieldName, filterValue] of Object.entries(simpleFilter)) {
      if (filterValue === null) {
        filters.push({
          fieldName,
          operator: FilterOperator.IS_NULL,
          value: { nullValue: true },
        });
      } else if (typeof filterValue === 'string') {
        filters.push({
          fieldName,
          operator: FilterOperator.EQUALS,
          value: { stringValue: filterValue },
        });
      } else if (typeof filterValue === 'number') {
        filters.push({
          fieldName,
          operator: FilterOperator.EQUALS,
          value: { intValue: filterValue },
        });
      } else if (typeof filterValue === 'boolean') {
        filters.push({
          fieldName,
          operator: FilterOperator.EQUALS,
          value: { boolValue: filterValue },
        });
      } else if (Array.isArray(filterValue)) {
        if (filterValue.length > 0) {
          if (typeof filterValue[0] === 'string') {
            filters.push({
              fieldName,
              operator: FilterOperator.IN,
              value: { stringList: { values: filterValue as string[] } },
            });
          } else if (typeof filterValue[0] === 'number') {
            filters.push({
              fieldName,
              operator: FilterOperator.IN,
              value: { intList: { values: filterValue as number[] } },
            });
          }
        }
      } else if (typeof filterValue === 'object') {
        if ('operator' in filterValue && 'value' in filterValue) {
          // Custom operator format
          filters.push({
            fieldName,
            operator: filterValue.operator,
            value: this.convertToFilterValue(filterValue.value),
          });
        } else if ('min' in filterValue && 'max' in filterValue) {
          // Range format for BETWEEN
          filters.push({
            fieldName,
            operator: FilterOperator.BETWEEN,
            value: {
              range: {
                start: filterValue.min,
                end: filterValue.max,
              },
            },
          });
        }
      }
    }

    return filters;
  }

  /**
   * Build sorts from simple sort format
   */
  private buildSortsFromSimple(
    orderBy: string | { field: string; direction?: 'asc' | 'desc' }[]
  ): SortSpecification[] {
    if (typeof orderBy === 'string') {
      return [
        {
          fieldName: orderBy,
          direction: SortDirection.ASCENDING,
        },
      ];
    }

    return orderBy.map((sort, index) => ({
      fieldName: sort.field,
      direction:
        sort.direction === 'desc'
          ? SortDirection.DESCENDING
          : SortDirection.ASCENDING,
      priority: index,
    }));
  }

  /**
   * Convert JavaScript value to FilterValue
   */
  private convertToFilterValue(value: any): FilterValue {
    if (typeof value === 'string') {
      return { stringValue: value };
    } else if (typeof value === 'number') {
      return { intValue: value };
    } else if (typeof value === 'boolean') {
      return { boolValue: value };
    } else if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'string') {
        return { stringList: { values: value } };
      } else if (value.length > 0 && typeof value[0] === 'number') {
        return { intList: { values: value } };
      }
    }
    return { stringValue: String(value) };
  }

  /**
   * Convert QueryRequest to protobuf format
   */
  private convertQueryRequestToProto(request: QueryRequest): any {
    const protoRequest: any = {
      table_name: request.tableName,
    };

    if (request.selectFields) {
      protoRequest.select_fields = request.selectFields;
    }

    if (request.filters) {
      protoRequest.filters = request.filters.map((filter) => ({
        field_name: filter.fieldName,
        operator: this.convertFilterOperatorToProto(filter.operator),
        value: this.convertFilterValueToProto(filter.value),
      }));
    }

    if (request.sorts) {
      protoRequest.sorts = request.sorts.map((sort) => ({
        field_name: sort.fieldName,
        direction: sort.direction === SortDirection.ASCENDING ? 0 : 1,
        priority: sort.priority,
      }));
    }

    if (request.pagination) {
      protoRequest.pagination = {
        page: request.pagination.page,
        page_size: request.pagination.pageSize,
        offset: request.pagination.offset,
      };
    }

    if (request.includeTotalCount !== undefined) {
      protoRequest.include_total_count = request.includeTotalCount;
    }

    return protoRequest;
  }

  /**
   * Convert FilterOperator to protobuf enum value
   */
  private convertFilterOperatorToProto(operator: FilterOperator): number {
    const mapping = {
      [FilterOperator.EQUALS]: 0,
      [FilterOperator.NOT_EQUALS]: 1,
      [FilterOperator.GREATER_THAN]: 2,
      [FilterOperator.GREATER_THAN_EQUAL]: 3,
      [FilterOperator.LESS_THAN]: 4,
      [FilterOperator.LESS_THAN_EQUAL]: 5,
      [FilterOperator.LIKE]: 6,
      [FilterOperator.NOT_LIKE]: 7,
      [FilterOperator.IN]: 8,
      [FilterOperator.NOT_IN]: 9,
      [FilterOperator.IS_NULL]: 10,
      [FilterOperator.IS_NOT_NULL]: 11,
      [FilterOperator.BETWEEN]: 12,
      [FilterOperator.NOT_BETWEEN]: 13,
    };
    return mapping[operator] || 0;
  }

  /**
   * Convert FilterValue to protobuf format
   */
  private convertFilterValueToProto(value: FilterValue): any {
    if ('stringValue' in value) {
      return { string_value: value.stringValue };
    } else if ('intValue' in value) {
      return { int_value: value.intValue };
    } else if ('floatValue' in value) {
      return { float_value: value.floatValue };
    } else if ('boolValue' in value) {
      return { bool_value: value.boolValue };
    } else if ('stringList' in value) {
      return { string_list: { values: value.stringList.values } };
    } else if ('intList' in value) {
      return { int_list: { values: value.intList.values } };
    } else if ('range' in value) {
      const range: any = {};
      if (typeof value.range.start === 'string') {
        range.string_start = value.range.start;
      } else if (typeof value.range.start === 'number') {
        range.int_start = value.range.start;
      }
      if (typeof value.range.end === 'string') {
        range.string_end = value.range.end;
      } else if (typeof value.range.end === 'number') {
        range.int_end = value.range.end;
      }
      return { range };
    } else if ('nullValue' in value) {
      return { null_value: value.nullValue };
    }
    return { string_value: '' };
  }

  /**
   * Convert protobuf QueryResponse to our format
   */
  private convertQueryResponseFromProto(response: any): QueryResponse {
    const result: QueryResponse = {
      rows: response.rows || [],
    };

    if (response.pagination) {
      result.pagination = {
        currentPage: response.pagination.current_page,
        pageSize: response.pagination.page_size,
        totalItems: response.pagination.total_items,
        totalPages: response.pagination.total_pages,
        hasNextPage: response.pagination.has_next_page,
        hasPreviousPage: response.pagination.has_previous_page,
      };
    }

    return result;
  }

  /**
   * Convert protobuf TableChange to our format
   */
  private convertTableChangeFromProto(change: any): TableChange {
    return {
      table_id: change.table_id,
      data: change.data || {},
    };
  }
}

/**
 * Query builder implementation
 */
class QueryBuilderImpl implements QueryBuilder {
  private request: Partial<QueryRequest> = {};

  tableName(name: string): QueryBuilder {
    this.request.tableName = name;
    return this;
  }

  select(...fields: string[]): QueryBuilder {
    this.request.selectFields = fields;
    return this;
  }

  where(conditions: SimpleFilter): QueryBuilder {
    // This would need to be implemented to convert SimpleFilter to FilterCondition[]
    // For now, we'll store it and let the client handle the conversion
    (this.request as any)._simpleWhere = conditions;
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryBuilder {
    if (!this.request.sorts) {
      this.request.sorts = [];
    }
    this.request.sorts.push({
      fieldName: field,
      direction:
        direction === 'desc'
          ? SortDirection.DESCENDING
          : SortDirection.ASCENDING,
      priority: this.request.sorts.length,
    });
    return this;
  }

  page(page: number, pageSize: number): QueryBuilder {
    this.request.pagination = { page, pageSize };
    return this;
  }

  offset(offset: number, limit: number): QueryBuilder {
    this.request.pagination = { page: 1, pageSize: limit, offset };
    return this;
  }

  build(): QueryRequest {
    if (!this.request.tableName) {
      throw new Error('Table name is required');
    }
    return this.request as QueryRequest;
  }
}

/**
 * Create a new DubheGrpcClient instance
 */
export function createDubheGrpcClient(
  config: DubheGrpcClientConfig
): DubheGrpcClient {
  return new DubheGrpcClient(config);
}

/**
 * Utility functions for working with gRPC responses
 */
export class GrpcUtils {
  /**
   * Extract field value from a protobuf Struct
   */
  static extractField(data: Record<string, any>, fieldName: string): any {
    return data[fieldName];
  }

  /**
   * Convert protobuf Struct to plain object
   */
  static structToObject(struct: Record<string, any>): Record<string, any> {
    return struct;
  }

  /**
   * Filter rows by field values
   */
  static filterRows(
    rows: Record<string, any>[],
    filter: SimpleFilter
  ): Record<string, any>[] {
    return rows.filter((row) => {
      for (const [fieldName, filterValue] of Object.entries(filter)) {
        const fieldValue = row[fieldName];

        if (filterValue === null) {
          if (fieldValue !== null && fieldValue !== undefined) return false;
        } else if (
          typeof filterValue === 'string' ||
          typeof filterValue === 'number'
        ) {
          if (fieldValue !== filterValue) return false;
        } else if (Array.isArray(filterValue)) {
          if (!(filterValue as (string | number)[]).includes(fieldValue))
            return false;
        }
        // Add more filter logic as needed
      }
      return true;
    });
  }
}
