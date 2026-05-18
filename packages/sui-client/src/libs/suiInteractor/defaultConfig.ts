import { NetworkType } from 'src/types';

/**
 * Testnet deployment of the Dubhe framework.
 * Update these constants whenever the framework is redeployed to testnet.
 */
export const TESTNET_DUBHE_FRAMEWORK_PACKAGE_ID =
  '0xa329f9059c88560d2b42d1fc0a1435a1ff8144562d38290a9411e0497315ff84';

export const TESTNET_DUBHE_HUB_OBJECT_ID =
  '0x576eb1d8f9a80e198159ff0ad7d1fcf70db5dbe8ab7ec665e4a079d5c81344d1';

/**
 * Mainnet deployment of the Dubhe framework.
 * Update these constants whenever the framework is redeployed to mainnet.
 */
export const MAINNET_DUBHE_FRAMEWORK_PACKAGE_ID =
  '0xdd59a0e210585ec38da6d966d2936c7476b9e08b3cc2f785ca998d084bf24c81';

export const MAINNET_DUBHE_HUB_OBJECT_ID =
  '0x20eaa1f7846bf49f10725626fcd991ceb8d40c217976091a669393483f67de4d';

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
    case 'localnet':
      return {
        fullNode: 'http://127.0.0.1:9000',
        graphql: 'http://127.0.0.1:9125',
        network: 'localnet',
        txExplorer: 'https://explorer.polymedia.app/txblock/:txHash?network=local',
        accountExplorer: 'https://explorer.polymedia.app/address/:address?network=local',
        explorer: 'https://explorer.polymedia.app?network=local',
        indexerUrl: 'http://127.0.0.1:3001',
        channelUrl: 'http://127.0.0.1:8080'
        // frameworkPackageId: undefined — set after deploying dubhe locally
      };
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
