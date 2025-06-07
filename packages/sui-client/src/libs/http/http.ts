import { BaseError, HttpError, GraphQLError, ParseError } from './errors';
import { createWebSocketClient, WebSocketInstance } from './ws-adapter';
import { SubscribableType } from '../../types';

export type FetchOptions = RequestInit & {
  next?: {
    revalidate?: boolean | number;
  };
};

export class Http {
  private apiEndpoint: string;
  private graphqlEndpoint: string;
  private wsEndpoint: string;
  private defaultOptions?: FetchOptions;

  constructor(
    apiEndpoint: string,
    wsEndpoint: string,
    private customFetch?: typeof fetch,
    defaultOptions?: FetchOptions
  ) {
    this.apiEndpoint = apiEndpoint;
    this.graphqlEndpoint = apiEndpoint + '/graphql';
    this.wsEndpoint = wsEndpoint;
    this.defaultOptions = defaultOptions;
  }

  private getFetch() {
    return this.customFetch || fetch;
  }

  async fetch(url: string): Promise<Response> {
    try {
      const fetchFn = this.getFetch();
      const response = await fetchFn(url, {
        ...this.defaultOptions,
      });

      if (!response.ok) {
        throw new HttpError(
          `HTTP error! status: ${response.status}`,
          response.status
        );
      }

      return response;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(`Failed to fetch: ${(error as Error).message}`, 500);
    }
  }

  async fetchGraphql<T>({
    query,
    variables,
  }: {
    query: string;
    variables?: any;
  }): Promise<T> {
    try {
      const isFirstPage = variables?.after === 'first';
      const fetchFn = this.getFetch();
      const response = await fetchFn(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            ...variables,
            after: isFirstPage ? undefined : variables?.after,
          },
        }),
        ...this.defaultOptions,
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData.errors?.[0]?.message?.includes('Syntax Error')) {
          throw new GraphQLError(
            `GraphQL syntax error: ${errorData.errors[0].message}`
          );
        }

        if (errorData.errors?.length > 0) {
          throw new GraphQLError(
            errorData.errors[0].message || 'Unknown GraphQL error'
          );
        }

        throw new HttpError(
          `HTTP error: ${JSON.stringify(errorData)}`,
          response.status
        );
      }
      const data = await response.json();

      if (data.errors) {
        throw new GraphQLError(
          data.errors[0]?.message || 'GraphQL query failed'
        );
      }

      return data.data;
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new ParseError('Failed to parse JSON response');
      }
      throw new HttpError(
        `Failed to fetch GraphQL: ${(error as Error).message}`,
        500
      );
    }
  }

  async subscribe({
    types,
    handleData,
    onOpen,
    onClose,
  }: {
    types: SubscribableType[];
    handleData: (data: any) => void;
    onOpen?: () => void;
    onClose?: () => void;
  }): Promise<WebSocketInstance> {
    const ws = createWebSocketClient(this.wsEndpoint);

    ws.onopen = () => {
      if (onOpen) {
        onOpen();
      }

      // console.log('Connected to the WebSocket server');
      const subscribeMessage = JSON.stringify(types);
      ws.send(subscribeMessage);
    };

    ws.onmessage = (event) => {
      handleData(JSON.parse(event.data.toString()));
    };

    ws.onclose = () => {
      if (onClose) {
        onClose();
      }

      // console.log('Disconnected from the WebSocket server');
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error:`, error);
    };

    return ws;
  }
}
