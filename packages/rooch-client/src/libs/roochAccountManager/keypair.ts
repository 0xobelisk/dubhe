import { Secp256k1Keypair } from '@roochnetwork/rooch-sdk';
import type { DerivePathParams } from '../../types';

/**
 * @description Get derive path for ROOCH
 * @param derivePathParams
 */
export const getDerivePathForROOCH = (
  derivePathParams: DerivePathParams = {}
) => {
  const {
    accountIndex = 0,
    isExternal = false,
    addressIndex = 0,
  } = derivePathParams;
  return `m/54'/784'/${accountIndex}'/${isExternal ? 1 : 0}'/${addressIndex}'`;
};

/**
 * @description Get keypair from mnemonics and derive path
 * @param mnemonics
 * @param derivePathParams
 */
export const getKeyPair = (
  mnemonics: string,
  derivePathParams: DerivePathParams = {}
) => {
  const derivePath = getDerivePathForROOCH(derivePathParams);
  return Secp256k1Keypair.deriveKeypair(mnemonics, derivePath);
};
