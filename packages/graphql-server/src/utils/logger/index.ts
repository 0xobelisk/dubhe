import pino from 'pino';
import path from 'path';
import fs from 'fs';

export interface LoggerConfig {
  level?: string;
  service?: string;
  component?: string;
  enableFileLogging?: boolean;
  logsDir?: string;
}

export interface ComponentLoggerMethods {
  debug: (message: string, meta?: any) => void;
  info: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  error: (message: string, error?: any, meta?: any) => void;
}

/**
 * High-performance logging system based on Pino
 */
export class Logger {
  private pinoInstance: pino.Logger;
  private config: Required<LoggerConfig>;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: config.level || process.env.LOG_LEVEL || 'info',
      service: config.service || 'dubhe-graphql-server',
      component: config.component || 'default',
      enableFileLogging: config.enableFileLogging !== false,
      logsDir: config.logsDir || path.join(process.cwd(), 'logs')
    };

    this.ensureLogsDirectory();
    this.pinoInstance = this.createPinoInstance();
    this.setupExceptionHandlers();
  }

  /**
   * Ensure logs directory exists
   */
  private ensureLogsDirectory(): void {
    if (this.config.enableFileLogging && !fs.existsSync(this.config.logsDir)) {
      fs.mkdirSync(this.config.logsDir, { recursive: true });
    }
  }

  /**
   * Create Pino instance
   */
  private createPinoInstance(): pino.Logger {
    const pinoOptions: pino.LoggerOptions = {
      level: this.config.level,
      base: {
        service: this.config.service,
        pid: process.pid
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level(label: string) {
          return { level: label };
        }
      },
      serializers: {
        error: pino.stdSerializers.err
      }
    };

    // If file logging is enabled, use multistream
    if (this.config.enableFileLogging) {
      const streams = [
        // Pretty print to console
        {
          stream: pino.transport({
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'yyyy-mm-dd HH:MM:ss.l',
              ignore: 'pid,hostname,service,component',
              messageFormat: '[{component}]: {msg}',
              singleLine: true,
              hideObject: false
            }
          })
        },
        // JSON format to file
        {
          stream: pino.destination({
            dest: path.join(this.config.logsDir, 'combined.log'),
            sync: false
          })
        }
      ];

      return pino(pinoOptions, pino.multistream(streams));
    }

    // Only output to console in pretty format
    return pino({
      ...pinoOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname,service',
          messageFormat: '[{component}]: {msg}',
          singleLine: true,
          hideObject: false
        }
      }
    });
  }

  /**
   * Setup exception handlers
   */
  private setupExceptionHandlers(): void {
    process.on('uncaughtException', (error) => {
      this.pinoInstance.fatal({ error }, 'Uncaught Exception');
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.pinoInstance.fatal({ reason, promise }, 'Unhandled Promise Rejection');
      process.exit(1);
    });
  }

  /**
   * Create component logger with context
   */
  public createComponentLogger(component: string): ComponentLoggerMethods {
    const componentLogger = this.pinoInstance.child({ component });

    return {
      debug: (message: string, meta?: any) => componentLogger.debug(meta || {}, message),
      info: (message: string, meta?: any) => componentLogger.info(meta || {}, message),
      warn: (message: string, meta?: any) => componentLogger.warn(meta || {}, message),
      error: (message: string, error?: any, meta?: any) => {
        const errorData =
          error instanceof Error
            ? {
                error: {
                  message: error.message,
                  stack: error.stack,
                  name: error.name
                },
                ...meta
              }
            : { error, ...meta };
        componentLogger.error(errorData, message);
      }
    };
  }

  /**
   * Get raw Pino instance
   */
  public getPinoInstance(): pino.Logger {
    return this.pinoInstance;
  }

  /**
   * Log performance metrics
   */
  public logPerformance(operation: string, startTime: number, meta?: any): void {
    const duration = Date.now() - startTime;
    const perfLogger = this.createComponentLogger('performance');
    perfLogger.info(operation, {
      duration: `${duration}ms`,
      ...meta
    });
  }

  /**
   * Log Express HTTP requests
   */
  public logExpress(
    method: string,
    path: string,
    statusCode: number,
    startTime: number,
    meta?: any
  ): void {
    const duration = Date.now() - startTime;
    const httpLogger = this.createComponentLogger('express');
    const message = `${method} ${path} - ${statusCode} (${duration}ms)`;

    // Choose log level based on status code
    if (statusCode >= 500) {
      httpLogger.error(message, meta);
    } else if (statusCode >= 400) {
      httpLogger.warn(message, meta);
    } else {
      httpLogger.info(message, meta);
    }
  }

  /**
   * Log database operations
   */
  public logDatabaseOperation(operation: string, table?: string, meta?: any): void {
    const dbLogger = this.createComponentLogger('database');
    dbLogger.info(`Database operation: ${operation}`, {
      table,
      ...meta
    });
  }

  /**
   * Log WebSocket events
   */
  public logWebSocketEvent(event: string, clientCount?: number, meta?: any): void {
    const wsLogger = this.createComponentLogger('websocket');
    wsLogger.info(`WebSocket event: ${event}`, {
      clientCount,
      ...meta
    });
  }

  /**
   * Log GraphQL queries
   */
  public logGraphQLQuery(operation: string, query?: string, variables?: any): void {
    const gqlLogger = this.createComponentLogger('graphql');
    gqlLogger.info(`GraphQL ${operation}`, {
      query: query?.substring(0, 200) + (query && query.length > 200 ? '...' : ''),
      variableCount: variables ? Object.keys(variables).length : 0
    });
  }
}

// Create default logger instance
const defaultLogger = new Logger();

// Export predefined component loggers (maintain backward compatibility)
export const dbLogger = defaultLogger.createComponentLogger('database');
export const serverLogger = defaultLogger.createComponentLogger('server');
export const httpLogger = defaultLogger.createComponentLogger('express');
export const wsLogger = defaultLogger.createComponentLogger('websocket');
export const gqlLogger = defaultLogger.createComponentLogger('graphql');
export const subscriptionLogger = defaultLogger.createComponentLogger('subscription');
export const systemLogger = defaultLogger.createComponentLogger('system');
export const authLogger = defaultLogger.createComponentLogger('auth');
export const perfLogger = defaultLogger.createComponentLogger('performance');

// Export utility functions (maintain backward compatibility)
export const createComponentLogger = (component: string) =>
  defaultLogger.createComponentLogger(component);

export const logPerformance = (operation: string, startTime: number, meta?: any) =>
  defaultLogger.logPerformance(operation, startTime, meta);

export const logExpress = (
  method: string,
  path: string,
  statusCode: number,
  startTime: number,
  meta?: any
) => defaultLogger.logExpress(method, path, statusCode, startTime, meta);

export const logDatabaseOperation = (operation: string, table?: string, meta?: any) =>
  defaultLogger.logDatabaseOperation(operation, table, meta);

export const logWebSocketEvent = (event: string, clientCount?: number, meta?: any) =>
  defaultLogger.logWebSocketEvent(event, clientCount, meta);

export const logGraphQLQuery = (operation: string, query?: string, variables?: any) =>
  defaultLogger.logGraphQLQuery(operation, query, variables);

// Default export (maintain backward compatibility)
export default defaultLogger.getPinoInstance();
