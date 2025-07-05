import { NetworkType } from '../../types';
export const defaultGasBudget = 10 ** 8; // 0.1 INITIA, should be enough for most of the transactions
export const defaultGasPrice = 1000; // 1000 MIST

/**
 * @description Get the default fullnode url for the given network type
 * @param networkType, 'testnet' | 'mainnet' | 'localnet', default is 'testnet'
 * @returns { rpc: string; rest: string; chainId: string }
 */
export const getDefaultURL = (
  networkType: NetworkType = 'testnet'
): { rpc: string; rest: string; chainId: string } => {
  switch (networkType) {
    case 'localnet':
      return {
        rpc: 'http://127.0.0.1:26657',
        rest: 'http://127.0.0.1:1317',
        chainId: 'local-initia',
      };
    case 'testnet':
      return {
        rpc: 'https://rpc.testnet.initia.xyz',
        rest: 'https://lcd.testnet.initia.xyz',
        chainId: 'initiation-2',
      };
    case 'mainnet':
      return {
        rpc: 'https://rpc.mainnet.initia.xyz',
        rest: 'https://lcd.mainnet.initia.xyz',
        chainId: 'initiation-1',
      };
    default:
      return {
        rpc: 'https://rpc.testnet.initia.xyz',
        rest: 'https://lcd.testnet.initia.xyz',
        chainId: 'initiation-2',
      };
  }
};
