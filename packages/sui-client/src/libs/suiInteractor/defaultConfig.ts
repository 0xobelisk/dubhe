import { NetworkType } from 'src/types';

/**
 * Testnet deployment of the Dubhe framework.
 * Update these constants whenever the framework is redeployed to testnet.
 */
export const TESTNET_DUBHE_FRAMEWORK_PACKAGE_ID =
  '0xae33be6675639d6f1a5c468ae6bbc457ae4e22e57cd7526741d6143ce219d995';

export const TESTNET_DUBHE_HUB_OBJECT_ID =
  '0x80391929a8772aba091156fd1f099bf79240d2cf4471a14026b4aa68e3a240cc';

/**
 * Mainnet deployment of the Dubhe framework.
 * Update these constants whenever the framework is redeployed to mainnet.
 */
export const MAINNET_DUBHE_FRAMEWORK_PACKAGE_ID =
  '0x5bc40de124588b1e3514ca50f5e7109869351c4d9544e5f0cb9d30dd47bf8de7';

export const MAINNET_DUBHE_HUB_OBJECT_ID =
  '0x96e92d9baccfd0a2927b4f209756e1edbc18904bff34e486e4bb4a151320e1e5';

export interface NetworkConfig {
  fullNode: string;
  graphql?: string;
  network: string;
  txExplorer: string;
  accountExplorer: string;
  explorer: string;
  indexerUrl: string;
  channelUrl: string;
  /**
   * Published package ID of the Dubhe framework for this network.
   * Defined for testnet and mainnet (known constants).
   * Undefined for localnet/devnet — supply after deploying dubhe locally.
   */
  frameworkPackageId?: string;
  /**
   * Shared DappHub object ID for this network.
   * Defined for testnet and mainnet (known constants).
   * Undefined for localnet/devnet — read from the deployment JSON after publishing.
   */
  dappHubId?: string;
}

export const getDefaultConfig = (networkType: NetworkType = 'testnet'): NetworkConfig => {
  switch (networkType) {
    case 'localnet': {
      const localRpc = encodeURIComponent('http://127.0.0.1:9000');
      return {
        fullNode: 'http://127.0.0.1:9000',
        graphql: 'http://127.0.0.1:9125',
        network: 'localnet',
        txExplorer: `https://custom.suiscan.xyz/custom/tx/:txHash?network=${localRpc}`,
        accountExplorer: `https://custom.suiscan.xyz/custom/account/:address?network=${localRpc}`,
        explorer: `https://custom.suiscan.xyz/custom?network=${localRpc}`,
        indexerUrl: 'http://127.0.0.1:3001',
        channelUrl: 'http://127.0.0.1:8080'
        // frameworkPackageId: undefined — set after deploying dubhe locally
      };
    }
    case 'devnet':
      return {
        fullNode: 'https://fullnode.devnet.sui.io:443',
        network: 'devnet',
        txExplorer: 'https://suiscan.xyz/devnet/tx/:txHash',
        accountExplorer: 'https://suiscan.xyz/devnet/address/:address',
        explorer: 'https://suiscan.xyz/devnet',
        indexerUrl: 'http://127.0.0.1:3001',
        channelUrl: 'http://127.0.0.1:8080'
        // frameworkPackageId: undefined — no persistent deployment on devnet
      };
    case 'testnet':
      return {
        fullNode: 'https://fullnode.testnet.sui.io:443',
        graphql: 'https://sui-testnet.mystenlabs.com/graphql',
        network: 'testnet',
        txExplorer: 'https://suiscan.xyz/testnet/tx/:txHash',
        accountExplorer: 'https://suiscan.xyz/testnet/address/:address',
        explorer: 'https://suiscan.xyz/testnet',
        indexerUrl: 'http://127.0.0.1:3001',
        channelUrl: 'http://127.0.0.1:8080',
        frameworkPackageId: TESTNET_DUBHE_FRAMEWORK_PACKAGE_ID,
        dappHubId: TESTNET_DUBHE_HUB_OBJECT_ID
      };
    case 'mainnet':
      return {
        fullNode: 'https://fullnode.mainnet.sui.io:443',
        graphql: 'https://sui-mainnet.mystenlabs.com/graphql',
        network: 'mainnet',
        txExplorer: 'https://suiscan.xyz/mainnet/tx/:txHash',
        accountExplorer: 'https://suiscan.xyz/mainnet/address/:address',
        explorer: 'https://suiscan.xyz/mainnet',
        indexerUrl: 'http://127.0.0.1:3001',
        channelUrl: 'http://127.0.0.1:8080',
        frameworkPackageId: MAINNET_DUBHE_FRAMEWORK_PACKAGE_ID || undefined,
        dappHubId: MAINNET_DUBHE_HUB_OBJECT_ID || undefined
      };
    default:
      return {
        fullNode: 'https://fullnode.testnet.sui.io:443',
        graphql: 'https://sui-testnet.mystenlabs.com/graphql',
        network: 'testnet',
        txExplorer: 'https://suiscan.xyz/testnet/tx/:txHash',
        accountExplorer: 'https://suiscan.xyz/testnet/address/:address',
        explorer: 'https://suiscan.xyz/testnet',
        indexerUrl: 'http://127.0.0.1:3001',
        channelUrl: 'http://127.0.0.1:8080',
        frameworkPackageId: TESTNET_DUBHE_FRAMEWORK_PACKAGE_ID,
        dappHubId: TESTNET_DUBHE_HUB_OBJECT_ID
      };
  }
};

/** @deprecated Use `getDefaultConfig` instead. */
export const getDefaultURL = getDefaultConfig;
