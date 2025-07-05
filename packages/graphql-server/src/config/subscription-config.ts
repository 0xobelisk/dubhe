// Subscription configuration manager - supports dynamic configuration for three subscription modes

export interface SubscriptionCapabilities {
  liveQueries: boolean;
  pgSubscriptions: boolean;
  nativeWebSocket: boolean;
}

export interface SubscriptionConfig {
  // Basic configuration
  enableSubscriptions: boolean;

  // Capability configuration
  capabilities: SubscriptionCapabilities;

  // Database configuration detection
  walLevel: 'minimal' | 'replica' | 'logical';

  // Port configuration
  graphqlPort: number;
  websocketPort?: number;

  // Performance configuration
  maxConnections: number;
  heartbeatInterval: number;

  // Debug configuration
  enableNotificationLogging: boolean;
  enablePerformanceMetrics: boolean;
}

// Subscription configuration input parameter interface
export interface SubscriptionConfigInput {
  enableSubscriptions: boolean;
  databaseUrl: string;
  port: string;
  enableLiveQueries?: boolean;
  enablePgSubscriptions?: boolean;
  enableNativeWebSocket?: boolean;
  realtimePort?: string;
  maxConnections?: string;
  heartbeatInterval?: string;
  debugNotifications?: boolean;
  enableMetrics?: boolean;
}

export class SubscriptionConfigManager {
  private config: SubscriptionConfig;

  constructor(configInput: SubscriptionConfigInput) {
    this.config = this.parseConfigInput(configInput);
  }

  // Parse configuration from input parameters
  private parseConfigInput(input: SubscriptionConfigInput): SubscriptionConfig {
    const enableSubscriptions = input.enableSubscriptions;

    // Auto-detect WAL level (in actual applications, query through database)
    const walLevel = this.detectWalLevel(input.databaseUrl);

    // Determine capabilities based on input parameters - default enable all features when subscriptions are enabled
    const capabilities: SubscriptionCapabilities = {
      liveQueries:
        enableSubscriptions && input.enableLiveQueries !== false && walLevel === 'logical',

      pgSubscriptions: enableSubscriptions && input.enablePgSubscriptions !== false,

      nativeWebSocket: enableSubscriptions && input.enableNativeWebSocket !== false
    };

    return {
      enableSubscriptions,
      capabilities,
      walLevel,

      graphqlPort: parseInt(input.port),
      websocketPort: input.realtimePort ? parseInt(input.realtimePort) : undefined,

      maxConnections: parseInt(input.maxConnections || '1000'),
      heartbeatInterval: parseInt(input.heartbeatInterval || '30000'),

      enableNotificationLogging: input.debugNotifications === true,
      enablePerformanceMetrics: input.enableMetrics === true
    };
  }

  // Detect database WAL level
  private detectWalLevel(databaseUrl?: string): 'minimal' | 'replica' | 'logical' {
    // In actual applications should query database
    // SELECT setting FROM pg_settings WHERE name = 'wal_level';

    // Currently return default value
    return 'replica';
  }

  // Get current configuration
  getConfig(): SubscriptionConfig {
    return { ...this.config };
  }

  // Get recommended subscription method
  getRecommendedSubscriptionMethod(): string {
    if (this.config.capabilities.liveQueries) {
      return 'live-queries';
    } else if (this.config.capabilities.pgSubscriptions) {
      return 'pg-subscriptions';
    } else if (this.config.capabilities.nativeWebSocket) {
      return 'native-websocket';
    } else {
      return 'none';
    }
  }

  // Generate client configuration
  generateClientConfig() {
    const baseUrl = `http://localhost:${this.config.graphqlPort}`;

    return {
      graphqlEndpoint: `${baseUrl}/graphql`,
      subscriptionEndpoint:
        this.config.capabilities.pgSubscriptions || this.config.capabilities.liveQueries
          ? `ws://localhost:${this.config.graphqlPort}/graphql`
          : undefined,
      nativeWebSocketEndpoint: this.config.capabilities.nativeWebSocket
        ? `ws://localhost:${this.config.websocketPort || this.config.graphqlPort}`
        : undefined,
      capabilities: this.config.capabilities,
      recommendedMethod: this.getRecommendedSubscriptionMethod()
    };
  }

  // Generate PostGraphile configuration - simplified version, only keep listen subscriptions
  generatePostGraphileConfig() {
    return {
      subscriptions: this.config.enableSubscriptions,
      live: false, // Disable live queries, only use listen subscriptions
      simpleSubscriptions: this.config.capabilities.pgSubscriptions,

      // Performance configuration - optimized for listen subscriptions
      pgSettings: {
        statement_timeout: '30s',
        default_transaction_isolation: 'read committed'
      },

      // Monitoring configuration
      allowExplain: this.config.enablePerformanceMetrics,
      disableQueryLog: !this.config.enableNotificationLogging
    };
  }

  // Generate environment variable documentation
  generateDocumentation(): string {
    return `
# 📡 Subscription System Configuration Guide

## Basic Configuration
enableSubscriptions=${
      this.config.enableSubscriptions
    }         # Enable/disable subscription features

## Capability Configuration (optional, auto-detect by default)
enableLiveQueries=${
      this.config.capabilities.liveQueries
    }           # Enable @live directive (requires wal_level=logical)
enablePgSubscriptions=${
      this.config.capabilities.pgSubscriptions
    }       # Enable PostgreSQL subscriptions 
enableNativeWebSocket=${this.config.capabilities.nativeWebSocket}       # Enable native WebSocket

## Port Configuration
port=${this.config.graphqlPort}                          # GraphQL port
realtimePort=${
      this.config.websocketPort || 'undefined'
    }                 # Native WebSocket port (optional)

## Performance Configuration
maxConnections=${this.config.maxConnections}  # Maximum connections
heartbeatInterval=${this.config.heartbeatInterval}  # Heartbeat interval (ms)

## Debug Configuration
debugNotifications=${this.config.enableNotificationLogging}         # Notification logging
enableMetrics=${this.config.enablePerformanceMetrics} # Performance metrics

## Current Configuration Status:
- Subscription Features: ${this.config.enableSubscriptions ? '✅ Enabled' : '❌ Disabled'}
- Live Queries: ${this.config.capabilities.liveQueries ? '✅ Available' : '❌ Not Available'}
- PG Subscriptions: ${
      this.config.capabilities.pgSubscriptions ? '✅ Available' : '❌ Not Available'
    }  
- Native WebSocket: ${
      this.config.capabilities.nativeWebSocket ? '✅ Available' : '❌ Not Available'
    }
- WAL Level: ${this.config.walLevel}
- Recommended Method: ${this.getRecommendedSubscriptionMethod()}
		`;
  }
}

// Export singleton instance - lazy initialization
let _subscriptionConfigInstance: SubscriptionConfigManager | null = null;

export const subscriptionConfig = {
  getConfig(): SubscriptionConfig {
    if (!_subscriptionConfigInstance) {
      throw new Error(
        'Subscription config not initialized. Call refresh() first with configuration.'
      );
    }
    return _subscriptionConfigInstance.getConfig();
  },

  generateClientConfig() {
    if (!_subscriptionConfigInstance) {
      throw new Error(
        'Subscription config not initialized. Call refresh() first with configuration.'
      );
    }
    return _subscriptionConfigInstance.generateClientConfig();
  },

  generatePostGraphileConfig() {
    if (!_subscriptionConfigInstance) {
      throw new Error(
        'Subscription config not initialized. Call refresh() first with configuration.'
      );
    }
    return _subscriptionConfigInstance.generatePostGraphileConfig();
  },

  generateDocumentation(): string {
    if (!_subscriptionConfigInstance) {
      throw new Error(
        'Subscription config not initialized. Call refresh() first with configuration.'
      );
    }
    return _subscriptionConfigInstance.generateDocumentation();
  },

  // Initialize/refresh configuration with input parameters
  refresh(configInput: SubscriptionConfigInput) {
    _subscriptionConfigInstance = new SubscriptionConfigManager(configInput);
  }
};
