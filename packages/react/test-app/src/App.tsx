import { useState } from 'react';
import {
  DubheProvider,
  useDubhe,
  useDubheContract,
  useDubheGraphQL,
  useDubheECS
} from '@0xobelisk/react/sui';
import { Transaction, SuiMoveNormalizedModules } from '@0xobelisk/sui-client';

// Import mock metadata from the React package
import metadata from '../contracts/metadata.json';
import dubheMetadata from '../contracts/dubhe.config.json';

/**
 * Test Application for Dubhe React Auto-Initialization
 *
 * This application demonstrates the simplified pattern with:
 * - Automatic instance creation using React useMemo
 * - Configuration-driven setup (developers handle environment variables themselves)
 * - No manual connection management
 * - Direct instance access without connection state
 * - Explicit environment variable handling by the developer
 */

// Mock configuration for testing - memoized to prevent re-creation
const TEST_CONFIG = {
  network: 'localnet',
  packageId: '0x0000000000000000000000000000000000000000000000000000000000000000',
  metadata: metadata as SuiMoveNormalizedModules,
  dubheMetadata,
  endpoints: {
    graphql: 'http://localhost:4000/graphql',
    websocket: 'ws://localhost:4000/graphql'
  },
  options: {
    enableBatchOptimization: true,
    cacheTimeout: 3000,
    debounceMs: 100,
    reconnectOnError: true
  }
} as const;

function App() {
  const [testMode, setTestMode] = useState<'provider' | 'individual'>('provider');

  return (
    <div className="App">
      <header>
        <h1>🚀 Dubhe React Provider Pattern</h1>
        <p>Modern React integration with optimized Provider pattern and performance benefits</p>

        <div className="button-group">
          <button
            onClick={() => setTestMode('provider')}
            style={{ backgroundColor: testMode === 'provider' ? '#646cff' : '#1a1a1a' }}
          >
            Provider Pattern
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
        {testMode === 'provider' && <ProviderPatternExample />}
        {testMode === 'individual' && <IndividualHooksExample />}

        <ProviderBenefitsExample />
      </main>
    </div>
  );
}

/**
 * Provider Pattern Example - Using DubheProvider (Recommended)
 */
function ProviderPatternExample() {
  return (
    <DubheProvider config={TEST_CONFIG}>
      <ProviderPatternContent />
    </DubheProvider>
  );
}

function ProviderPatternContent() {
  const { contract, graphqlClient, ecsWorld, address, network, packageId } = useDubhe();

  return (
    <div className="test-section">
      <h2>Provider Pattern - Recommended Approach</h2>
      <p>
        This example shows the optimized Provider pattern with single initialization and shared
        context.
      </p>

      <div className="info-grid">
        <div className="info-card">
          <h3>Performance Benefits</h3>
          <p>✅ Single client initialization</p>
          <p>✅ Shared instances across components</p>
          <p>✅ No re-initialization on re-renders</p>
          <p>✅ Optimized memory usage</p>
        </div>

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
 * Individual Hooks Example - Using specific instance hooks within Provider
 */
function IndividualHooksExample() {
  return (
    <DubheProvider config={TEST_CONFIG}>
      <IndividualHooksContent />
    </DubheProvider>
  );
}

function IndividualHooksContent() {
  // Use individual hooks within Provider context - no config needed
  const contract = useDubheContract();
  const graphqlClient = useDubheGraphQL();
  const ecsWorld = useDubheECS();

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
          {`// Provider Pattern (Recommended)
function App() {
  return (
    <DubheProvider config={config}>
      <AppContent />
    </DubheProvider>
  );
}

function AppContent() {
  // Individual hooks within Provider - no config needed
  const contract = useDubheContract();
  const graphql = useDubheGraphQL();
  const ecs = useDubheECS();
  
  // Or get all at once
  const { contract, graphqlClient, ecsWorld } = useDubhe();
  
  // Use specific instances
  await contract.tx.my_system.my_method({ tx });
  const data = await graphqlClient.query({ ... });
  const component = await ecsWorld.getComponent('MyComponent');
}`}
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
 * Provider Benefits Example - Highlighting the advantages
 */
function ProviderBenefitsExample() {
  return (
    <div className="test-section">
      <h2>🚀 Provider Pattern Benefits</h2>
      <p>Why the Provider pattern is the recommended approach for modern React applications.</p>

      <div className="info-grid">
        <div className="info-card">
          <h3>🎨 Implementation Example</h3>
          <pre
            style={{
              backgroundColor: '#1a1a1a',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.8rem'
            }}
          >
            {`// App setup with Provider
function App() {
  const config = {
    network: 'devnet',
    packageId: '0x...',
    metadata: contractMetadata,
    credentials: {
      secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
    }
  };
  
  return (
    <DubheProvider config={config}>
      <AppContent />
    </DubheProvider>
  );
}

// Component usage - clean and simple
function AppContent() {
  const { contract, address } = useDubhe();
  return <div>Connected as {address}</div>;
}

// Individual hooks for specific needs
function TransactionComponent() {
  const contract = useDubheContract();
  return <button onClick={() => contract.tx...}>Execute</button>;
}`}
          </pre>
        </div>

        <div className="info-card">
          <h3>⚙️ Technical Advantages</h3>
          <ul>
            <li>
              ✅ <strong>Single Initialization:</strong> Client created once, shared everywhere
            </li>
            <li>
              ✅ <strong>useRef Pattern:</strong> Prevents re-creation on re-renders
            </li>
            <li>
              ✅ <strong>Memory Efficient:</strong> Shared instances across components
            </li>
            <li>
              ✅ <strong>Type Safety:</strong> Full TypeScript support with strict typing
            </li>
            <li>
              ✅ <strong>Error Handling:</strong> Centralized error management
            </li>
            <li>
              ✅ <strong>Performance Metrics:</strong> Built-in performance tracking
            </li>
          </ul>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <h3>🎨 React Best Practices</h3>
          <ul>
            <li>
              ✅ <strong>Context API:</strong> Standard React pattern for state sharing
            </li>
            <li>
              ✅ <strong>Component Composition:</strong> Clean separation of concerns
            </li>
            <li>
              ✅ <strong>Hooks Design:</strong> Follows React hooks conventions
            </li>
            <li>
              ✅ <strong>Dependency Injection:</strong> Provider pattern for dependency management
            </li>
          </ul>
        </div>

        <div className="info-card">
          <h3>🛠️ Developer Experience</h3>
          <ul>
            <li>
              ✅ <strong>Simple Setup:</strong> One-time configuration at app level
            </li>
            <li>
              ✅ <strong>Clean Components:</strong> No boilerplate in child components
            </li>
            <li>
              ✅ <strong>Flexible Usage:</strong> Choose unified or individual hooks
            </li>
            <li>
              ✅ <strong>Easy Testing:</strong> Mock providers for unit tests
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
