import { Middleware } from 'koa';
import Router from '@koa/router';
import compose from 'koa-compose';
import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { createYoga } from 'graphql-yoga';
import { createSchema } from './graphqlSchema';
// import { useServer } from 'graphql-ws/use/ws';
// import { WebSocketServer } from 'ws';
// import { Socket } from 'node:net';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function apiRoutes(
  database: BaseSQLiteDatabase<'sync', any>,
  defaultPageSize: number,
  paginationLimit: number
  // server: any
): Middleware {
  const router = new Router();

  const yoga = createYoga({
    schema: createSchema(database, defaultPageSize, paginationLimit),
    // graphiql: {
    // 	subscriptionsProtocol: 'WS',
    // },
    graphqlEndpoint: '/graphql',
    landingPage: true,
    cors: true
  });

  // const wsServer = new WebSocketServer({
  // 	server,
  // 	path: yoga.graphqlEndpoint,
  // });
  //
  // wsServer.on('connection', (ws, request) => {
  // 	console.log(`WebSocket Connected - ${request.url}`);
  // 	ws.on('message', message => {
  // 		console.log('Received Message:', message.toString());
  // 	});
  //
  // 	ws.on('error', error => {
  // 		console.error('WebSocket Error:', error);
  // 	});
  //
  // 	ws.on('close', (code, reason) => {
  // 		console.log(`WebSocket Closed - code: ${code}, reason: ${reason}`);
  // 	});
  // });
  //
  // const sockets = new Set<Socket>();
  // server.on('connection', (socket: Socket) => {
  // 	sockets.add(socket);
  // 	server.once('close', () => sockets.delete(socket));
  // });
  //
  // useServer(
  // 	{
  // 		// eslint-disable-next-line @typescript-eslint/no-explicit-any
  // 		execute: (args: any) => args.execute(args),
  // 		// eslint-disable-next-line @typescript-eslint/no-explicit-any
  // 		subscribe: (args: any) => args.subscribe(args),
  // 		onSubscribe: async (ctx, _id, params) => {
  // 			const {
  // 				schema,
  // 				execute,
  // 				subscribe,
  // 				contextFactory,
  // 				parse,
  // 				validate,
  // 			} = yoga.getEnveloped({
  // 				...ctx,
  // 				req: ctx.extra.request,
  // 				socket: ctx.extra.socket,
  // 				params,
  // 			});
  //
  // 			const args = {
  // 				schema,
  // 				operationName: params.operationName,
  // 				document: parse(params.query),
  // 				variableValues: params.variables,
  // 				contextValue: await contextFactory(),
  // 				execute,
  // 				subscribe,
  // 			};
  //
  // 			const errors = validate(args.schema, args.document);
  // 			if (errors.length) return errors;
  // 			return args;
  // 		},
  // 	},
  // 	wsServer
  // );
  router.all('/graphql', async (ctx) => {
    const response = await yoga.handle(ctx.req, ctx.res);
    ctx.respond = false;
    return response;
  });

  return compose([router.routes(), router.allowedMethods()]) as Middleware;
}
