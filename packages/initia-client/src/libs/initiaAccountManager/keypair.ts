import { MnemonicKey } from '@initia/initia.js';
import type { DerivePathParams } from '../../types';

/**
 * @description Get derive path for ROOCH
 * @param derivePathParams
 */
export const getDerivePathForInitia = (derivePathParams: DerivePathParams = {}) => {
  const { accountIndex = 0, addressIndex = 0, coinType = 118, eth = false } = derivePathParams;
  return {
    account: accountIndex,
    index: addressIndex,
    coinType,
    eth
  };
};

/**
 * @description Get keypair from mnemonics and derive path
 * @param mnemonics
 * @param derivePathParams
 */
export const getKeyPair = (mnemonics: string, derivePathParams: DerivePathParams = {}) => {
  const derivePath = getDerivePathForInitia(derivePathParams);
  return new MnemonicKey({
    mnemonic: mnemonics,
    ...derivePath
  });
};
