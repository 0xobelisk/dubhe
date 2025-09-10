import { gql } from '@apollo/client';
import { createDubheGraphqlClient, DubheGraphqlClient } from '../src/client';
import { DubheClientConfig } from '../src/types';

/**
 * Create basic client
 */
export function createExampleClient(): DubheGraphqlClient {
  const config: DubheClientConfig = {
    endpoint: 'http://localhost:4000/graphql',
    subscriptionEndpoint: 'ws://localhost:4000/graphql',
    headers: {
      Authorization: 'Bearer your-token-here'
    }
  };

  return createDubheGraphqlClient(config);
}

/**
 * Create client with retry functionality
 */
export function createClientWithRetry(): DubheGraphqlClient {
  const config: DubheClientConfig = {
    endpoint: 'http://localhost:4000/graphql',
    subscriptionEndpoint: 'ws://localhost:4000/graphql',
    retryOptions: {
      delay: {
        initial: 500,
        max: 10000,
        jitter: true
      },
      attempts: {
        max: 3,
        retryIf: (error) => {
          return Boolean(
            error &&
              (error.networkError ||
                (error.graphQLErrors && error.graphQLErrors.length === 0) ||
                error.networkError?.statusCode >= 500)
          );
        }
      }
    }
  };

  return createDubheGraphqlClient(config);
}

/**
 * Basic query examples
 */
export async function exampleBasicQuery() {
  const client = createExampleClient();

  try {
    // Query encounters table
    const encounters = await client.getAllTables('encounters', {
      first: 5,
      filter: {
        exists: { equalTo: true }
      },
      orderBy: [{ field: 'createdAt', direction: 'DESC' }]
    });
    console.log('Encounters:', encounters.edges.length, 'records');

    // Query accounts table
    const accounts = await client.getAllTables('accounts', {
      first: 5,
      filter: {
        balance: { greaterThan: '0' }
      }
    });
    console.log('Accounts:', accounts.edges.length, 'records');

    // Conditional query for single record
    const specificAccount = await client.getTableByCondition('account', {
      assetId: '0x123...',
      account: '0xabc...'
    });
    console.log('Conditional query:', specificAccount ? 'Record found' : 'Record not found');
  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    client.close();
  }
}

/**
 * Real-time subscription examples
 */
export function exampleSubscription() {
  const client = createExampleClient();

  // Basic subscription
  const basicSubscription = client.subscribeToTableChanges('encounters', {
    initialEvent: true,
    fields: ['player', 'monster', 'catchAttempts', 'createdAt'],
    onData: (data) => {
      console.log('Real-time data:', data.listen.query.encounters);
    },
    onError: (error) => {
      console.error('Subscription error:', error);
    }
  });

  // Filtered subscription
  const filteredSubscription = client.subscribeToTableChanges('accounts', {
    filter: { balance: { greaterThan: '1000' } },
    initialEvent: true,
    fields: ['assetId', 'account', 'balance', 'updatedAt'],
    orderBy: [{ field: 'balance', direction: 'DESC' }],
    first: 5,
    onData: (data) => {
      console.log('High balance account updates:', data.listen.query.accounts);
    }
  });

  const subscriptions = [basicSubscription.subscribe({}), filteredSubscription.subscribe({})];

  // Cancel subscriptions after 10 seconds
  setTimeout(() => {
    subscriptions.forEach((sub) => sub.unsubscribe());
    client.close();
  }, 10000);
}

/**
 * Batch query examples
 */
export async function exampleBatchQuery() {
  const client = createExampleClient();

  try {
    const results = await client.batchQuery([
      {
        key: 'encounters',
        tableName: 'encounters',
        params: {
          first: 5,
          fields: ['player', 'monster', 'catchAttempts', 'updatedAt']
        }
      },
      {
        key: 'accounts',
        tableName: 'accounts',
        params: {
          first: 5,
          fields: ['account', 'assetId', 'balance', 'updatedAt'],
          filter: { balance: { greaterThan: '0' } }
        }
      }
    ]);

    console.log('Batch query results:');
    console.log(`Encounters: ${results.encounters.edges.length} records`);
    console.log(`Accounts: ${results.accounts.edges.length} records`);
  } catch (error) {
    console.error('Batch query failed:', error);
  } finally {
    client.close();
  }
}

/**
 * Multi-table subscription examples
 */
export function exampleMultiTableSubscription() {
  const client = createExampleClient();

  const multiTableSub = client.subscribeToMultipleTables(
    [
      {
        tableName: 'encounters',
        options: {
          initialEvent: true,
          fields: ['player', 'monster', 'catchAttempts'],
          first: 5
        }
      },
      {
        tableName: 'accounts',
        options: {
          initialEvent: true,
          fields: ['account', 'balance'],
          filter: { balance: { greaterThan: '0' } },
          first: 3
        }
      }
    ],
    {
      onData: (allData) => {
        console.log('Multi-table subscription data:', {
          encounters: allData.encounters?.listen.query.encounters,
          accounts: allData.accounts?.listen.query.accounts
        });
      },
      onError: (error) => {
        console.error('Multi-table subscription error:', error);
      }
    }
  );

  const subscription = multiTableSub.subscribe({});

  // Cancel subscription after 30 seconds
  setTimeout(() => {
    subscription.unsubscribe();
    client.close();
  }, 30000);
}

/**
 * Custom GraphQL query examples
 */
export async function exampleCustomQuery() {
  const client = createExampleClient();

  const CUSTOM_QUERY = gql`
    query GetPlayerEncounters($player: String!) {
      encounters(filter: { player: { equalTo: $player } }) {
        edges {
          node {
            entityId
            player
            monster
            catchAttempts
            exists
          }
        }
        totalCount
      }
    }
  `;

  try {
    const result = await client.query(CUSTOM_QUERY, {
      player: '0x123...'
    });

    console.log('Custom query result:', result.data);
  } catch (error) {
    console.error('Custom query failed:', error);
  } finally {
    client.close();
  }
}

/**
 * Cache configuration examples
 */
export function createClientWithCache(): DubheGraphqlClient {
  return createDubheGraphqlClient({
    endpoint: 'http://localhost:4000/graphql',
    subscriptionEndpoint: 'ws://localhost:4000/graphql',
    cacheConfig: {
      paginatedTables: ['accounts', 'encounters'],
      customMergeStrategies: {
        accounts: {
          keyArgs: ['filter'],
          merge: (existing, incoming) => {
            if (!incoming || !Array.isArray(incoming.edges)) {
              return existing;
            }
            return {
              ...incoming,
              edges: [...(existing?.edges || []), ...incoming.edges]
            };
          }
        }
      }
    }
  });
}
