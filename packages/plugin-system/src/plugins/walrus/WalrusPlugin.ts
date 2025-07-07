import { Plugin, PluginContext, PluginStatus } from '../../core/types';

/**
 * Walrus插件配置
 */
export interface WalrusPluginConfig {
  /** Walrus API端点 */
  apiEndpoint: string;

  /** API密钥 */
  apiKey: string;

  /** 网络类型 */
  network: 'mainnet' | 'testnet' | 'devnet';

  /** 超时时间（毫秒） */
  timeout?: number;

  /** 重试次数 */
  retries?: number;

  /** 是否启用缓存 */
  enableCache?: boolean;

  /** 缓存过期时间（秒） */
  cacheExpiry?: number;
}

/**
 * Walrus API响应类型
 */
export interface WalrusAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Walrus NFT元数据
 */
export interface WalrusNFTMetadata {
  id: string;
  name: string;
  description?: string;
  image?: string;
  attributes?: Record<string, any>;
  collection?: string;
  owner?: string;
  tokenId?: string;
  contractAddress?: string;
}

/**
 * Walrus插件实现
 */
export class WalrusPlugin implements Plugin {
  public metadata = {
    id: 'walrus-plugin',
    name: 'Walrus Integration',
    version: '1.0.0',
    description: 'Integration with Walrus NFT platform',
    author: 'Dubhe Team',
    homepage: 'https://walrus.xyz',
    license: 'MIT',
    tags: ['nft', 'walrus', 'marketplace'],
    dependencies: [],
    compatibility: {
      dubhe: '>=1.0.0',
      node: '>=18.0.0',
    },
  };

  public config: WalrusPluginConfig;
  public status: PluginStatus = PluginStatus.UNINSTALLED;
  public error?: Error;

  private apiClient: WalrusAPIClient;
  private cache: Map<string, { data: any; expiry: number }> = new Map();

  constructor(config: WalrusPluginConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      enableCache: true,
      cacheExpiry: 300, // 5分钟
      ...config,
    };

    this.apiClient = new WalrusAPIClient(this.config);
  }

  /**
   * 插件安装时调用
   */
  async onInstall(context: PluginContext): Promise<void> {
    context.logger.info('Installing Walrus plugin...');

    // 验证配置
    this.validateConfig();

    // 测试API连接
    await this.testConnection();

    context.logger.info('Walrus plugin installed successfully');
  }

  /**
   * 插件启用时调用
   */
  async onEnable(context: PluginContext): Promise<void> {
    context.logger.info('Enabling Walrus plugin...');

    // 注册ECS组件
    this.registerECSComponents(context);

    // 注册事件监听器
    this.registerEventListeners(context);

    // 初始化缓存
    if (this.config.enableCache) {
      this.initializeCache();
    }

    context.logger.info('Walrus plugin enabled successfully');
  }

  /**
   * 插件禁用时调用
   */
  async onDisable(context: PluginContext): Promise<void> {
    context.logger.info('Disabling Walrus plugin...');

    // 清理缓存
    this.cache.clear();

    // 移除事件监听器
    this.removeEventListeners(context);

    context.logger.info('Walrus plugin disabled successfully');
  }

  /**
   * 插件卸载时调用
   */
  async onUninstall(context: PluginContext): Promise<void> {
    context.logger.info('Uninstalling Walrus plugin...');

    // 清理资源
    this.cache.clear();

    context.logger.info('Walrus plugin uninstalled successfully');
  }

  /**
   * 获取NFT元数据
   */
  async getNFTMetadata(
    tokenId: string,
    contractAddress: string
  ): Promise<WalrusNFTMetadata | null> {
    const cacheKey = `nft:${contractAddress}:${tokenId}`;

    // 检查缓存
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }
    }

    try {
      const response = await this.apiClient.getNFTMetadata(
        tokenId,
        contractAddress
      );

      if (response.success && response.data) {
        const metadata = response.data as WalrusNFTMetadata;

        // 缓存结果
        if (this.config.enableCache) {
          this.cache.set(cacheKey, {
            data: metadata,
            expiry: Date.now() + this.config.cacheExpiry! * 1000,
          });
        }

        return metadata;
      }

      return null;
    } catch (error) {
      throw new Error(`Failed to get NFT metadata: ${error}`);
    }
  }

  /**
   * 获取用户NFT列表
   */
  async getUserNFTs(
    address: string,
    limit = 20,
    offset = 0
  ): Promise<WalrusNFTMetadata[]> {
    const cacheKey = `user-nfts:${address}:${limit}:${offset}`;

    // 检查缓存
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }
    }

    try {
      const response = await this.apiClient.getUserNFTs(address, limit, offset);

      if (response.success && response.data) {
        const nfts = response.data as WalrusNFTMetadata[];

        // 缓存结果
        if (this.config.enableCache) {
          this.cache.set(cacheKey, {
            data: nfts,
            expiry: Date.now() + this.config.cacheExpiry! * 1000,
          });
        }

        return nfts;
      }

      return [];
    } catch (error) {
      throw new Error(`Failed to get user NFTs: ${error}`);
    }
  }

  /**
   * 搜索NFT
   */
  async searchNFTs(
    query: string,
    filters?: Record<string, any>
  ): Promise<WalrusNFTMetadata[]> {
    try {
      const response = await this.apiClient.searchNFTs(query, filters);

      if (response.success && response.data) {
        return response.data as WalrusNFTMetadata[];
      }

      return [];
    } catch (error) {
      throw new Error(`Failed to search NFTs: ${error}`);
    }
  }

  /**
   * 获取NFT价格信息
   */
  async getNFTPrice(
    tokenId: string,
    contractAddress: string
  ): Promise<{
    price: number;
    currency: string;
    lastUpdated: string;
  } | null> {
    try {
      const response = await this.apiClient.getNFTPrice(
        tokenId,
        contractAddress
      );

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      throw new Error(`Failed to get NFT price: ${error}`);
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    if (!this.config.apiEndpoint) {
      throw new Error('API endpoint is required');
    }

    if (!this.config.apiKey) {
      throw new Error('API key is required');
    }

    if (!['mainnet', 'testnet', 'devnet'].includes(this.config.network)) {
      throw new Error('Invalid network type');
    }
  }

  /**
   * 测试API连接
   */
  private async testConnection(): Promise<void> {
    try {
      const response = await this.apiClient.ping();
      if (!response.success) {
        throw new Error('API connection test failed');
      }
    } catch (error) {
      throw new Error(`Failed to connect to Walrus API: ${error}`);
    }
  }

  /**
   * 注册ECS组件
   */
  private registerECSComponents(context: PluginContext): void {
    // 这里可以注册与Walrus相关的ECS组件
    // 例如：NFTComponent, WalletComponent等
    context.logger.info('Registered Walrus ECS components');
  }

  /**
   * 注册事件监听器
   */
  private registerEventListeners(context: PluginContext): void {
    // 监听区块链事件
    context.events.on('transaction:confirmed', async (txHash: string) => {
      try {
        // 处理交易确认事件
        await this.handleTransactionConfirmed(txHash, context);
      } catch (error) {
        context.logger.error(`Error handling transaction confirmed: ${error}`);
      }
    });

    // 监听NFT转移事件
    context.events.on('nft:transferred', async (data: any) => {
      try {
        // 处理NFT转移事件
        await this.handleNFTTransferred(data, context);
      } catch (error) {
        context.logger.error(`Error handling NFT transfer: ${error}`);
      }
    });
  }

  /**
   * 移除事件监听器
   */
  private removeEventListeners(context: PluginContext): void {
    context.events.removeAllListeners('transaction:confirmed');
    context.events.removeAllListeners('nft:transferred');
  }

  /**
   * 初始化缓存
   */
  private initializeCache(): void {
    // 定期清理过期缓存
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (value.expiry < now) {
          this.cache.delete(key);
        }
      }
    }, 60000); // 每分钟清理一次
  }

  /**
   * 处理交易确认事件
   */
  private async handleTransactionConfirmed(
    txHash: string,
    context: PluginContext
  ): Promise<void> {
    context.logger.info(`Transaction confirmed: ${txHash}`);

    // 这里可以添加交易确认后的逻辑
    // 例如：更新NFT状态、发送通知等
  }

  /**
   * 处理NFT转移事件
   */
  private async handleNFTTransferred(
    data: any,
    context: PluginContext
  ): Promise<void> {
    context.logger.info(`NFT transferred: ${data.tokenId}`);

    // 清除相关缓存
    const cacheKey = `nft:${data.contractAddress}:${data.tokenId}`;
    this.cache.delete(cacheKey);

    // 这里可以添加NFT转移后的逻辑
    // 例如：更新所有权、发送通知等
  }
}

/**
 * Walrus API客户端
 */
class WalrusAPIClient {
  private config: WalrusPluginConfig;

  constructor(config: WalrusPluginConfig) {
    this.config = config;
  }

  /**
   * 发送API请求
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<WalrusAPIResponse<T>> {
    const url = `${this.config.apiEndpoint}${endpoint}`;

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
        'X-Network': this.config.network,
        ...options.headers,
      },
      timeout: this.config.timeout,
    };

    const finalOptions = { ...defaultOptions, ...options };

    for (let i = 0; i < this.config.retries!; i++) {
      try {
        const response = await fetch(url, finalOptions);
        const data = await response.json();
        return data as WalrusAPIResponse<T>;
      } catch (error) {
        if (i === this.config.retries! - 1) {
          throw error;
        }
        // 等待后重试
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    throw new Error('API request failed after all retries');
  }

  /**
   * 测试API连接
   */
  async ping(): Promise<WalrusAPIResponse> {
    return this.request('/ping');
  }

  /**
   * 获取NFT元数据
   */
  async getNFTMetadata(
    tokenId: string,
    contractAddress: string
  ): Promise<WalrusAPIResponse<WalrusNFTMetadata>> {
    return this.request(`/nft/${contractAddress}/${tokenId}`);
  }

  /**
   * 获取用户NFT列表
   */
  async getUserNFTs(
    address: string,
    limit: number,
    offset: number
  ): Promise<WalrusAPIResponse<WalrusNFTMetadata[]>> {
    return this.request(
      `/user/${address}/nfts?limit=${limit}&offset=${offset}`
    );
  }

  /**
   * 搜索NFT
   */
  async searchNFTs(
    query: string,
    filters?: Record<string, any>
  ): Promise<WalrusAPIResponse<WalrusNFTMetadata[]>> {
    const params = new URLSearchParams({ q: query, ...filters });
    return this.request(`/search?${params.toString()}`);
  }

  /**
   * 获取NFT价格
   */
  async getNFTPrice(
    tokenId: string,
    contractAddress: string
  ): Promise<WalrusAPIResponse> {
    return this.request(`/nft/${contractAddress}/${tokenId}/price`);
  }
}
