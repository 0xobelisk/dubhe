import { Http } from '../http';
import { parseValue } from './utils';
import { SubscribableType } from '../../types';

export enum SubscriptionKind {
  Event = 'event',
  Schema = 'schema',
}

export type JsonValueType = 'STRING' | 'INTEGER' | 'FLOAT' | 'BOOLEAN';

export interface JsonPathOrder {
  path: string;
  direction: 'ASC' | 'DESC';
  type?: JsonValueType;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor?: string;
}

export interface IndexerTransaction {
  id: number;
  checkpoint: number;
  digest: string;
  sender: string;
  package: string;
  module: string;
  function: string;
  arguments: any;
  created_at: string;
  events?: IndexerEvent[];
}

export interface IndexerSchema {
  id: number;
  name: string;
  key1?: any;
  key2?: any;
  value: any;
  last_update_checkpoint: string;
  last_update_digest: string;
  is_removed: boolean;
  created_at: string;
  updated_at: string;
}

export interface IndexerEvent {
  id: number;
  checkpoint: string;
  digest: string;
  name: string;
  sender: string;
  value: any;
  created_at: string;
}

export interface ConnectionResponse<T> {
  edges: Array<{
    cursor: string;
    node: T;
  }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface StorageResponse<T> {
  data: T[];
  value: any[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface StorageItemResponse<T> {
  data: T;
  value: any;
}

export class SuiIndexerClient {
  private http: Http;

  constructor(http: Http) {
    this.http = http;
  }

  private async fetchGraphql<T>(query: string, variables?: any): Promise<T> {
    return this.http.fetchGraphql({ query, variables });
  }

  async getTransactions(params?: {
    first?: number;
    after?: string;
    sender?: string;
    digest?: string;
    checkpoint?: number;
    packageId?: string;
    module?: string;
    functionName?: string[];
    orderBy?: string[];
    showEvent?: boolean;
  }): Promise<ConnectionResponse<IndexerTransaction>> {
    const query = `
      query GetTransactions(
        $first: Int, 
        $after: String, 
        $sender: String, 
        $digest: String, 
        $checkpoint: Int, 
        $packageId: String,
        $module: String,
        $functionName: [String!],
        $orderBy: [TransactionOrderField!],
        $showEvent: Boolean!
      ) {
        transactions(
          first: $first, 
          after: $after, 
          sender: $sender, 
          digest: $digest, 
          checkpoint: $checkpoint,
          packageId: $packageId,
          module: $module,
          functionName: $functionName,
          orderBy: $orderBy,
          showEvent: $showEvent
        ) {
          edges {
            cursor
            node {
              id
              checkpoint
              digest
              sender
              package
              module
              function
              arguments
              created_at
              events @include(if: $showEvent) {
                id
                checkpoint
                digest
                name
                sender
                value
                created_at
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
        }
      }
    `;

    const response = await this.fetchGraphql<{
      transactions: ConnectionResponse<IndexerTransaction>;
    }>(query, { ...params, showEvent: params?.showEvent ?? false });
    return response.transactions;
  }

  async getTransaction(
    digest: string,
    showEvent?: boolean
  ): Promise<IndexerTransaction | undefined> {
    const response = await this.getTransactions({
      first: 1,
      digest,
      showEvent,
    });
    return response.edges[0]?.node;
  }

  async getSchemas(params?: {
    first?: number;
    after?: string;
    name?: string;
    key1?: any;
    key2?: any;
    is_removed?: boolean;
    last_update_checkpoint?: string;
    last_update_digest?: string;
    value?: any;
    orderBy?: string[];
    jsonOrderBy?: JsonPathOrder[];
  }): Promise<ConnectionResponse<IndexerSchema>> {
    const query = `
      query GetSchemas(
        $first: Int, 
        $after: String, 
        $name: String, 
        $key1: JSON, 
        $key2: JSON,
        $is_removed: Boolean,
        $last_update_checkpoint: String,
        $last_update_digest: String,
        $value: JSON,
        $orderBy: [SchemaOrderField!],
        $jsonOrderBy: [JsonPathOrder!]
      ) {
        schemas(
          first: $first,
          after: $after,
          name: $name,
          key1: $key1,
          key2: $key2,
          is_removed: $is_removed,
          last_update_checkpoint: $last_update_checkpoint,
          last_update_digest: $last_update_digest,
          value: $value,
          orderBy: $orderBy,
          jsonOrderBy: $jsonOrderBy
        ) {
          edges {
            cursor
            node {
              id
              name
              key1
              key2
              value
              last_update_checkpoint
              last_update_digest
              is_removed
              created_at
              updated_at
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
        }
      }
    `;

    const response = await this.fetchGraphql<{
      schemas: ConnectionResponse<IndexerSchema>;
    }>(query, params);
    return response.schemas;
  }

  async getEvents(params?: {
    first?: number;
    after?: string;
    names?: string[];
    sender?: string;
    digest?: string;
    checkpoint?: string;
    orderBy?: string[];
  }): Promise<ConnectionResponse<IndexerEvent>> {
    const query = `
      query GetEvents($first: Int, $after: String, $names: [String!], $sender: String, $digest: String, $checkpoint: String, $orderBy: [EventOrderField!]) {
        events(first: $first, after: $after, names: $names, sender: $sender, digest: $digest, checkpoint: $checkpoint, orderBy: $orderBy) {
          edges {
            cursor
            node {
              id
              checkpoint
              digest
              name
              sender
              value
              created_at
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
        }
      }
    `;

    const response = await this.fetchGraphql<{
      events: ConnectionResponse<IndexerEvent>;
    }>(query, params);
    return response.events;
  }

  async getStorage({
    name,
    key1,
    key2,
    is_removed = false,
    last_update_checkpoint,
    last_update_digest,
    value,
    first,
    after,
    orderBy,
    jsonOrderBy,
  }: {
    name?: string;
    key1?: any;
    key2?: any;
    is_removed?: boolean;
    last_update_checkpoint?: string;
    last_update_digest?: string;
    value?: any;
    first?: number;
    after?: string;
    orderBy?: string[];
    jsonOrderBy?: JsonPathOrder[];
  }): Promise<StorageResponse<IndexerSchema>> {
    const schemas = await this.getSchemas({
      name,
      key1,
      key2,
      is_removed,
      last_update_checkpoint,
      last_update_digest,
      value,
      first,
      after,
      orderBy,
      jsonOrderBy,
    });
    const data = schemas.edges.map((edge) => edge.node);
    const result = data.map((item) => parseValue(item.value));
    return {
      data,
      value: result,
      pageInfo: schemas.pageInfo,
      totalCount: schemas.totalCount,
    };
  }

  async getStorageItem({
    name,
    key1,
    key2,
    is_removed,
    last_update_checkpoint,
    last_update_digest,
    value,
  }: {
    name: string;
    key1?: any;
    key2?: any;
    is_removed?: boolean;
    last_update_checkpoint?: string;
    last_update_digest?: string;
    value?: any;
  }): Promise<StorageItemResponse<IndexerSchema> | undefined> {
    const schemas = await this.getSchemas({
      name,
      key1,
      key2,
      is_removed,
      last_update_checkpoint,
      last_update_digest,
      value,
      first: 1,
    });
    const data = schemas.edges[0]?.node;
    if (!data) {
      return undefined;
    }
    const result = parseValue(data.value);
    return {
      data,
      value: result,
    };
  }

  async subscribe(
    types: SubscribableType[],
    handleData: (data: any) => void
  ): Promise<WebSocket> {
    return this.http.subscribe(types, handleData);
  }
}
