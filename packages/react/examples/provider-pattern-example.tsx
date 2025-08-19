/**
 * Complete Example: DubheProvider Pattern
 * 
 * This example demonstrates how to use DubheProvider for optimal 
 * client management with single initialization and shared instances.
 */

import React, { useState, useEffect } from 'react';
import { 
  DubheProvider, 
  useDubhe, 
  useDubheContract,
  useDubheGraphQL,
  useDubheECS 
} from '@0xobelisk/react/sui';

// Mock metadata (replace with your actual contract metadata)
const contractMetadata = {
  // Your contract metadata here
};

const dubheConfig = {
  // Your dubhe metadata here
};

/**
 * Root App Component with DubheProvider
 * 
 * Key changes from useMemo pattern:
 * 1. Single DubheProvider wraps entire app
 * 2. Configuration defined at app level
 * 3. No need to pass config to child components
 */
function App() {
  // Configuration object - defined once at app level
  const config = {
    network: 'devnet' as const,
    packageId: process.env.NEXT_PUBLIC_PACKAGE_ID || '0x123...',
    metadata: contractMetadata,
    dubheMetadata: dubheConfig,
    credentials: {
      secretKey: process.env.NEXT_PUBLIC_PRIVATE_KEY
    },
    endpoints: {
      graphql: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
      websocket: process.env.NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT || 'ws://localhost:4000/graphql'
    },
    options: {
      enableBatchOptimization: true,
      cacheTimeout: 5000,
      debounceMs: 100,
      reconnectOnError: true
    }
  };

  return (
    <div className="app">
      <h1>Dubhe React App - Provider Pattern</h1>
      
      {/* Single Provider wraps entire application */}
      <DubheProvider config={config}>
        <AppContent />
      </DubheProvider>
    </div>
  );
}

/**
 * Main App Content - All components inside Provider can access clients
 */
function AppContent() {
  return (
    <div className="app-content">
      <ConnectionStatus />
      <TransactionComponent />
      <QueryComponent />
      <ECSComponent />
      <PerformanceMetrics />
    </div>
  );
}

/**
 * Connection Status Component
 * Uses the full useDubhe hook
 */
function ConnectionStatus() {
  const { address, network, metrics } = useDubhe();
  
  return (
    <div className="connection-status">
      <h2>Connection Status</h2>
      <p><strong>Address:</strong> {address}</p>
      <p><strong>Network:</strong> {network}</p>
      <p><strong>Init Time:</strong> {metrics.initTime.toFixed(2)}ms</p>
      <p><strong>Status:</strong> ✅ Connected</p>
    </div>
  );
}

/**
 * Transaction Component
 * Uses only the contract client for optimal performance
 */
function TransactionComponent() {
  // Only get what we need - more efficient than full hook
  const contract = useDubheContract();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleTransaction = async () => {
    try {
      setLoading(true);
      
      // Example transaction (replace with your actual contract calls)
      const tx = {
        // Your transaction parameters
      };
      
      // Use enhanced contract methods with error handling
      await contract.txWithOptions('my_system', 'my_method', {
        onSuccess: (result: any) => {
          console.log('Transaction successful:', result);
          setResult('Transaction completed successfully!');
        },
        onError: (error: any) => {
          console.error('Transaction failed:', error);
          setResult('Transaction failed: ' + error.message);
        }
      })(tx);
      
    } catch (error) {
      console.error('Transaction error:', error);
      setResult('Error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transaction-component">
      <h2>Smart Contract Transactions</h2>
      <button 
        onClick={handleTransaction} 
        disabled={loading}
        className="transaction-button"
      >
        {loading ? 'Processing...' : 'Execute Transaction'}
      </button>
      {result && (
        <div className={`result ${result.includes('Error') ? 'error' : 'success'}`}>
          {result}
        </div>
      )}
    </div>
  );
}

/**
 * Query Component
 * Demonstrates contract queries with performance tracking
 */
function QueryComponent() {
  const contract = useDubheContract();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const executeQuery = async () => {
    try {
      setLoading(true);
      
      // Example query with performance tracking
      const result = await contract.queryWithOptions('my_system', 'get_data', {})(
        { /* query parameters */ }
      );
      
      setData(result);
    } catch (error) {
      console.error('Query error:', error);
      setData({ error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-load data on component mount
    executeQuery();
  }, []); // No dependencies - contract is stable from Provider

  return (
    <div className="query-component">
      <h2>Contract Queries</h2>
      <button onClick={executeQuery} disabled={loading}>
        {loading ? 'Loading...' : 'Refresh Data'}
      </button>
      {data && (
        <pre className="query-result">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

/**
 * ECS Component
 * Uses GraphQL client for real-time data
 */
function ECSComponent() {
  const graphqlClient = useDubheGraphQL();
  const ecsWorld = useDubheECS();
  const [entities, setEntities] = useState<any[]>([]);

  useEffect(() => {
    if (!graphqlClient || !ecsWorld) {
      console.log('GraphQL or ECS not available (dubheMetadata required)');
      return;
    }

    // Example ECS query
    const loadEntities = async () => {
      try {
        const result = await graphqlClient.query({
          query: `
            query GetEntities {
              entities {
                id
                components
              }
            }
          `
        });
        
        setEntities(result.data?.entities || []);
      } catch (error) {
        console.error('ECS query error:', error);
      }
    };

    loadEntities();
  }, [graphqlClient, ecsWorld]); // Stable dependencies from Provider

  if (!graphqlClient) {
    return (
      <div className="ecs-component">
        <h2>ECS World</h2>
        <p>GraphQL client not available (dubheMetadata required)</p>
      </div>
    );
  }

  return (
    <div className="ecs-component">
      <h2>ECS World Data</h2>
      <p>Entities loaded: {entities.length}</p>
      {entities.length > 0 && (
        <ul className="entity-list">
          {entities.map((entity, index) => (
            <li key={entity.id || index}>
              Entity ID: {entity.id}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Performance Metrics Component
 * Shows the benefits of single initialization
 */
function PerformanceMetrics() {
  const { metrics } = useDubhe();
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    setRenderCount(count => count + 1);
  });

  return (
    <div className="performance-metrics">
      <h2>Performance Metrics</h2>
      <div className="metrics-grid">
        <div className="metric">
          <strong>Initialization Time:</strong> {metrics?.initTime?.toFixed(2) || 0}ms
        </div>
        <div className="metric">
          <strong>Component Renders:</strong> {renderCount}
        </div>
        <div className="metric">
          <strong>Client Instances:</strong> 1 (shared)
        </div>
        <div className="metric">
          <strong>Memory Usage:</strong> Optimized ✅
        </div>
      </div>
      
      <div className="comparison">
        <h3>vs. useMemo Pattern:</h3>
        <ul>
          <li>✅ Single client initialization (vs multiple)</li>
          <li>✅ No re-initialization on re-renders</li>
          <li>✅ Shared instances across components</li>
          <li>✅ Better memory efficiency</li>
          <li>✅ Guaranteed singleton behavior</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * CSS Styles for the example (inline for completeness)
 */
const styles = `
  .app {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .app-content {
    display: grid;
    gap: 20px;
  }

  .connection-status, 
  .transaction-component, 
  .query-component, 
  .ecs-component, 
  .performance-metrics {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    background: #f9f9f9;
  }

  .transaction-button {
    background: #0070f3;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
  }

  .transaction-button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .result {
    margin-top: 10px;
    padding: 10px;
    border-radius: 4px;
  }

  .result.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .result.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }

  .query-result {
    background: #f1f1f1;
    padding: 10px;
    border-radius: 4px;
    overflow: auto;
    max-height: 200px;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
    margin: 10px 0;
  }

  .metric {
    background: white;
    padding: 10px;
    border-radius: 4px;
    border: 1px solid #eee;
  }

  .comparison {
    margin-top: 15px;
    padding: 15px;
    background: #e3f2fd;
    border-radius: 4px;
  }

  .comparison ul {
    margin: 10px 0;
  }

  .comparison li {
    margin: 5px 0;
  }

  .entity-list {
    background: white;
    padding: 10px;
    border-radius: 4px;
    max-height: 150px;
    overflow: auto;
  }
`;

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default App;