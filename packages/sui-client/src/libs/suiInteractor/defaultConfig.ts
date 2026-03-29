import { NetworkType } from 'src/types';

/**
 * Testnet deployment of the Dubhe framework.
 * Update these constants whenever the framework is redeployed to testnet.
 */
export const TESTNET_DUBHE_FRAMEWORK_PACKAGE_ID =
  '0x1b84d7aa8fbd502932d9153e29afb2bef1367f4c4b9da063258c384474313063';

export const TESTNET_DUBHE_HUB_OBJECT_ID =
  '0x2f1b8574ad35164a481719c07ff9d098851bb39db292f6310d73707024592f42';

/**
 * Mainnet deployment of the Dubhe framework.
 * Update these constants whenever the framework is redeployed to mainnet.
 */
export const MAINNET_DUBHE_FRAMEWORK_PACKAGE_ID =
  '0x635cf664078d2dad3e09f5c7968034b10d151dba3a409d4b5ffe2dd1f7e9850f';

export const MAINNET_DUBHE_HUB_OBJECT_ID =
  '0x7bc513abf24ab254ef9bf4a262081d0c72efc1bdd6698af46a13b9683485b015';

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
