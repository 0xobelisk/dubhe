import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, colorize } = format;

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

// Colors for different log levels
const COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m', // Yellow
  INFO: '\x1b[36m', // Cyan
  DEBUG: '\x1b[35m', // Magenta
  TRACE: '\x1b[90m', // Gray
  RESET: '\x1b[0m', // Reset
};

class Logger {
  private logger: any;
  private static instance: Logger;

  constructor() {
    const logLevel = process.env.LOG_LEVEL || 'INFO';

    this.logger = createLogger({
      levels: LOG_LEVELS,
      level: logLevel,
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        printf(({ timestamp, level, message, ...meta }) => {
          const color =
            COLORS[level.toUpperCase() as keyof typeof COLORS] || COLORS.RESET;
          const metaStr = Object.keys(meta).length
            ? ` ${JSON.stringify(meta)}`
            : '';
          return `${color}[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}${COLORS.RESET}`;
        })
      ),
      transports: [
        new transports.Console({
          format: combine(
            colorize(),
            printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length
                ? ` ${JSON.stringify(meta)}`
                : '';
              return `[${timestamp}] ${level}: ${message}${metaStr}`;
            })
          ),
        }),
      ],
    });
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLevel(level: string): void {
    this.logger.level = level;
  }

  colorize(text: string, colorName: keyof typeof COLORS): string {
    return `${COLORS[colorName]}${text}${COLORS.RESET}`;
  }

  formatMessage(
    level: string,
    message: string,
    metadata?: Record<string, unknown>
  ): string {
    const timestamp = new Date().toISOString();
    const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  trace(message: string, metadata?: Record<string, unknown>): void {
    this.logger.debug(message, metadata); // winston 没有 trace 级别，使用 debug
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.logger.debug(message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.logger.info(message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.logger.warn(message, metadata);
  }

  error(
    message: string,
    error?: unknown,
    metadata?: Record<string, unknown>
  ): void {
    const errorStr = error instanceof Error ? error.stack : String(error);
    const fullMessage = error ? `${message}\n${errorStr}` : message;
    this.logger.error(fullMessage, metadata);
  }

  span(
    name: string,
    metadata?: Record<string, unknown>
  ): { end: (outcome?: string) => void } {
    const startTime = Date.now();
    this.debug(`Starting span: ${name}`, metadata);

    return {
      end: (outcome?: string) => {
        const duration = Date.now() - startTime;
        const outcomeStr = outcome ? ` (${outcome})` : '';
        this.debug(
          `Completed span: ${name}${outcomeStr} - ${duration}ms`,
          metadata
        );
      },
    };
  }
}

// Initialize logger
const initLogger = (): void => {
  const logLevel = process.env.LOG_LEVEL || 'INFO';
  Logger.getInstance().setLevel(logLevel);
};

// Export singleton instance
export default Logger.getInstance();

// Export initialization function
export { initLogger };
