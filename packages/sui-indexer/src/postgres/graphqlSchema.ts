import { makeExecutableSchema } from '@graphql-tools/schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
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
  database: PostgresJsDatabase<Record<string, unknown>>,
  defaultPageSize: number,
  paginationLimit: number
) {
  const DEFAULT_PAGE_SIZE = defaultPageSize;
  const PAGINATION_LIMIT = paginationLimit;

  const encodeCursor = (id: number) => Buffer.from(id.toString()).toString('base64');

  const decodeCursor = (cursor: string) => parseInt(Buffer.from(cursor, 'base64').toString());

  // // Define a type interface with orderBy method
  // interface WithOrderBy {
  //   orderBy: (...args: any[]) => any;
  // }

  const applyOrderBy = (query: any, table: any, orderBy?: string[], jsonOrderBy?: any[]): any => {
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

          let orderExpr;
          switch (type) {
            case 'INTEGER':
              // Equivalent to json_extract in SQLite for PostgreSQL
              orderExpr = sql`CAST(COALESCE((CAST(${table.value} AS jsonb) ->> ${path}::text)::text, '0') AS INTEGER)`;
              break;
            case 'FLOAT':
              orderExpr = sql`CAST(COALESCE((CAST(${table.value} AS jsonb) ->> ${path}::text)::text, '0') AS FLOAT)`;
              break;
            case 'BOOLEAN':
              orderExpr = sql`CAST(COALESCE((CAST(${table.value} AS jsonb) ->> ${path}::text)::text, 'false') AS BOOLEAN)`;
              break;
            default: // STRING
              orderExpr = sql`COALESCE((CAST(${table.value} AS jsonb) ->> ${path}::text)::text, '')`;
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

  const getTotalCount = async (database: any, table: any, conditions: any[] = []) => {
    let query = database.select({ count: sql<number>`count(*)` }).from(table);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query.execute();
    return result?.length > 0 ? Number(result[0].count) : 0;
  };

  const resolvers = {
    JSON: {
      serialize: (value: any) => {
        if (value === null || value === undefined) {
          return null;
        }

        // Handle JSON potentially stored as a string
        if (typeof value === 'string') {
          try {
            // Attempt to parse JSON string
            return JSON.parse(value);
          } catch {
            // If parsing fails, return the original string
            return value;
          }
        }

        // Directly return non-string values
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
          const totalCount = await getTotalCount(database, dubheStoreTransactions, conditions);

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
            query = query.where(and(...conditions)) as any;
          }

          // Apply sorting
          query = applyOrderBy(query, dubheStoreTransactions, orderBy);

          // Get paginated data
          const records = await query.limit(limit + 1).execute();
          const hasNextPage = records.length > limit;

          const edges = [];
          for (const record of records.slice(0, limit)) {
            let node: any = record;

            if (showEvent) {
              const events = await database
                .select()
                .from(dubheStoreEvents)
                .where(eq(dubheStoreEvents.digest, record.digest))
                .orderBy(desc(dubheStoreEvents.id))
                .execute();

              node = {
                ...record,
                events: events.map((event) => {
                  // Safely handle the value field
                  let safeValue = event.value;
                  try {
                    // If it's a string and possibly JSON, attempt to parse
                    if (
                      typeof safeValue === 'string' &&
                      (safeValue.startsWith('{') || safeValue.startsWith('['))
                    ) {
                      safeValue = JSON.parse(safeValue);
                    }
                  } catch (e) {
                    // If parsing fails, keep the original
                    console.warn('Failed to parse event value as JSON:', e);
                  }

                  return {
                    ...event,
                    value: safeValue
                  };
                })
              };
            }

            edges.push({
              cursor: encodeCursor(record.id),
              node
            });
          }

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
                sql`(${dubheStoreSchemas.key1} = ${key1}::text OR 
                    ${dubheStoreSchemas.key1} = concat('"', ${key1}::text, '"')::text)`
              );
            } else if (key1 === null) {
              conditions.push(sql`${dubheStoreSchemas.key1} IS NULL`);
            } else if (typeof key1 === 'number') {
              const numberAsString = key1.toString();
              conditions.push(sql`${dubheStoreSchemas.key1} = ${numberAsString}::text`);
            } else if (typeof key1 === 'boolean') {
              const boolAsString = key1.toString();
              conditions.push(sql`${dubheStoreSchemas.key1} = ${boolAsString}::text`);
            } else if (typeof key1 === 'object') {
              const jsonKey1 = JSON.stringify(key1);
              conditions.push(sql`${dubheStoreSchemas.key1} = ${jsonKey1}::text`);
            }
          }
          if (key2 !== undefined) {
            if (typeof key2 === 'string') {
              conditions.push(
                sql`(${dubheStoreSchemas.key2} = ${key2}::text OR 
                    ${dubheStoreSchemas.key2} = concat('"', ${key2}::text, '"')::text)`
              );
            } else if (key2 === null) {
              conditions.push(sql`${dubheStoreSchemas.key2} IS NULL`);
            } else if (typeof key2 === 'number') {
              const numberAsString = key2.toString();
              conditions.push(sql`${dubheStoreSchemas.key2} = ${numberAsString}::text`);
            } else if (typeof key2 === 'boolean') {
              const boolAsString = key2.toString();
              conditions.push(sql`${dubheStoreSchemas.key2} = ${boolAsString}::text`);
            } else if (typeof key2 === 'object') {
              const jsonKey2 = JSON.stringify(key2);
              conditions.push(sql`${dubheStoreSchemas.key2} = ${jsonKey2}::text`);
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
              conditions.push(sql`${dubheStoreSchemas.value} = ${value.toString()}::text`);
            } else if (value === null) {
              conditions.push(sql`${dubheStoreSchemas.value} IS NULL`);
            } else if (Array.isArray(value)) {
              const jsonValue = JSON.stringify(value);
              // Array type matching, ensuring type safety
              conditions.push(sql`
                CASE 
                  WHEN jsonb_typeof(CAST(${dubheStoreSchemas.value} AS jsonb)) = 'array'
                  THEN CAST(${dubheStoreSchemas.value} AS jsonb) = ${jsonValue}::jsonb
                  ELSE false
                END
              `);
            } else if (typeof value === 'string') {
              conditions.push(
                sql`(${dubheStoreSchemas.value} = ${value}::text OR 
                   (jsonb_typeof(CAST(${dubheStoreSchemas.value} AS jsonb)) IS NOT NULL AND 
                    (CAST(${dubheStoreSchemas.value} AS jsonb) ->> '$')::text = ${value}::text))`
              );
            } else if (typeof value === 'number') {
              const numberAsString = value.toString();
              conditions.push(
                sql`(${dubheStoreSchemas.value} = ${numberAsString}::text OR 
                   (jsonb_typeof(CAST(${dubheStoreSchemas.value} AS jsonb)) IS NOT NULL AND 
                    ((CAST(${dubheStoreSchemas.value} AS jsonb) ->> '$')::numeric = ${value}::numeric)))`
              );
            } else if (typeof value === 'object') {
              // Handle object type, support partial field queries, consistent with SQLite version
              const jsonConditions = Object.entries(value).map(([key, val]) => {
                if (val === null) {
                  return sql`(CAST(${dubheStoreSchemas.value} AS jsonb) -> ${key}::text) IS NULL`;
                } else if (typeof val === 'string') {
                  return sql`(CAST(${dubheStoreSchemas.value} AS jsonb) ->> ${key}::text) = ${val}::text`;
                } else if (typeof val === 'number') {
                  return sql`((CAST(${dubheStoreSchemas.value} AS jsonb) ->> ${key}::text)::numeric) = ${val}::numeric`;
                } else if (typeof val === 'boolean') {
                  return sql`((CAST(${dubheStoreSchemas.value} AS jsonb) ->> ${key}::text)::boolean) = ${val}::boolean`;
                } else if (Array.isArray(val) || typeof val === 'object') {
                  const jsonVal = JSON.stringify(val);
                  return sql`(CAST(${dubheStoreSchemas.value} AS jsonb) -> ${key}::text) = ${jsonVal}::jsonb`;
                }
                return sql`true`;
              });

              if (jsonConditions.length > 0) {
                // Combine all conditions, use AND consistent with SQLite version
                const combinedCondition = jsonConditions.reduce((acc, curr) =>
                  acc ? sql`${acc} AND ${curr}` : curr
                );

                // Ensure the value is a valid JSON object
                conditions.push(sql`
                  jsonb_typeof(CAST(${dubheStoreSchemas.value} AS jsonb)) = 'object' AND (${combinedCondition})
                `);
              }
            }
          }

          // Get filtered total count
          const totalCount = await getTotalCount(database, dubheStoreSchemas, conditions);

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
            query = query.where(and(...conditions)) as any;
          }

          // Apply sorting
          query = applyOrderBy(query, dubheStoreSchemas, orderBy, jsonOrderBy);

          // Get paginated data
          const records = await query.limit(limit + 1).execute();
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
          const totalCount = await getTotalCount(database, dubheStoreEvents, conditions);

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
            query = query.where(and(...conditions)) as any;
          }

          // Apply sorting
          query = applyOrderBy(query, dubheStoreEvents, orderBy);

          // Get paginated data
          const records = await query.limit(limit + 1).execute();
          const hasNextPage = records.length > limit;
          const edges = records.slice(0, limit).map((record) => {
            // Handle the value field, attempt to parse JSON
            let eventValue = record.value;
            try {
              if (
                typeof eventValue === 'string' &&
                (eventValue.startsWith('{') || eventValue.startsWith('['))
              ) {
                eventValue = JSON.parse(eventValue);
              }
            } catch (e) {
              console.warn('Failed to parse event value:', e);
            }

            return {
              cursor: encodeCursor(record.id),
              node: {
                ...record,
                value: eventValue
              }
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
          console.error('Error in events resolver:', error);
          throw error;
        }
      }
    }
  };

  return resolvers;
}

export function createSchema(
  database: PostgresJsDatabase<Record<string, unknown>>,
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
