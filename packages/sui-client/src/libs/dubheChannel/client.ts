import type {
  SubscribeTableParams,
  GetTableParams,
  SubmitTransactionParams,
  GetNonceParams,
  GetNonceResponse,
  TableEventData,
  SubscriptionOptions,
  DubheChannelConfig
} from './types';

/**
 * DubheChannel Client
 * Provides methods to interact with Dubhe Channel API:
 * - subscribe_table: Subscribe to table updates via SSE
 * - get_table: Get table data
 * - submit: Submit transaction
 * - nonce: Get nonce for a sender
 */
export class DubheChannelClient {
  private baseUrl: string;
  private timeout: number;
  private activeSubscriptions: Map<string, AbortController>;

  constructor(config: DubheChannelConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout || 30000;
    this.activeSubscriptions = new Map();
  }

  /**
   * Update client configuration
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<DubheChannelConfig>): void {
    if (config.baseUrl !== undefined) {
      this.baseUrl = config.baseUrl.replace(/\/$/, '');
    }
    if (config.timeout !== undefined) {
      this.timeout = config.timeout;
    }
  }

  /**
   * Subscribe to table updates via Server-Sent Events (SSE)
   * @param params - Subscription parameters
   * @param options - Event handlers
   * @returns Unsubscribe function
   */
  async subscribeTable(
    params: SubscribeTableParams,
    options?: SubscriptionOptions
  ): Promise<() => void> {
    const subscriptionKey = this.generateSubscriptionKey(params);

    // Check if already subscribed
    if (this.activeSubscriptions.has(subscriptionKey)) {
      throw new Error(`Already subscribed to: ${subscriptionKey}`);
    }

    const controller = new AbortController();
    this.activeSubscriptions.set(subscriptionKey, controller);

    const url = `${this.baseUrl}/subscribe_table`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream'
        },
        body: JSON.stringify(params),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Handle SSE stream
      this.handleSSEStream(response.body, options, controller.signal);

      options?.onOpen?.();
    } catch (error: any) {
      this.activeSubscriptions.delete(subscriptionKey);
      if (error.name !== 'AbortError') {
        options?.onError?.(error);
      }
      throw error;
    }

    // Return unsubscribe function
    return () => {
      controller.abort();
      this.activeSubscriptions.delete(subscriptionKey);
      options?.onClose?.();
    };
  }

  /**
   * Get table data
   * @param params - Query parameters
   * @returns Table data
   */
  async getTable<T = any>(params: GetTableParams): Promise<T> {
    const url = `${this.baseUrl}/get_table`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to get table data: ${error.message}`);
    }
  }

  /**
   * Submit transaction
   * @param params - Transaction parameters
   * @returns Transaction result
   */
  async submit<T = any>(params: SubmitTransactionParams): Promise<T> {
    const url = `${this.baseUrl}/submit`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to submit transaction: ${error.message}`);
    }
  }

  /**
   * Get nonce for a sender
   * @param params - Nonce query parameters
   * @returns Nonce response
   */
  async getNonce(params: GetNonceParams): Promise<GetNonceResponse> {
    const url = `${this.baseUrl}/nonce`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to get nonce: ${error.message}`);
    }
  }

  /**
   * Unsubscribe from specific subscription
   * @param params - Original subscription parameters
   */
  unsubscribe(params: SubscribeTableParams): void {
    const subscriptionKey = this.generateSubscriptionKey(params);
    const controller = this.activeSubscriptions.get(subscriptionKey);

    if (controller) {
      controller.abort();
      this.activeSubscriptions.delete(subscriptionKey);
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  unsubscribeAll(): void {
    for (const controller of this.activeSubscriptions.values()) {
      controller.abort();
    }
    this.activeSubscriptions.clear();
  }

  /**
   * Get number of active subscriptions
   */
  getActiveSubscriptionCount(): number {
    return this.activeSubscriptions.size;
  }

  /**
   * Handle Server-Sent Events stream
   */
  private async handleSSEStream(
    body: ReadableStream<Uint8Array>,
    options?: SubscriptionOptions,
    signal?: AbortSignal
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        if (signal?.aborted) {
          break;
        }

        const { done, value } = await reader.read();

        if (done) {
          options?.onClose?.();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const data = line.substring(5).trim();
              if (data) {
                const eventData: TableEventData = JSON.parse(data);
                options?.onMessage?.(eventData);
              }
            } catch (error: any) {
              options?.onError?.(new Error(`Failed to parse SSE data: ${error.message}`));
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        options?.onError?.(error);
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Generate unique subscription key
   */
  private generateSubscriptionKey(params: SubscribeTableParams): string {
    const parts = [params.dapp_key];
    if (params.account) parts.push(params.account);
    if (params.table) parts.push(params.table);
    if (params.key) parts.push(JSON.stringify(params.key));
    return parts.join(':');
  }
}
