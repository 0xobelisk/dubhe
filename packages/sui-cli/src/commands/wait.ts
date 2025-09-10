import type { CommandModule } from 'yargs';
import waitOn from 'wait-on';
import ora from 'ora';
import chalk from 'chalk';
import net from 'net';
import { handlerExit } from './shell';

interface WaitOptions {
  url?: string;
  localnet?: boolean;
  'local-database'?: boolean;
  'local-node'?: boolean;
  'local-indexer'?: boolean;
  timeout: number;
  interval: number;
}

function withoutProxy<T>(fn: () => Promise<T>): Promise<T> {
  const originalProxy = {
    HTTP_PROXY: process.env.HTTP_PROXY,
    HTTPS_PROXY: process.env.HTTPS_PROXY,
    http_proxy: process.env.http_proxy,
    https_proxy: process.env.https_proxy,
    NO_PROXY: process.env.NO_PROXY,
    no_proxy: process.env.no_proxy
  };

  try {
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    process.env.NO_PROXY = '127.0.0.1,localhost,*.local';
    process.env.no_proxy = '127.0.0.1,localhost,*.local';

    return fn();
  } finally {
    Object.keys(originalProxy).forEach((key) => {
      const value = originalProxy[key as keyof typeof originalProxy];
      if (value !== undefined) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    });
  }
}

// Check if PostgreSQL port is occupied (service is running)
async function checkPostgreSQLRunning(): Promise<boolean> {
  return checkPortRunning(5432);
}

// Generic port checking function
async function checkPortRunning(port: number, host: string = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    // Set timeout for connection attempt
    const timeout = setTimeout(() => {
      socket.destroy();
      if (!isConnected) {
        resolve(false);
      }
    }, 2000);

    socket.connect(port, host, () => {
      isConnected = true;
      clearTimeout(timeout);
      socket.destroy();
      resolve(true); // Port is occupied, service is running
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      if (!isConnected) {
        resolve(false); // Connection failed, service not running
      }
    });
  });
}

// Check indexer health endpoint
async function checkIndexerHealth(): Promise<boolean> {
  try {
    await withoutProxy(() =>
      waitOn({
        resources: ['http://localhost:8080/health'],
        timeout: 2000,
        interval: 500,
        validateStatus: (status: number) => status === 200
      })
    );
    return true;
  } catch {
    return false;
  }
}

// Wait for all localnet services with custom checks
async function waitForLocalnetServices(options: WaitOptions): Promise<void> {
  const spinner = ora({
    text: 'Waiting for dubhe localnet services...',
    color: 'cyan'
  });

  spinner.start();

  const startTime = Date.now();

  while (Date.now() - startTime < options.timeout) {
    try {
      // Check HTTP services using wait-on (excluding 9000 port)
      await withoutProxy(() =>
        waitOn({
          resources: [
            'http://127.0.0.1:9123', // Sui faucet
            'http://127.0.0.1:4000' // GraphQL server
          ],
          timeout: options.interval,
          interval: 500,
          validateStatus: (status: number) => status === 200
        })
      );

      // Check PostgreSQL separately
      const postgresRunning = await checkPostgreSQLRunning();

      if (postgresRunning) {
        spinner.succeed(chalk.green('All dubhe localnet services are ready!'));
        return;
      }
    } catch (error) {
      // Continue waiting...
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, options.interval));
  }

  // Timeout reached
  throw new Error('Timeout waiting for services');
}

// Wait for local database
async function waitForLocalDatabase(options: WaitOptions): Promise<void> {
  const spinner = ora({
    text: 'Waiting for local database...',
    color: 'cyan'
  });

  spinner.start();

  const startTime = Date.now();

  while (Date.now() - startTime < options.timeout) {
    const isRunning = await checkPostgreSQLRunning();

    if (isRunning) {
      spinner.succeed(chalk.green('Local database is ready!'));
      return;
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, options.interval));
  }

  // Timeout reached
  throw new Error('Timeout waiting for local database');
}

// Wait for local Sui node
async function waitForLocalNode(options: WaitOptions): Promise<void> {
  const spinner = ora({
    text: 'Waiting for local Sui node...',
    color: 'cyan'
  });

  spinner.start();

  const startTime = Date.now();

  while (Date.now() - startTime < options.timeout) {
    const isRunning = await checkPortRunning(9123);

    if (isRunning) {
      spinner.succeed(chalk.green('Local Sui node is ready!'));
      return;
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, options.interval));
  }

  // Timeout reached
  throw new Error('Timeout waiting for local Sui node');
}

// Wait for local indexer
async function waitForLocalIndexer(options: WaitOptions): Promise<void> {
  const spinner = ora({
    text: 'Waiting for local indexer...',
    color: 'cyan'
  });

  spinner.start();

  const startTime = Date.now();

  while (Date.now() - startTime < options.timeout) {
    const isRunning = await checkIndexerHealth();

    if (isRunning) {
      spinner.succeed(chalk.green('Local indexer is ready!'));
      return;
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, options.interval));
  }

  // Timeout reached
  throw new Error('Timeout waiting for local indexer');
}

const commandModule: CommandModule = {
  command: 'wait',
  describe: 'Wait for service(s) to be ready',
  builder(yargs) {
    return yargs
      .option('url', {
        type: 'string',
        description: 'URL to wait for (single service)'
      })
      .option('localnet', {
        type: 'boolean',
        description:
          'Wait for all dubhe localnet services (sui localnode:9000&9123, postgres:5432, graphql:4000)',
        default: false
      })
      .option('local-database', {
        type: 'boolean',
        description: 'Wait for local database (PostgreSQL on port 5432)',
        default: false
      })
      .option('local-node', {
        type: 'boolean',
        description: 'Wait for local Sui node (port 9123)',
        default: false
      })
      .option('local-indexer', {
        type: 'boolean',
        description: 'Wait for local indexer (health check at http://localhost:8080/health)',
        default: false
      })
      .option('timeout', {
        type: 'number',
        description: 'Timeout (in milliseconds)',
        default: 24 * 60 * 60 * 1000 // 24 hours, effectively no timeout
      })
      .option('interval', {
        type: 'number',
        description: 'Check interval (in milliseconds)',
        default: 1000
      })
      .check((argv) => {
        const hasUrl = !!argv.url;
        const hasLocalnet = !!argv.localnet;
        const hasLocalDatabase = !!argv['local-database'];
        const hasLocalNode = !!argv['local-node'];
        const hasLocalIndexer = !!argv['local-indexer'];

        const optionCount = [hasUrl, hasLocalnet, hasLocalDatabase, hasLocalNode, hasLocalIndexer].filter(Boolean).length;

        if (optionCount === 0) {
          throw new Error('Please provide at least one option: --url, --localnet, --local-database, --local-node, or --local-indexer');
        }

        if (hasUrl && optionCount > 1) {
          throw new Error('Cannot use --url together with other options');
        }

        if (hasLocalnet && (hasLocalDatabase || hasLocalNode || hasLocalIndexer)) {
          throw new Error('Cannot use --localnet together with individual service options');
        }

        return true;
      });
  },
  async handler(argv) {
    const options = argv as unknown as WaitOptions;

    try {
      if (options.localnet) {
        await waitForLocalnetServices(options);
      } else if (options['local-database']) {
        await waitForLocalDatabase(options);
      } else if (options['local-node']) {
        await waitForLocalNode(options);
      } else if (options['local-indexer']) {
        await waitForLocalIndexer(options);
      } else {
        // Single URL mode - use original wait-on logic
        const spinner = ora({
          text: `Waiting for ${options.url}...`,
          color: 'cyan'
        });

        spinner.start();

        await withoutProxy(() =>
          waitOn({
            resources: [options.url!],
            timeout: options.timeout,
            interval: options.interval,
            validateStatus: (status: number) => status === 200
          })
        );

        spinner.succeed(chalk.green('Service is ready!'));
      }

      handlerExit();
    } catch (error) {
      const spinner = ora();

      let errorMessage = 'Timeout waiting for service';
      let helpMessage = 'Please make sure the service is running...';

      if (options.localnet) {
        errorMessage = 'Timeout waiting for dubhe localnet services';
        helpMessage = 'Please make sure all required services are running:\n' +
          '- Sui localnode on port 9000\n' +
          '- Sui faucet on port 9123\n' +
          '- PostgreSQL database on port 5432\n' +
          '- Dubhe GraphQL server on port 4000';
      } else if (options['local-database']) {
        errorMessage = 'Timeout waiting for local database';
        helpMessage = 'Please make sure PostgreSQL is running on port 5432';
      } else if (options['local-node']) {
        errorMessage = 'Timeout waiting for local Sui node';
        helpMessage = 'Please make sure Sui localnode is running on port 9123';
      } else if (options['local-indexer']) {
        errorMessage = 'Timeout waiting for local indexer';
        helpMessage = 'Please make sure indexer is running and health endpoint is available at http://localhost:8080/health';
      }

      spinner.fail(chalk.red(errorMessage));
      console.error(chalk.yellow(helpMessage));

      handlerExit(1);
    }
  }
};

export default commandModule;
