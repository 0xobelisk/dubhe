// Express server manager - using Express framework and PostgreSQL subscriptions

import express, { Express, Request, Response } from 'express';
import { createServer, Server as HttpServer } from 'http';
import cors from 'cors';
import { Pool } from 'pg';
import { enhanceHttpServerWithSubscriptions } from 'postgraphile';
import { subscriptionConfig, SubscriptionConfig } from '../config/subscription-config';
import { systemLogger, serverLogger, logExpress } from '../utils/logger';
import { createWelcomePage, WelcomePageConfig } from './welcome-page';
import { createPlaygroundHtml, PostGraphileConfigOptions } from './postgraphile-config';
import type { DynamicTable } from './database-introspector';

export interface EnhancedServerConfig {
  postgraphileMiddleware: any;
  pgPool: Pool;
  tableNames: string[];
  databaseUrl: string;
  allTables: DynamicTable[];
  welcomeConfig: WelcomePageConfig;
  postgraphileConfigOptions: PostGraphileConfigOptions;
}

export class EnhancedServerManager {
  private config: SubscriptionConfig;
  private app: Express | null = null;
  private httpServer: HttpServer | null = null;
  private pgPool: Pool | null = null;

  constructor() {
    this.config = subscriptionConfig.getConfig();
  }

  // Create Express application
  private createExpressApp(serverConfig: EnhancedServerConfig): Express {
    const { postgraphileMiddleware, allTables, welcomeConfig, postgraphileConfigOptions } =
      serverConfig;

    const app = express();

    // Middleware configuration
    app.use(
      cors({
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
      })
    );

    // Request logging middleware
    app.use((req: Request, res: Response, next) => {
      const startTime = Date.now();

      res.on('finish', () => {
        logExpress(req.method, req.path, res.statusCode, startTime, {
          userAgent: req.get('user-agent')?.substring(0, 50)
        });
      });

      next();
    });

    // Route configuration

    // Root path - welcome page
    app.get('/', (req: Request, res: Response) => {
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(createWelcomePage(allTables, welcomeConfig));
    });

    // GraphQL Playground
    app.get('/playground', (req: Request, res: Response) => {
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(createPlaygroundHtml(postgraphileConfigOptions));
    });

    // Redirect old GraphiQL paths
    app.get('/graphiql*', (req: Request, res: Response) => {
      serverLogger.info('Redirecting old GraphiQL path', {
        from: req.path,
        to: '/playground'
      });
      res.redirect(301, '/playground');
    });

    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        subscriptions: this.getSubscriptionStatus(),
        timestamp: new Date().toISOString()
      });
    });

    // Subscription configuration endpoint
    app.get('/subscription-config', (req: Request, res: Response) => {
      res.json(subscriptionConfig.generateClientConfig());
    });

    // Configuration documentation endpoint
    app.get('/subscription-docs', (req: Request, res: Response) => {
      res.set('Content-Type', 'text/plain');
      res.send(subscriptionConfig.generateDocumentation());
    });

    // Add connection pool status endpoint
    app.get('/pool-status', (req, res) => {
      if (this.pgPool) {
        const poolStatus = {
          totalCount: this.pgPool.totalCount,
          idleCount: this.pgPool.idleCount,
          waitingCount: this.pgPool.waitingCount,
          maxConnections: this.pgPool.options.max || 'Not set',
          minConnections: this.pgPool.options.min || 'Not set'
        };

        res.json({
          status: 'ok',
          connectionPool: poolStatus,
          strategy: 'single-pool-unified',
          operations: ['query', 'mutation', 'subscription'],
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage()
        });
      } else {
        res.status(503).json({
          status: 'error',
          message: 'Connection pool not available'
        });
      }
    });

    // PostGraphile middleware - mount at root path, let PostGraphile handle routing itself
    app.use((req: Request, res: Response, next) => {
      // Check if PostGraphile middleware exists
      if (!postgraphileMiddleware) {
        console.error('❌ PostGraphile middleware is null!');
        if (req.path.startsWith('/graphql')) {
          res.status(500).json({
            error: 'PostGraphile middleware not properly initialized'
          });
          return;
        }
        next();
        return;
      }

      try {
        postgraphileMiddleware(req, res, next);
      } catch (error) {
        console.error('❌ PostGraphile middleware execution error:', error);
        if (req.path.startsWith('/graphql')) {
          res.status(500).json({
            error: 'PostGraphile execution error',
            details: error instanceof Error ? error.message : String(error)
          });
          return;
        }
        next();
      }
    });

    // Error handling middleware
    app.use((err: Error, req: Request, res: Response, _next: express.NextFunction) => {
      serverLogger.error('Express error handling', err, {
        url: req.originalUrl,
        method: req.method,
        userAgent: req.get('user-agent')?.substring(0, 50)
      });
      res.status(500).send('Internal Server Error');
    });

    return app;
  }

  // Create and configure HTTP server
  async createEnhancedServer(serverConfig: EnhancedServerConfig): Promise<HttpServer> {
    const { postgraphileMiddleware, pgPool } = serverConfig;

    // Store pool references for monitoring
    this.pgPool = pgPool;

    // Create Express application
    this.app = this.createExpressApp(serverConfig);

    // Create HTTP server
    this.httpServer = createServer(this.app);

    // Enable PostgreSQL subscriptions and WebSocket support
    if (this.config.capabilities.pgSubscriptions) {
      enhanceHttpServerWithSubscriptions(this.httpServer, postgraphileMiddleware, {
        // Enable WebSocket transport
        graphqlRoute: '/graphql'
      });
      systemLogger.info('✅ PostgreSQL subscriptions and WebSocket enabled', {
        pgSubscriptions: this.config.capabilities.pgSubscriptions,
        webSocket: true
      });
    }

    serverLogger.info('🚀 Express server creation completed', {
      framework: 'Express',
      graphqlPort: this.config.graphqlPort,
      capabilities: {
        pgSubscriptions: this.config.capabilities.pgSubscriptions
      },
      recommendedMethod: 'pg-subscriptions'
    });

    return this.httpServer;
  }

  // Start server
  async startServer(): Promise<void> {
    if (!this.httpServer) {
      throw new Error('Server not created, please call createEnhancedServer() first');
    }

    return new Promise((resolve, reject) => {
      this.httpServer!.listen(this.config.graphqlPort, (err?: Error) => {
        if (err) {
          reject(err);
          return;
        }

        this.logServerStatus();
        resolve();
      });
    });
  }

  // Log server status
  private logServerStatus() {
    const clientConfig = subscriptionConfig.generateClientConfig();

    serverLogger.info('🎉 Express GraphQL server started successfully!', {
      port: this.config.graphqlPort,
      framework: 'Express',
      endpoints: {
        home: `http://localhost:${this.config.graphqlPort}/`,
        playground: `http://localhost:${this.config.graphqlPort}/playground`,
        graphql: clientConfig.graphqlEndpoint,
        subscription: clientConfig.subscriptionEndpoint,
        health: `http://localhost:${this.config.graphqlPort}/health`,
        config: `http://localhost:${this.config.graphqlPort}/subscription-config`,
        docs: `http://localhost:${this.config.graphqlPort}/subscription-docs`
      }
    });

    // Display main access links
    console.log('\n' + '🌟'.repeat(30));
    console.log('🏠 Homepage: ' + `http://localhost:${this.config.graphqlPort}/`);
    console.log('🎮 Playground: ' + `http://localhost:${this.config.graphqlPort}/playground`);
    console.log('🔗 GraphQL: ' + clientConfig.graphqlEndpoint);
    console.log('📡 WebSocket: ' + clientConfig.subscriptionEndpoint);
    console.log('🌟'.repeat(30) + '\n');
  }

  // Get subscription status
  private getSubscriptionStatus() {
    return {
      enabled: this.config.capabilities.pgSubscriptions,
      method: 'pg-subscriptions',
      config: subscriptionConfig.generateClientConfig()
    };
  }

  // Quick shutdown
  async quickShutdown(): Promise<void> {
    systemLogger.info('🛑 Starting quick shutdown of Express server...');

    if (this.httpServer) {
      this.httpServer.close();
      systemLogger.info('✅ HTTP server closed');
    }

    systemLogger.info('🎯 Express server quick shutdown completed');
  }

  // Graceful shutdown
  async gracefulShutdown(pgPool: Pool): Promise<void> {
    systemLogger.info('🛑 Starting graceful shutdown of Express server...');

    const shutdownPromises: Promise<void>[] = [];

    // Close HTTP server
    if (this.httpServer) {
      shutdownPromises.push(
        new Promise((resolve) => {
          this.httpServer!.close(() => {
            systemLogger.info('✅ HTTP server closed');
            resolve();
          });
        })
      );
    }

    // Close database connection pool
    shutdownPromises.push(
      pgPool.end().then(() => {
        systemLogger.info('✅ Database connection pool closed');
      })
    );

    try {
      await Promise.all(shutdownPromises);
      systemLogger.info('🎯 Express server graceful shutdown completed');
    } catch (error) {
      systemLogger.error('❌ Error occurred during shutdown process', error);
      throw error;
    }
  }
}
