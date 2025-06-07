#!/usr/bin/env node
import 'dotenv/config';
import Koa from 'koa';
import cors from '@koa/cors';
import { createKoaMiddleware } from 'trpc-koa-adapter';
import { createAppRouter } from '@latticexyz/store-sync/trpc-indexer';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createQueryAdapter } from '../postgres/deprecated/createQueryAdapter';
import { apiRoutes } from '../postgres/apiRoutes';
import { sentry } from '../koa-middleware/sentry';
import { healthcheck } from '../koa-middleware/healthcheck';
import { helloWorld } from '../koa-middleware/helloWorld';
import { metrics } from '../koa-middleware/metrics';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = await yargs(hideBin(process.argv))
  .option('host', {
    type: 'string',
    description: 'Host to listen on',
    default: '0.0.0.0'
  })
  .option('port', {
    type: 'number',
    description: 'Port to listen on',
    default: 3001
  })
  .option('database-url', {
    type: 'string',
    description: 'Database URL',
    default: 'postgres://postgres:postgres@127.0.0.1:5432/postgres'
  })
  .option('default-page-size', {
    type: 'number',
    description: 'Default page size for pagination',
    default: 10
  })
  .option('pagination-limit', {
    type: 'number',
    description: 'Maximum pagination limit',
    default: 100
  })
  .option('sentry-dsn', {
    type: 'string',
    description: 'Sentry DSN for error tracking'
  })
  .option('debug', {
    type: 'boolean',
    description: 'Debug mode',
    default: false
  })
  .help('help')
  .alias('help', 'h').argv;

const database = postgres(argv.databaseUrl, { prepare: false });

const server = new Koa();

if (argv.sentryDsn) {
  server.use(sentry(argv.sentryDsn));
}

server.use(cors());
server.use(healthcheck());
server.use(
  metrics({
    isHealthy: () => true,
    isReady: () => true
  })
);
server.use(helloWorld());
server.use(apiRoutes(drizzle(database), argv.defaultPageSize, argv.paginationLimit));

server.use(
  createKoaMiddleware({
    prefix: '/trpc',
    router: createAppRouter(),
    createContext: async () => ({
      queryAdapter: await createQueryAdapter(drizzle(database))
    })
  })
);

server.listen({ host: argv.host, port: argv.port });
console.log(`postgres indexer frontend listening on http://${argv.host}:${argv.port}`);
