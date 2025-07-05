import { gql } from '@apollo/client';
import { createDubheGraphqlClient, DubheGraphqlClient } from '../src';
import { dubheConfig } from '../dubhe.config';

const CONFIG = {
  endpoint: 'http://localhost:4000/graphql',
  // Only set subscription endpoint when WebSocket is supported
  subscriptionEndpoint: 'ws://localhost:4000/graphql',
  headers: {
    'Content-Type': 'application/json',
  },
  dubheConfig,
};

class GraphQLTester {
  private client: DubheGraphqlClient;
  private activeSubscriptions: any[] = []; // Save active subscriptions

  constructor() {
    console.log('🚀 Initializing GraphQL client...');

    this.client = createDubheGraphqlClient(CONFIG);
  }

  // Test using client subscription methods (only runs when WebSocket is supported)
  async testClientSubscription() {
    console.log('\n🔔 === Testing Client Subscription Methods ===');

    console.log('Using subscribeToTableChanges method to subscribe...');

    try {
      // Call subscribe() directly to start subscription, callbacks are already handled in options
      const subscription = this.client.subscribeToTableChanges('counter1', {
        onData: (data: any) => {
          console.log(
            '✅ Received subscription data:',
            JSON.stringify(data, null, 2)
          );
        },
        onError: (error: any) => {
          console.error('❌ Subscription error:', error);
        },
        onComplete: () => {
          console.log('✅ Subscription completed');
        },
      });
      // .subscribe({}); // Pass empty object to satisfy linter requirements

      const sub = subscription.subscribe({});
      // Save subscription reference
      this.activeSubscriptions.push(sub);

      console.log(
        '🎯 Subscription started successfully! Waiting for data updates...'
      );
      console.log(
        '💡 Tip: You can modify the database in another terminal to trigger subscription events'
      );

      return sub;
    } catch (error) {
      console.error('❌ Client subscription startup failed:', error);
    }
  }

  // Clean up all subscriptions
  cleanup() {
    console.log('🧹 Cleaning up all subscriptions...');
    this.activeSubscriptions.forEach((sub) => {
      try {
        sub.unsubscribe();
      } catch (error) {
        console.error('Error cleaning up subscription:', error);
      }
    });
    this.activeSubscriptions = [];
    this.client.close();
  }
}

// Main function
async function main() {
  console.log('🔍 Checking runtime environment...');
  console.log(
    `📍 Node.js environment: ${typeof window === 'undefined' ? 'Yes' : 'No'}`
  );

  const tester = new GraphQLTester();

  // Start subscription test
  await tester.testClientSubscription();

  // Keep program running so subscriptions can receive data
  console.log('\n⏰ Program will keep running to receive subscription data...');
  console.log('🔄 Press Ctrl+C to exit program');

  // Set timer to output status periodically to keep program active
  const statusInterval = setInterval(() => {
    console.log(
      `⚡ Subscription status check - ${new Date().toLocaleTimeString()}`
    );
  }, 30000); // Output status every 30 seconds

  // Graceful shutdown handling
  const gracefulShutdown = () => {
    console.log('\n👋 Received exit signal, cleaning up resources...');
    clearInterval(statusInterval);
    tester.cleanup();
    console.log('✅ Cleanup completed, program exiting');
    process.exit(0);
  };

  // Listen for exit signals
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise rejection:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n👋 Received interrupt signal, exiting...');
  process.exit(0);
});

// Run test
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Main function execution failed:', error);
    process.exit(1);
  });
}

export { GraphQLTester, main };
