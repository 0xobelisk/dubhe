import { makeExecutableSchema } from '@graphql-tools/schema';
import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { and, eq, gt, asc, desc, sql } from 'drizzle-orm';
import { dubheStoreEvents, dubheStoreSchemas, dubheStoreTransactions } from './tables';

const typeDefs = `
  enum OrderDirection {
    ASC
    DESC
  }

  enum JsonValueType {
    STRING
    INTEGER
    FLOAT
    BOOLEAN
  }

  input JsonPathOrder {
    path: String!
    direction: OrderDirection!
    type: JsonValueType = STRING
  }

  enum SchemaOrderField {
    ID_DESC
    ID_ASC
    CREATED_AT_DESC
    CREATED_AT_ASC
    UPDATED_AT_DESC
    UPDATED_AT_ASC
    KEY1_ASC
    KEY2_ASC
    KEY1_DESC
    KEY2_DESC
    VALUE_ASC
    VALUE_DESC
  }

  enum EventOrderField {
    ID_DESC
    ID_ASC
    CREATED_AT_DESC
    CREATED_AT_ASC
    CHECKPOINT_DESC
    CHECKPOINT_ASC
  }

  enum TransactionOrderField {
    ID_DESC
    ID_ASC
    CREATED_AT_DESC
    CREATED_AT_ASC
    CHECKPOINT_DESC
    CHECKPOINT_ASC
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  type TransactionEdge {
    cursor: String!
    node: Transaction!
  }

  type TransactionConnection {
    edges: [TransactionEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type SchemaEdge {
    cursor: String!
    node: Schema!
  }

  type SchemaConnection {
    edges: [SchemaEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type EventEdge {
    cursor: String!
    node: Event!
  }

  type EventConnection {
    edges: [EventEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type Query {
    schemas(
      first: Int
      after: String
      name: String
      key1: JSON
      key2: JSON
      is_removed: Boolean
      last_update_checkpoint: String
      last_update_digest: String
      value: JSON
      orderBy: [SchemaOrderField!]
      jsonOrderBy: [JsonPathOrder!]
    ): SchemaConnection!

    events(
      first: Int
      after: String
      names: [String!]
      sender: String
      digest: String
      checkpoint: String
      orderBy: [EventOrderField!]
    ): EventConnection!

    transactions(
      first: Int
      after: String
      sender: String
      digest: String
      checkpoint: Int
      packageId: String
      module: String
      functionName: [String!]
      orderBy: [TransactionOrderField!]
      showEvent: Boolean
    ): TransactionConnection!
  }

  type Transaction {
    id: Int!
    sender: String!
    checkpoint: Int!
    digest: String!
    package: String!
    module: String!
    function: String!
    arguments: JSON!
    created_at: String!
    events: [Event!]
  }

  type Schema {
    id: Int!
    name: String!
    key1: JSON
    key2: JSON
    value: JSON!
    last_update_checkpoint: String!
    last_update_digest: String!
    is_removed: Boolean!
    created_at: String!
    updated_at: String!
  }

  type Event {
    id: Int!
    sender: String!
    checkpoint: String!
    digest: String!
    name: String!
    value: JSON!
    created_at: String!
  }

  type Subscription {
    onNewTransaction: Transaction
    onNewSchema: Schema
    onNewEvent: Event
  }

  scalar JSON
`;

export function createResolvers(
  database: BaseSQLiteDatabase<'sync', any>,
  defaultPageSize: number,
  paginationLimit: number
) {
  const DEFAULT_PAGE_SIZE = defaultPageSize;
  const PAGINATION_LIMIT = paginationLimit;

  const encodeCursor = (id: number) => Buffer.from(id.toString()).toString('base64');

  const decodeCursor = (cursor: string) => parseInt(Buffer.from(cursor, 'base64').toString());

  const applyOrderBy = (query: any, table: any, orderBy?: string[], jsonOrderBy?: any[]) => {
    if (!orderBy && (!jsonOrderBy || jsonOrderBy.length === 0)) {
      return query.orderBy(desc(table.created_at));
    }

    try {
      if (orderBy) {
        orderBy.forEach((order) => {
          const isDesc = order.endsWith('_DESC');
          const isAsc = order.endsWith('_ASC');

          if (!isDesc && !isAsc) {
            console.warn('Invalid order format:', order);
            return query;
          }

          const direction = isDesc ? 'DESC' : 'ASC';
          const field = order.slice(0, -1 * (direction.length + 1));
          const orderFn = isDesc ? desc : asc;

          switch (field) {
            case 'ID':
              query = query.orderBy(orderFn(table.id));
              break;
            case 'CREATED_AT':
              query = query.orderBy(orderFn(table.created_at));
              break;
            case 'UPDATED_AT':
              query = query.orderBy(orderFn(table.updated_at));
              break;
            case 'CHECKPOINT':
              query = query.orderBy(orderFn(table.checkpoint));
              break;
            case 'KEY1':
              query = query.orderBy(orderFn(table.key1));
              break;
            case 'KEY2':
              query = query.orderBy(orderFn(table.key2));
              break;
            case 'VALUE':
              query = query.orderBy(orderFn(table.value));
              break;
            default:
              console.warn('Unknown orderBy field:', field);
          }
        });
      }

      if (jsonOrderBy && jsonOrderBy.length > 0) {
        jsonOrderBy.forEach(({ path, direction, type = 'STRING' }) => {
          const orderFn = direction === 'DESC' ? desc : asc;
          const jsonPath = `$.${path}`;

          let orderExpr;
          switch (type) {
            case 'INTEGER':
              orderExpr = sql`CAST(COALESCE(json_extract(${table.value}, ${jsonPath}), '0') AS INTEGER)`;
              break;
            case 'FLOAT':
              orderExpr = sql`CAST(COALESCE(json_extract(${table.value}, ${jsonPath}), '0') AS FLOAT)`;
              break;
            case 'BOOLEAN':
              orderExpr = sql`CAST(COALESCE(json_extract(${table.value}, ${jsonPath}), '0') AS BOOLEAN)`;
              break;
            default: // STRING
              orderExpr = sql`COALESCE(json_extract(${table.value}, ${jsonPath}), '')`;
          }

          query = query.orderBy(orderFn(orderExpr));
        });
      }

      return query;
    } catch (error) {
      console.warn('Error applying orderBy:', { orderBy, jsonOrderBy, error });
      return query.orderBy(desc(table.created_at));
    }
  };

  const getTotalCount = (database: any, table: any, conditions: any[] = []) => {
    let query = database.select({ count: sql<number>`count(*)` }).from(table);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = query.get();
    return result?.count ?? 0;
  };

  const resolvers = {
    JSON: {
      serialize: (value: any) => {
        if (value === null || value === undefined) {
          return null;
        }
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      },
      parseValue: (value: any) => {
        if (value === null || value === undefined) {
          return null;
        }
        return value;
      },
      parseLiteral: (ast: any) => {
        return parseLiteral(ast);
      }
    },
    Query: {
      transactions: async (
        _: unknown,
        {
          first = DEFAULT_PAGE_SIZE,
          after,
          sender,
          digest,
          checkpoint,
          packageId,
          module,
          functionName,
          orderBy,
          showEvent
        }: {
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
        }
      ) => {
        try {
          const limit = Math.min(first, PAGINATION_LIMIT);
          let query = database.select().from(dubheStoreTransactions);

          // Collect filter conditions
          const conditions = [];
          if (checkpoint) {
            conditions.push(eq(dubheStoreTransactions.checkpoint, checkpoint.toString()));
          }
          if (sender) {
            conditions.push(eq(dubheStoreTransactions.sender, sender));
          }
          if (digest) {
            conditions.push(eq(dubheStoreTransactions.digest, digest));
          }
          if (packageId) {
            conditions.push(eq(dubheStoreTransactions.package, packageId));
          }
          if (module) {
            conditions.push(eq(dubheStoreTransactions.module, module));
          }
          if (functionName && functionName.length > 0) {
            const functionNameValues = functionName.map((name) => `'${name}'`).join(',');
            const functionNameCondition = sql`${dubheStoreTransactions.function} IN (${sql.raw(functionNameValues)})`;
            conditions.push(functionNameCondition);
          }

          // Get total count (apply filter conditions)
          const totalCount = getTotalCount(database, dubheStoreTransactions, conditions);

          // Handle cursor (need to use with filter conditions AND)
          if (after) {
            const afterId = decodeCursor(after);
            if (!afterId) {
              throw new Error('Invalid cursor');
            }
            conditions.push(gt(dubheStoreTransactions.id, afterId));
          }

          // Apply all conditions at once
          if (conditions.length > 0) {
            query = query.where(and(...conditions));
          }

          // Apply sorting
          query = applyOrderBy(query, dubheStoreTransactions, orderBy);

          // Get paginated data
          const records = query.limit(limit + 1).all();
          const hasNextPage = records.length > limit;
          const edges = records.slice(0, limit).map((record: any) => {
            let node: any = record;

            if (showEvent) {
              const events = database
                .select()
                .from(dubheStoreEvents)
                .where(eq(dubheStoreEvents.digest, record.digest))
                .orderBy(desc(dubheStoreEvents.id))
                .all();

              node = {
                ...record,
                events: events.map((event) => ({
                  ...event,
                  value: event.value
                }))
              };
            }

            return {
              cursor: encodeCursor(record.id),
              node
            };
          });

          return {
            edges,
            pageInfo: {
              hasNextPage,
              endCursor: edges[edges.length - 1]?.cursor
            },
            totalCount
          };
        } catch (error) {
          console.error('Error in transactions resolver:', error);
          throw error;
        }
      },

      schemas: async (
        _: unknown,
        {
          first = DEFAULT_PAGE_SIZE,
          after,
          name,
          key1,
          key2,
          is_removed,
          last_update_checkpoint,
          last_update_digest,
          value,
          orderBy,
          jsonOrderBy
        }: {
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
          jsonOrderBy?: any[];
        }
      ) => {
        try {
          const limit = Math.min(first, PAGINATION_LIMIT);
          let query = database.select().from(dubheStoreSchemas);

          // Collect all filter conditions
          const conditions = [];

          // Apply all filters
          if (name) conditions.push(eq(dubheStoreSchemas.name, name));
          if (key1 !== undefined) {
            if (typeof key1 === 'string') {
              conditions.push(
                sql`(${dubheStoreSchemas.key1} = ${key1} OR 
									(json_valid(${dubheStoreSchemas.key1}) AND 
									 json_extract(${dubheStoreSchemas.key1}, '$') = ${key1}))`
              );
            } else if (key1 === null) {
              conditions.push(sql`${dubheStoreSchemas.key1} IS NULL`);
            } else if (typeof key1 === 'object') {
              const jsonKey1 = JSON.stringify(key1);
              conditions.push(sql`
								CASE 
									WHEN json_valid(${dubheStoreSchemas.key1})
									THEN json(${dubheStoreSchemas.key1}) = json(${jsonKey1})
									ELSE ${dubheStoreSchemas.key1} = ${jsonKey1}
								END
							`);
            }
          }
          if (key2 !== undefined) {
            if (typeof key2 === 'string') {
              conditions.push(
                sql`(${dubheStoreSchemas.key2} = ${key2} OR 
									(json_valid(${dubheStoreSchemas.key2}) AND 
									 json_extract(${dubheStoreSchemas.key2}, '$') = ${key2}))`
              );
            } else if (key2 === null) {
              conditions.push(sql`${dubheStoreSchemas.key2} IS NULL`);
            } else if (typeof key2 === 'object') {
              const jsonKey2 = JSON.stringify(key2);
              conditions.push(sql`
								CASE 
									WHEN json_valid(${dubheStoreSchemas.key2})
									THEN json(${dubheStoreSchemas.key2}) = json(${jsonKey2})
									ELSE ${dubheStoreSchemas.key2} = ${jsonKey2}
								END
							`);
            }
          }
          if (typeof is_removed === 'boolean')
            conditions.push(eq(dubheStoreSchemas.is_removed, is_removed));
          if (last_update_checkpoint)
            conditions.push(eq(dubheStoreSchemas.last_update_checkpoint, last_update_checkpoint));
          if (last_update_digest)
            conditions.push(eq(dubheStoreSchemas.last_update_digest, last_update_digest));
          if (value !== undefined) {
            if (typeof value === 'boolean') {
              conditions.push(sql`${dubheStoreSchemas.value} = ${value.toString()}`);
            } else if (value === null) {
              conditions.push(sql`${dubheStoreSchemas.value} IS NULL`);
            } else if (Array.isArray(value)) {
              const jsonValue = JSON.stringify(value);
              conditions.push(sql`
                CASE 
                  WHEN json_valid(${dubheStoreSchemas.value})
                  THEN (
                    CASE 
                      WHEN json_type(${dubheStoreSchemas.value}) = 'array'
                      THEN json(${dubheStoreSchemas.value}) = json(${jsonValue})
                      ELSE FALSE
                    END
                  )
                  ELSE FALSE 
                END
              `);
            } else if (typeof value === 'string') {
              conditions.push(
                sql`(${dubheStoreSchemas.value} = ${value} OR 
                  (json_valid(${dubheStoreSchemas.value}) AND 
                   json_extract(${dubheStoreSchemas.value}, '$') = ${value}))`
              );
            } else if (typeof value === 'number') {
              conditions.push(
                sql`(${dubheStoreSchemas.value} = ${value.toString()} OR 
                  (json_valid(${dubheStoreSchemas.value}) AND 
                   CAST(json_extract(${dubheStoreSchemas.value}, '$') AS NUMERIC) = ${value}))`
              );
            } else if (typeof value === 'object') {
              // Handle object type filtering, optimize parameter handling
              const jsonConditions = Object.entries(value).map(([key, val]) => {
                const jsonPath = `$.${key}`;
                if (typeof val === 'string') {
                  return sql`json_extract(${dubheStoreSchemas.value}, ${jsonPath}) = ${val}`;
                } else if (typeof val === 'number') {
                  return sql`CAST(json_extract(${dubheStoreSchemas.value}, ${jsonPath}) AS NUMERIC) = ${val}`;
                } else if (typeof val === 'boolean') {
                  return sql`json_extract(${dubheStoreSchemas.value}, ${jsonPath}) = ${val.toString()}`;
                } else if (val === null) {
                  return sql`json_extract(${dubheStoreSchemas.value}, ${jsonPath}) IS NULL`;
                } else if (Array.isArray(val) || typeof val === 'object') {
                  const jsonVal = JSON.stringify(val);
                  return sql`json_extract(${dubheStoreSchemas.value}, ${jsonPath}) = json(${jsonVal})`;
                }
                return sql`1=1`;
              });

              if (jsonConditions.length > 0) {
                // Combine all conditions with AND
                const combinedCondition = jsonConditions.reduce((acc, curr) =>
                  acc ? sql`${acc} AND ${curr}` : curr
                );
                conditions.push(combinedCondition);
              }
            }
          }

          // Get filtered total count
          const totalCount = getTotalCount(database, dubheStoreSchemas, conditions);

          // Handle cursor pagination (need to use with filter conditions AND)
          if (after) {
            const afterId = decodeCursor(after);
            if (!afterId) {
              throw new Error('Invalid cursor');
            }
            conditions.push(gt(dubheStoreSchemas.id, afterId));
          }

          // Apply all conditions
          if (conditions.length > 0) {
            query = query.where(and(...conditions));
          }

          // Apply sorting
          query = applyOrderBy(query, dubheStoreSchemas, orderBy, jsonOrderBy);

          // Get paginated data
          const records = query.limit(limit + 1).all();
          const hasNextPage = records.length > limit;
          const edges = records.slice(0, limit).map((record) => ({
            cursor: encodeCursor(record.id),
            node: {
              ...record,
              key1: record.key1,
              key2: record.key2,
              value: record.value
            }
          }));

          return {
            edges,
            pageInfo: {
              hasNextPage,
              endCursor: edges[edges.length - 1]?.cursor
            },
            totalCount
          };
        } catch (error) {
          console.error('Error in schemas resolver:', error);
          throw error;
        }
      },

      events: async (
        _: unknown,
        {
          first = DEFAULT_PAGE_SIZE,
          after,
          names,
          sender,
          digest,
          checkpoint,
          orderBy
        }: {
          first?: number;
          after?: string;
          names?: string[];
          sender?: string;
          digest?: string;
          checkpoint?: string;
          orderBy?: string[];
        }
      ) => {
        try {
          const limit = Math.min(first, PAGINATION_LIMIT);
          let query = database.select().from(dubheStoreEvents);

          // Collect filter conditions
          const conditions = [];
          if (names && names.length > 0) {
            const nameValues = names.map((name) => `'${name}'`).join(',');
            const nameCondition = sql`${dubheStoreEvents.name} IN (${sql.raw(nameValues)})`;
            conditions.push(nameCondition);
          }
          if (sender) {
            conditions.push(eq(dubheStoreEvents.sender, sender));
          }
          if (digest) {
            conditions.push(eq(dubheStoreEvents.digest, digest));
          }
          if (checkpoint) {
            conditions.push(eq(dubheStoreEvents.checkpoint, checkpoint.toString()));
          }

          // Get total count (apply filter conditions)
          const totalCount = getTotalCount(database, dubheStoreEvents, conditions);

          // Handle cursor (need to use with filter conditions AND)
          if (after) {
            const afterId = decodeCursor(after);
            if (!afterId) {
              throw new Error('Invalid cursor');
            }
            conditions.push(gt(dubheStoreEvents.id, afterId));
          }

          // Apply all conditions at once
          if (conditions.length > 0) {
            query = query.where(and(...conditions));
          }

          // Apply sorting
          query = applyOrderBy(query, dubheStoreEvents, orderBy);

          // Get paginated data
          const records = query.limit(limit + 1).all();
          const hasNextPage = records.length > limit;
          const edges = records.slice(0, limit).map((record) => ({
            cursor: encodeCursor(record.id),
            node: {
              ...record,
              value: record.value
            }
          }));

          return {
            edges,
            pageInfo: {
              hasNextPage,
              endCursor: edges[edges.length - 1]?.cursor
            },
            totalCount
          };
        } catch (error) {
          console.error('Error in events resolver:', error);
          throw error;
        }
      }
    }
  };

  return resolvers;
}

export function createSchema(
  database: BaseSQLiteDatabase<'sync', any>,
  defaultPageSize: number,
  paginationLimit: number
) {
  return makeExecutableSchema({
    typeDefs,
    resolvers: createResolvers(database, defaultPageSize, paginationLimit)
  });
}

function parseLiteral(ast: any): any {
  switch (ast.kind) {
    case 'ObjectValue':
      const obj: Record<string, any> = {};
      ast.fields.forEach((field: any) => {
        obj[field.name.value] = parseLiteral(field.value);
      });
      return obj;
    case 'ListValue':
      return ast.values.map((value: any) => parseLiteral(value));
    case 'IntValue':
      return parseInt(ast.value, 10);
    case 'FloatValue':
      return parseFloat(ast.value);
    case 'StringValue':
      return ast.value;
    case 'BooleanValue':
      return ast.value;
    case 'NullValue':
      return null;
    default:
      return ast.value;
  }
}
