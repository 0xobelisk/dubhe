import React, { useState, useEffect } from 'react';
import { useContract, useDubheContract, useDubheGraphQL, useDubheECS } from '@0xobelisk/react/sui';
import { Transaction } from '@0xobelisk/sui-client';

// Import mock metadata from the React package
import metadata from '@0xobelisk/react/sui/contracts/metadata.json';
import dubheMetadata from '@0xobelisk/react/sui/contracts/dubhe.config.json';

/**
 * Test Application for Dubhe React Auto-Initialization
 *
 * This application demonstrates the new simplified pattern with:
 * - Automatic instance creation using React useMemo
 * - Configuration-driven setup with environment variables
 * - No manual connection management
 * - Direct instance access without connection state
 */

// Mock configuration for testing
const TEST_CONFIG = {
  network: 'devnet' as const,
  packageId:
    process.env.NEXT_PUBLIC_PACKAGE_ID ||
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  metadata: metadata as any,
  dubheMetadata,
  credentials: {
    // secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
  },
  endpoints: {
    graphql: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
    websocket: process.env.NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT || 'ws://localhost:4000/graphql'
  },
  options: {
    enableBatchOptimization: true,
    cacheTimeout: 3000,
    debounceMs: 100,
    reconnectOnError: true
  }
};
console.log(process.env.NEXT_PUBLIC_PRIVATE_KEY);
console.log(TEST_CONFIG);

function App() {
  const [testMode, setTestMode] = useState<'basic' | 'individual'>('basic');

  return (
    <div className="App">
      <header>
        <h1>🚀 Dubhe React Auto-Initialization Test</h1>
        <p>Testing the new simplified auto-initialization pattern</p>

        <div className="button-group">
          <button
            onClick={() => setTestMode('basic')}
            style={{ backgroundColor: testMode === 'basic' ? '#646cff' : '#1a1a1a' }}
          >
            Basic Usage
          </button>
          <button
            onClick={() => setTestMode('individual')}
            style={{ backgroundColor: testMode === 'individual' ? '#646cff' : '#1a1a1a' }}
          >
            Individual Hooks
          </button>
        </div>
      </header>

      <main>
        {testMode === 'basic' && <BasicUsageExample />}
        {testMode === 'individual' && <IndividualHooksExample />}

        <MigrationExample />
      </main>
    </div>
  );
}

/**
 * Basic Usage Example - Using explicit configuration
 */
function BasicUsageExample() {
  const { contract, graphqlClient, ecsWorld, address, network, packageId } =
    useContract(TEST_CONFIG);

  return (
    <div className="test-section">
      <h2>Basic Usage - Explicit Configuration</h2>
      <p>This example shows direct configuration passing to useContract().</p>

      <div className="info-grid">
        <div className="info-card">
          <h3>Connection Info</h3>
          <p>
            <strong>Network:</strong> {network}
          </p>
          <p>
            <strong>Package ID:</strong> {packageId?.slice(0, 8)}...{packageId?.slice(-6)}
          </p>
          <p>
            <strong>Address:</strong> {address?.slice(0, 8)}...{address?.slice(-6)}
          </p>
        </div>

        <div className="info-card">
          <h3>Available Features</h3>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <span>📝 Contract: {contract ? '✅' : '❌'}</span>
            <span>🔗 GraphQL: {graphqlClient ? '✅' : '❌'}</span>
            <span>🌍 ECS: {ecsWorld ? '✅' : '❌'}</span>
          </div>
        </div>
      </div>

      <ContractInteractionExample contract={contract} />
      <GraphQLExample graphqlClient={graphqlClient} />
      <ECSExample ecsWorld={ecsWorld} />
    </div>
  );
}


/**
 * Individual Hooks Example - Using specific instance hooks
 */
function IndividualHooksExample() {
  // Individual hooks for granular access
  const contract = useDubheContract(TEST_CONFIG);
  const graphqlClient = useDubheGraphQL(TEST_CONFIG);
  const ecsWorld = useDubheECS(TEST_CONFIG);

  return (
    <div className="test-section">
      <h2>Individual Hooks - Granular Access</h2>
      <p>This example shows using individual hooks for specific features.</p>

      <div className="info-grid">
        <div className="info-card">
          <h3>📝 Contract Hook</h3>
          <p>
            <strong>Status:</strong> {contract ? '✅ Available' : '❌ Unavailable'}
          </p>
          <p>
            <strong>Address:</strong> {contract?.getAddress()?.slice(0, 8)}...
            {contract?.getAddress()?.slice(-6)}
          </p>
        </div>

        <div className="info-card">
          <h3>🔗 GraphQL Hook</h3>
          <p>
            <strong>Status:</strong> {graphqlClient ? '✅ Available' : '❌ Unavailable'}
          </p>
          <p>
            <strong>Note:</strong> Requires dubheMetadata configuration
          </p>
        </div>

        <div className="info-card">
          <h3>🌍 ECS Hook</h3>
          <p>
            <strong>Status:</strong> {ecsWorld ? '✅ Available' : '❌ Unavailable'}
          </p>
          <p>
            <strong>Note:</strong> Requires GraphQL client
          </p>
        </div>
      </div>

      <div className="info-card">
        <h3>Code Example</h3>
        <pre
          style={{
            backgroundColor: '#1a1a1a',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto'
          }}
        >
          {`// Individual hook usage
const contract = useDubheContract(config);
const graphql = useDubheGraphQL(config);
const ecs = useDubheECS(config);

// Use specific instances
await contract.tx.my_system.my_method({ tx });
const data = await graphql.query({ ... });
const component = await ecs.getComponent('MyComponent');`}
        </pre>
      </div>
    </div>
  );
}

/**
 * Contract Interaction Example
 */
function ContractInteractionExample({ contract }: { contract: any }) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const queryCount = async () => {
    if (!contract) return;

    setLoading(true);
    try {
      // Example query - replace with actual contract method
      const result = await contract.query.counter_system?.get?.({ params: [] });
      setCount(result?.[0]?.value || 0);
    } catch (error) {
      console.error('Query failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementCount = async () => {
    if (!contract) return;

    setLoading(true);
    try {
      const tx = new Transaction();
      // Example transaction - replace with actual contract method
      const result = await contract.tx.counter_system.inc({ tx, params: [] });
      console.log('✅ Transaction successful:', result);
      await queryCount();
    } catch (error) {
      console.error('❌ Transaction failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!contract) {
    return (
      <div className="test-section">
        <h2>📝 Contract Interaction</h2>
        <div className="status-indicator status-disconnected">❌ Contract instance unavailable</div>
      </div>
    );
  }

  return (
    <div className="test-section">
      <h2>📝 Contract Interaction</h2>

      <div className="info-card">
        <h3>Counter Example</h3>
        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Count: {count}</p>
      </div>

      <div className="button-group">
        <button onClick={queryCount} disabled={loading}>
          {loading ? 'Querying...' : 'Query Count'}
        </button>
        <button onClick={incrementCount} disabled={loading}>
          {loading ? 'Executing...' : 'Increment Count'}
        </button>
      </div>
    </div>
  );
}

/**
 * GraphQL Example
 */
function GraphQLExample({ graphqlClient }: { graphqlClient: any }) {
  return (
    <div className="test-section">
      <h2>🔗 GraphQL Integration</h2>

      {graphqlClient ? (
        <div>
          <div className="status-indicator status-connected">✅ GraphQL client is ready</div>
          <div className="info-card">
            <h3>Client Features</h3>
            <p>✅ Real-time queries and subscriptions</p>
            <p>✅ Automatic batching and optimization</p>
            <p>✅ Type-safe GraphQL operations</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="status-indicator status-disconnected">❌ GraphQL client unavailable</div>
          <div className="info-card">
            <h3>Requirements</h3>
            <p>GraphQL client requires dubheMetadata configuration in the useContract() config.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ECS Example
 */
function ECSExample({ ecsWorld }: { ecsWorld: any }) {
  return (
    <div className="test-section">
      <h2>🌍 ECS World Integration</h2>

      {ecsWorld ? (
        <div>
          <div className="status-indicator status-connected">✅ ECS World is ready</div>
          <div className="info-card">
            <h3>ECS Features</h3>
            <p>✅ Entity-Component-System architecture</p>
            <p>✅ Real-time component updates</p>
            <p>✅ Efficient query and subscription system</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="status-indicator status-disconnected">❌ ECS World unavailable</div>
          <div className="info-card">
            <h3>Requirements</h3>
            <p>ECS World requires both dubheMetadata configuration and GraphQL client.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Migration Example - Showing old vs new patterns
 */
function MigrationExample() {
  return (
    <div className="test-section">
      <h2>📚 Migration Guide</h2>
      <p>Comparison between old store-based and new auto-initialization patterns.</p>

      <div className="info-grid">
        <div className="info-card">
          <h3>❌ Old Pattern (Store-based)</h3>
          <pre
            style={{
              backgroundColor: '#1a1a1a',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.8rem'
            }}
          >
            {`// Old way - manual connection management
function App() {
  const { connect, disconnect, isConnected } = useDubheConnection();
  const contract = useDubheContract();
  
  useEffect(() => {
    connect({
      network: 'devnet',
      packageId: '0x...',
      metadata: metadata
    });
  }, []);

  if (!isConnected) return <div>Connecting...</div>;
  return <MyApp contract={contract} />;
}`}
          </pre>
        </div>

        <div className="info-card">
          <h3>✅ New Pattern (Auto-initialization)</h3>
          <pre
            style={{
              backgroundColor: '#1a1a1a',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.8rem'
            }}
          >
            {`// New way - automatic initialization
function App() {
  const { contract, address } = useContract({
    network: 'devnet',
    packageId: '0x...',
    metadata: metadata
  });
  
  return <MyApp contract={contract} address={address} />;
}

// Or even simpler with environment variables
function App() {
  const { contract, address } = useContract();
  return <MyApp contract={contract} address={address} />;
}`}
          </pre>
        </div>
      </div>

      <div className="info-card">
        <h3>Migration Benefits</h3>
        <ul>
          <li>
            ✅ <strong>Simpler API:</strong> No manual connection management
          </li>
          <li>
            ✅ <strong>Better Performance:</strong> Automatic caching with React useMemo
          </li>
          <li>
            ✅ <strong>Environment Support:</strong> Automatic configuration from environment
            variables
          </li>
          <li>
            ✅ <strong>Type Safety:</strong> Better TypeScript support and error handling
          </li>
          <li>
            ✅ <strong>React Best Practices:</strong> Follows modern React patterns and hooks
          </li>
        </ul>
      </div>
    </div>
  );
}

export default App;
