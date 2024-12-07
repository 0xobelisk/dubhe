import { Network } from '@aptos-labs/ts-sdk';
import { MovementNetwork, NetworkType } from 'src/types';
export const defaultGasBudget = 10 ** 8; // 0.1 APTOS, should be enough for most of the transactions
export const defaultGasPrice = 1000; // 1000 MIST

/**
 * @description Get the default fullnode and faucet url for the given network type
 * @param networkType, 'testnet' | 'mainnet' | 'devnet' | 'localnet', default is 'devnet'
 * @returns { fullNode: string, faucet?: string }
 */
export const getDefaultURL = (
  networkType: NetworkType = Network.DEVNET
): { fullNode: string; faucet?: string } => {
  switch (networkType) {
    case Network.LOCAL:
      return {
        fullNode: 'http://127.0.0.1:8080/v1',
        faucet: 'http://127.0.0.1:8081',
      };
    case Network.DEVNET:
      return {
        fullNode: 'https://api.devnet.aptoslabs.com/v1',
        faucet: 'https://faucet.devnet.aptoslabs.com',
      };
    case Network.TESTNET:
      return {
        fullNode: 'https://api.testnet.aptoslabs.com/v1',
        faucet: 'https://faucet.testnet.aptoslabs.com',
      };
    case Network.MAINNET:
      return {
        fullNode: 'https://api.mainnet.aptoslabs.com/v1',
      };
    case MovementNetwork.DEVNET:
      return {
        fullNode: 'https://aptos.devnet.m1.movementlabs.xyz',
        faucet: 'https://aptos.devnet.m1.movementlabs.xyz',
      };
    case MovementNetwork.TESTNET:
      return {
        fullNode: 'https://aptos.testnet.m1.movementlabs.xyz',
        faucet: 'https://aptos.testnet.m1.movementlabs.xyz',
      };
    default:
      return {
        fullNode: 'https://fullnode.devnet.aptoslabs.com',
        faucet: 'https://faucet.devnet.aptoslabs.com',
      };
  }
};
