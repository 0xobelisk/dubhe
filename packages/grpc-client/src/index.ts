// Type exports
export * from './types';

// Protobuf client export (for advanced usage)
export { DubheGrpcClient as ProtoDubheGrpcClient } from './proto/dubhe_grpc.client';

// Re-export protobuf enums as values
export { FilterOperator, SortDirection } from './proto/dubhe_grpc';

// Re-export protobuf types
export type {
  QueryRequest,
  QueryResponse,
  SubscribeRequest,
  TableChange,
  FilterCondition,
  FilterValue,
  SortSpecification,
  PaginationRequest,
  PaginationResponse
} from './proto/dubhe_grpc';

// Index
export { DubheGrpcClient } from './client';
