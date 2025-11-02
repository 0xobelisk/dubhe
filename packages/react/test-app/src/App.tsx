import { useState, useEffect } from 'react';
import {
  DubheProvider,
  useDubhe,
  useDubheContract,
  useDubheGraphQL,
  useDubheECS,
  useDubheConfigUpdate,
  DubheConfig
} from '@0xobelisk/react/sui';
import { Transaction, SuiMoveNormalizedModules } from '@0xobelisk/sui-client';

// Import mock metadata from the React package
import metadata from '../contracts/metadata.json';
import dubheMetadata from '../contracts/dubhe.config.json';
import dubheFrameworkMetadata from '../contracts/dubhe.config_framework.json';

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
const TEST_CONFIG: DubheConfig = {
  network: 'localnet',
  packageId: '0x0000000000000000000000000000000000000000000000000000000000000000',
  dubheSchemaId: '0x0000000000000000000000000000000000000000000000000000000000000000',
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
};

function App() {
  const [testMode, setTestMode] = useState<'provider' | 'individual' | 'dynamic-config'>(
    'provider'
  );

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
          <button
            onClick={() => setTestMode('dynamic-config')}
            style={{ backgroundColor: testMode === 'dynamic-config' ? '#646cff' : '#1a1a1a' }}
          >
            Dynamic Config
          </button>
        </div>
      </header>

      <main>
        {testMode === 'provider' && <ProviderPatternExample />}
        {testMode === 'individual' && <IndividualHooksExample />}
        {testMode === 'dynamic-config' && <DynamicConfigExample />}

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
 * Dynamic Configuration Example - Switching APIs at Runtime
 */
function DynamicConfigExample() {
  return (
    <DubheProvider config={TEST_CONFIG}>
      <DynamicConfigContent />
    </DubheProvider>
  );
}

function DynamicConfigContent() {
  const { updateConfig, config } = useDubheConfigUpdate();
  const graphqlClient = useDubheGraphQL();
  const [apiMode, setApiMode] = useState<'local' | 'testnet'>('local');
  const [dappData, setDappData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Switch to testnet API
  const switchToTestnet = () => {
    setApiMode('testnet');
    setDappData(null);
    setError(null);
    updateConfig({
      endpoints: {
        graphql: 'https://dubhe-framework-testnet-api.obelisk.build/graphql',
        websocket: 'wss://dubhe-framework-testnet-api.obelisk.build/graphql'
      },
      dubheMetadata: dubheFrameworkMetadata
    });
  };

  // Switch to local API
  const switchToLocal = () => {
    setApiMode('local');
    setDappData(null);
    setError(null);
    updateConfig({
      endpoints: {
        graphql: 'http://localhost:4000/graphql',
        websocket: 'ws://localhost:4000/graphql'
      },
      dubheMetadata
    });
  };

  // Query dapp metadata
  const queryDappMetadata = async () => {
    if (!graphqlClient) {
      setError('GraphQL client not available');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // const result = await graphqlClient.query(DAPP_METADATA_QUERY);
      const result = await graphqlClient.getAllTables('dappMetadata', {
        first: 10,
        orderBy: [{ field: 'createdAtTimestampMs', direction: 'DESC' }]
      });
      console.log('✅ Query successful:', result);
      setDappData(result);
    } catch (err: any) {
      console.error('❌ Query failed:', err);
      setError(err.message || 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  // Auto query when switching to testnet
  useEffect(() => {
    if (apiMode === 'testnet' && graphqlClient) {
      // Wait a bit for the client to be ready
      const timer = setTimeout(() => {
        queryDappMetadata();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [apiMode, graphqlClient]);

  return (
    <div className="test-section">
      <h2>🔄 Dynamic Configuration Updates</h2>
      <p>Switch between different GraphQL endpoints at runtime</p>

      <div className="info-grid">
        <div className="info-card">
          <h3>Current Configuration</h3>
          <p>
            <strong>API Mode:</strong> {apiMode === 'local' ? '🏠 Local' : '🌐 Testnet'}
          </p>
          <p>
            <strong>GraphQL:</strong>{' '}
            <span style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
              {config.endpoints?.graphql}
            </span>
          </p>
          <p>
            <strong>WebSocket:</strong>{' '}
            <span style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
              {config.endpoints?.websocket}
            </span>
          </p>
          <p>
            <strong>Client Status:</strong> {graphqlClient ? '✅ Ready' : '❌ Not Available'}
          </p>
        </div>

        <div className="info-card">
          <h3>Switch API Endpoint</h3>
          <div className="button-group">
            <button
              onClick={switchToLocal}
              disabled={apiMode === 'local'}
              style={{
                backgroundColor: apiMode === 'local' ? '#646cff' : '#1a1a1a',
                opacity: apiMode === 'local' ? 0.6 : 1
              }}
            >
              🏠 Local API
            </button>
            <button
              onClick={switchToTestnet}
              disabled={apiMode === 'testnet'}
              style={{
                backgroundColor: apiMode === 'testnet' ? '#646cff' : '#1a1a1a',
                opacity: apiMode === 'testnet' ? 0.6 : 1
              }}
            >
              🌐 Testnet API
            </button>
          </div>
          <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
            Click to switch between local development and testnet production APIs
          </p>
        </div>
      </div>

      <div className="info-card">
        <h3>GraphQL Query Example</h3>
        <div className="button-group">
          <button onClick={queryDappMetadata} disabled={loading || !graphqlClient}>
            {loading ? '⏳ Querying...' : '🔍 Query Dapp Metadata'}
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#ff4444',
              borderRadius: '4px',
              color: 'white'
            }}
          >
            <strong>❌ Error:</strong> {error}
          </div>
        )}

        {dappData && (
          <div style={{ marginTop: '1rem' }}>
            <h4>✅ Query Results ({dappData?.dappMetadata?.nodes?.length || 0} dapps found)</h4>
            <pre
              style={{
                backgroundColor: '#1a1a1a',
                padding: '1rem',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '400px',
                fontSize: '0.8rem',
                textAlign: 'left'
              }}
            >
              {JSON.stringify(dappData, null, 2)}
            </pre>

            {dappData?.dappMetadata?.nodes?.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4>Dapp Summary:</h4>
                {dappData.dappMetadata.nodes.slice(0, 3).map((dapp: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: '#2a2a2a',
                      borderRadius: '4px',
                      textAlign: 'left'
                    }}
                  >
                    <p>
                      <strong>Name:</strong> {dapp.name || 'N/A'}
                    </p>
                    <p>
                      <strong>Dapp Key:</strong> {dapp.dappKey}
                    </p>
                    <p>
                      <strong>Description:</strong> {dapp.description || 'N/A'}
                    </p>
                    <p>
                      <strong>Admin:</strong>{' '}
                      <span style={{ fontSize: '0.8rem' }}>
                        {dapp.admin?.slice(0, 8)}...{dapp.admin?.slice(-6)}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '1rem', textAlign: 'left' }}>
          <h4>Query Code:</h4>
          <pre
            style={{
              backgroundColor: '#1a1a1a',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.8rem'
            }}
          >
            {`const DAPP_METADATA_QUERY = gql\`
  query DappMetadataQuery {
    dappMetadata {
      nodes {
        admin
        coverUrl
        createdAt
        createdAtTimestampMs
        dappKey
        description
        isDeleted
        lastUpdateDigest
        name
        nodeId
        partners
        packageIds
        pausable
        updatedAtTimestampMs
        websiteUrl
        version
      }
    }
  }
\`;`}
          </pre>
        </div>
      </div>

      <div className="info-card">
        <h3>How It Works</h3>
        <ol style={{ textAlign: 'left', lineHeight: '1.8' }}>
          <li>
            <strong>Initialize Provider:</strong> Start with default configuration (local API)
          </li>
          <li>
            <strong>Switch Endpoint:</strong> Use <code>updateConfig()</code> to change GraphQL
            endpoints
          </li>
          <li>
            <strong>Auto Reset:</strong> All clients are automatically reset and re-initialized
          </li>
          <li>
            <strong>Query Data:</strong> Execute GraphQL queries with the new endpoint
          </li>
          <li>
            <strong>Real-time Updates:</strong> Components automatically get the new client
            instances
          </li>
        </ol>

        <pre
          style={{
            backgroundColor: '#1a1a1a',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '0.8rem',
            marginTop: '1rem'
          }}
        >
          {`// Dynamic configuration example
import { gql } from '@apollo/client';

const { updateConfig, config } = useDubheConfigUpdate();

// Switch to testnet
updateConfig({
  endpoints: {
    graphql: 'https://dubhe-framework-testnet-api.obelisk.build/graphql',
    websocket: 'wss://dubhe-framework-testnet-api.obelisk.build/graphql'
  }
});

// Query with new endpoint
const graphqlClient = useDubheGraphQL();
const QUERY = gql\`
  query {
    dappMetadata {
      nodes { ... }
    }
  }
\`;
const result = await graphqlClient.query(QUERY);`}
        </pre>
      </div>
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
