import { NetworkType } from 'src/types';

export interface NetworkConfig {
  fullNode: string;
  graphql?: string;
  network: string;
  txExplorer: string;
  accountExplorer: string;
  explorer: string;
  indexerUrl: string;
}

export const getDefaultURL = (
  networkType: NetworkType = 'testnet'
): NetworkConfig => {
  switch (networkType) {
    case 'localnet':
      return {
        fullNode: 'http://127.0.0.1:9000',
        graphql: 'http://127.0.0.1:9125',
        network: 'localnet',
        txExplorer:
          'https://explorer.polymedia.app/txblock/:txHash?network=local',
        accountExplorer:
          'https://explorer.polymedia.app/address/:address?network=local',
        explorer: 'https://explorer.polymedia.app?network=local',
        indexerUrl: 'http://127.0.0.1:3001',
      };
    case 'devnet':
      return {
        fullNode: 'https://fullnode.devnet.sui.io:443',
        network: 'devnet',
        txExplorer: 'https://suiscan.xyz/devnet/tx/:txHash',
        accountExplorer: 'https://suiscan.xyz/devnet/address/:address',
        explorer: 'https://suiscan.xyz/devnet',
        indexerUrl: 'http://127.0.0.1:3001',
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
      };
  }
};
