import {
  createDubheGrpcClient,
  GrpcUtils,
  FilterOperator,
  SortDirection,
} from '../src';

// Basic configuration example
const config = {
  endpoint: '127.0.0.1:8080', // gRPC server address (proxy will route to backend)
  timeout: 10000, // 10 second timeout
  enableRetry: true, // Enable retry
  retryAttempts: 3, // Retry 3 times
};

// Create client instance
const client = createDubheGrpcClient(config);

async function example() {
  try {
    // 1. Connect to server
    await client.connect();
    console.log('✅ Connected successfully!');

    // // 2. Simple query with the new API
    // const tableName = 'your_table_name'; // Replace with your actual table name

    // // Basic query - get all data
    // const basicQuery = await client.query(tableName, {
    //   pageSize: 10,
    //   includeTotalCount: true,
    // });
    // console.log('🔍 Basic query result:', basicQuery);

    // // Query with field selection
    // const selectQuery = await client.query(tableName, {
    //   select: ['field1', 'field2', 'field3'],
    //   pageSize: 5,
    // });
    // console.log('🔍 Select query result:', selectQuery);

    // // Query with simple filtering
    // const filteredQuery = await client.query(tableName, {
    //   where: {
    //     field1: 'specific_value',
    //     field2: ['value1', 'value2'], // IN operator
    //     field3: { min: 10, max: 100 }, // BETWEEN operator
    //   },
    //   orderBy: [
    //     { field: 'created_at', direction: 'desc' },
    //     { field: 'id', direction: 'asc' },
    //   ],
    //   page: 1,
    //   pageSize: 20,
    //   includeTotalCount: true,
    // });
    // console.log('🔍 Filtered query result:', filteredQuery);

    // // Advanced query with custom operators
    // const advancedQuery = await client.queryTable({
    //   tableName,
    //   selectFields: ['id', 'name', 'created_at'],
    //   filters: [
    //     {
    //       fieldName: 'name',
    //       operator: FilterOperator.LIKE,
    //       value: { stringValue: '%test%' },
    //     },
    //     {
    //       fieldName: 'age',
    //       operator: FilterOperator.GREATER_THAN,
    //       value: { intValue: 18 },
    //     },
    //     {
    //       fieldName: 'status',
    //       operator: FilterOperator.IN,
    //       value: { stringList: { values: ['active', 'pending'] } },
    //     },
    //   ],
    //   sorts: [
    //     {
    //       fieldName: 'created_at',
    //       direction: SortDirection.DESCENDING,
    //       priority: 0,
    //     },
    //   ],
    //   pagination: {
    //     page: 1,
    //     pageSize: 10,
    //   },
    //   includeTotalCount: true,
    // });
    // console.log('🔍 Advanced query result:', advancedQuery);

    // // Using query builder for fluent API
    // const queryBuilder = client.createQueryBuilder();
    // const builtQuery = queryBuilder
    //   .tableName(tableName)
    //   .select('id', 'name', 'email')
    //   .where({
    //     status: 'active',
    //     role: ['admin', 'user'],
    //   })
    //   .orderBy('created_at', 'desc')
    //   .page(1, 15)
    //   .build();

    // const builderResult = await client.queryTable(builtQuery);
    // console.log('🔍 Query builder result:', builderResult);

    // 3. Subscribe to table updates (same as Rust test)
    const subscriptionId = client.subscribeTable(
      ['resource0', 'component0'], // Using same table names as Rust test
      {
        onUpdate: (change) => {
          console.log(`[gRPC] Table: ${change.table_id} | Data:`, change.data);

          // Use utility to work with the data
          const fieldValue = GrpcUtils.extractField(change.data, 'fieldName');
          if (fieldValue !== undefined) {
            console.log('Extracted field value:', fieldValue);
          }
        },
        onError: (error) => {
          console.error('❌ gRPC stream error:', error);
          // Handle stream error gracefully - subscription will be cleaned up automatically
        },
        onConnect: () => {
          console.log('📡 gRPC subscription connected');
        },
        onDisconnect: () => {
          console.log('❌ gRPC subscription closed');
        },
      }
    );

    console.log(`📡 Subscription ID: ${subscriptionId}`);

    // // 4. Demonstrate pagination
    // console.log('📄 Pagination example:');
    // let currentPage = 1;
    // const pageSize = 5;

    // do {
    //   const pageResult = await client.query(tableName, {
    //     page: currentPage,
    //     pageSize,
    //     includeTotalCount: true,
    //   });

    //   console.log(
    //     `Page ${currentPage}/${pageResult.pagination?.totalPages || 1}`
    //   );
    //   console.log(`Items: ${pageResult.rows.length}`);
    //   console.log(`Total items: ${pageResult.pagination?.totalItems || 0}`);

    //   if (!pageResult.pagination?.hasNextPage) {
    //     break;
    //   }
    //   currentPage++;
    // } while (currentPage <= 3); // Limit to first 3 pages for demo

    // // 5. Filter demonstration
    // console.log('🔍 Filter demonstration:');
    // const allRows = await client.query(tableName);
    // const filteredRows = GrpcUtils.filterRows(allRows.rows, {
    //   status: 'active',
    // });
    // console.log(
    //   `Filtered ${filteredRows.length} rows from ${allRows.rows.length} total`
    // );

    // Setup graceful shutdown handling (similar to Rust test with Ctrl+C handling)
    const shutdownHandler = () => {
      console.log('\n🛑 Received shutdown signal, cleaning up...');

      // Cancel subscription
      client.unsubscribe(subscriptionId);
      console.log('🛑 Subscription cancelled');

      // Show active subscriptions
      const activeSubscriptions = client.getActiveSubscriptions();
      console.log('📡 Active subscriptions:', activeSubscriptions);

      // Disconnect
      client.disconnect();
      console.log('👋 Disconnected');

      process.exit(0);
    };

    // Handle Ctrl+C gracefully (like Rust test)
    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);

    // // Auto stop after 30 seconds for demo purposes
    // setTimeout(() => {
    //   console.log('\n⏰ Demo timeout reached, shutting down...');
    //   shutdownHandler();
    // }, 30000);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Example of handling different data types in filters
async function _filterExamples() {
  try {
    await client.connect();
    const tableName = 'example_table';

    // String filters
    await client.query(tableName, {
      where: {
        name: 'John Doe', // EQUALS
        description: { operator: FilterOperator.LIKE, value: '%keyword%' },
      },
    });

    // Number filters
    await client.query(tableName, {
      where: {
        age: { min: 18, max: 65 }, // BETWEEN
        score: { operator: FilterOperator.GREATER_THAN, value: 80 },
      },
    });

    // Array filters (IN operator)
    await client.query(tableName, {
      where: {
        category: ['electronics', 'books', 'clothing'],
        priority: [1, 2, 3],
      },
    });

    // Null checks
    await client.query(tableName, {
      where: {
        deletedAt: null, // IS NULL
        email: { operator: FilterOperator.IS_NOT_NULL, value: true },
      },
    });
  } catch (error) {
    console.error('❌ Filter examples error:', error);
  }
}

// Example of complex query construction
async function _complexQueryExample() {
  try {
    await client.connect();

    const complexResult = await client.queryTable({
      tableName: 'users',
      selectFields: ['id', 'username', 'email', 'created_at', 'last_login'],
      filters: [
        {
          fieldName: 'username',
          operator: FilterOperator.NOT_LIKE,
          value: { stringValue: 'test_%' },
        },
        {
          fieldName: 'created_at',
          operator: FilterOperator.BETWEEN,
          value: {
            range: {
              start: '2024-01-01',
              end: '2024-12-31',
            },
          },
        },
        {
          fieldName: 'role',
          operator: FilterOperator.NOT_IN,
          value: { stringList: { values: ['banned', 'suspended'] } },
        },
      ],
      sorts: [
        {
          fieldName: 'last_login',
          direction: SortDirection.DESCENDING,
          priority: 0,
        },
        {
          fieldName: 'username',
          direction: SortDirection.ASCENDING,
          priority: 1,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 50,
      },
      includeTotalCount: true,
    });

    console.log('🎯 Complex query result:', complexResult);
  } catch (error) {
    console.error('❌ Complex query error:', error);
  }
}

// Rust-style subscription test (mirrors the Rust test logic)
async function _rustStyleSubscriptionTest() {
  try {
    // Create client (similar to Rust test)
    const client = createDubheGrpcClient({
      endpoint: 'http://localhost:8080', // Using the same endpoint as Rust test
      timeout: 10000,
      enableRetry: true,
      retryAttempts: 3,
    });

    // Connect to server
    await client.connect();
    console.log('✅ Connected to gRPC server successfully!');

    // Subscribe to tables (using same table names as Rust test)
    const subscriptionId = client.subscribeTable(['resource0', 'component0'], {
      onUpdate: (change) => {
        // Mirror the Rust test output format
        console.log(`[gRPC] Table: ${change.table_id} | Data:`, change.data);
      },
      onError: (error) => {
        console.log('❌ gRPC stream error:', error.message);
        // In Rust test, this would break the loop
      },
      onConnect: () => {
        console.log('📡 gRPC subscription established');
      },
      onDisconnect: () => {
        console.log('❌ gRPC subscription closed');
      },
    });

    console.log(`📡 Subscription ID: ${subscriptionId}`);

    // Setup Ctrl+C handler (like Rust test)
    const shutdownHandler = () => {
      console.log('\n🛑 Received Ctrl+C, shutting down gRPC client...');
      client.unsubscribe(subscriptionId);
      client.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);

    // Keep running until interrupted (like the Rust test loop)
    console.log('🔄 Listening for table changes... Press Ctrl+C to stop');

    // Keep the process alive
    await new Promise(() => {}); // This will run indefinitely until interrupted
  } catch (error) {
    console.error('❌ Error in Rust-style subscription test:', error);
  }
}

// Run examples
example();

// Uncomment to run the Rust-style subscription test
// rustStyleSubscriptionTest();

// Uncomment to run additional examples
// filterExamples();
// complexQueryExample();
