export {
  WalrusAPIResponse,
  WalrusNFTMetadata,
  WalrusPlugin,
  WalrusPluginConfig,
} from './WalrusPlugin';

// 插件工厂
export const createWalrusPlugin = (config: WalrusPluginConfig) => {
  return new WalrusPlugin(config);
};

// 默认配置
export const defaultWalrusConfig: WalrusPluginConfig = {
  apiEndpoint: 'https://api.walrus.xyz',
  apiKey: '',
  network: 'mainnet',
  timeout: 30000,
  retries: 3,
  enableCache: true,
  cacheExpiry: 300,
};
