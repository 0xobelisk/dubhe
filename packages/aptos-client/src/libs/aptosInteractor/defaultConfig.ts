import { Network } from '@aptos-labs/ts-sdk';
import { NetworkType } from 'src/types';

export interface NetworkConfig {
  fullNode: string;
  faucet?: string;
  indexer?: string;
  pepper?: string;
  prover?: string;
  chainId?: string;
  network?: Network;
}

export function isValidNetworkType(network: string): network is NetworkType {
  const validNetworks = [
    'mainnet',
    'testnet',
    'devnet',
    'localnet',
    'movementmainnet',
    'movementtestnet',
  ];
  return validNetworks.includes(network);
}

/**
 * Convert NetworkType to Network enum
 * @param networkType Network identifier of NetworkType
 * @returns Corresponding Network enum value
 * @throws Error when unknown network type is provided
 */
export function getNetwork(networkType: NetworkType): Network {
  switch (networkType) {
    case 'mainnet':
      return Network.MAINNET;
    case 'testnet':
      return Network.TESTNET;
    case 'devnet':
      return Network.DEVNET;
    case 'movementmainnet':
      return Network.CUSTOM; // Movement mainnet uses Aptos custom network
    case 'movementtestnet':
      return Network.CUSTOM; // Movement testnet uses Aptos custom network
    case 'localnet':
      return Network.LOCAL;
    default:
      throw new Error(`Unknown network type: ${networkType}`);
  }
}

export const getDefaultURL = (
  networkType: NetworkType = 'testnet'
): NetworkConfig => {
  switch (networkType) {
    case 'localnet':
      return {
        fullNode: 'http://127.0.0.1:8080/v1',
        indexer: 'http://127.0.0.1:8090/v1/graphql',
        faucet: 'http://127.0.0.1:8081',
        // Use the devnet service for local environment
        pepper: 'https://api.devnet.aptoslabs.com/keyless/pepper/v0',
        // Use the devnet service for local environment
        prover: 'https://api.devnet.aptoslabs.com/keyless/prover/v0',
        chainId: '4',
        network: getNetwork(networkType),
      };
    case 'devnet':
      return {
        fullNode: 'https://api.devnet.aptoslabs.com/v1',
        indexer: 'https://api.devnet.aptoslabs.com/v1/graphql',
        faucet: 'https://faucet.devnet.aptoslabs.com',
        pepper: 'https://api.devnet.aptoslabs.com/keyless/pepper/v0',
        prover: 'https://api.devnet.aptoslabs.com/keyless/prover/v0',
        network: getNetwork(networkType),
      };
    case 'testnet':
      return {
        fullNode: 'https://api.testnet.aptoslabs.com/v1',
        indexer: 'https://api.testnet.aptoslabs.com/v1/graphql',
        faucet: 'https://faucet.testnet.aptoslabs.com',
        pepper: 'https://api.testnet.aptoslabs.com/keyless/pepper/v0',
        prover: 'https://api.testnet.aptoslabs.com/keyless/prover/v0',
        chainId: '2',
        network: getNetwork(networkType),
      };
    case 'mainnet':
      return {
        fullNode: 'https://api.mainnet.aptoslabs.com/v1',
        indexer: 'https://api.mainnet.aptoslabs.com/v1/graphql',
        pepper: 'https://api.mainnet.aptoslabs.com/keyless/pepper/v0',
        prover: 'https://api.mainnet.aptoslabs.com/keyless/prover/v0',
        chainId: '1',
        network: getNetwork(networkType),
      };
    case 'movementmainnet':
      return {
        fullNode: 'https://mainnet.movementnetwork.xyz/v1',
        network: getNetwork(networkType),
      };
    case 'movementtestnet':
      return {
        fullNode: 'https://aptos.testnet.porto.movementlabs.xyz/v1',
        faucet: 'https://faucet.testnet.porto.movementnetwork.xyz',
        network: getNetwork(networkType),
      };
    default:
      return {
        fullNode: 'https://api.testnet.aptoslabs.com/v1',
        indexer: 'https://api.testnet.aptoslabs.com/v1/graphql',
        faucet: 'https://faucet.testnet.aptoslabs.com',
        pepper: 'https://api.testnet.aptoslabs.com/keyless/pepper/v0',
        prover: 'https://api.testnet.aptoslabs.com/keyless/prover/v0',
        chainId: '2',
        network: getNetwork('testnet'),
      };
  }
};
