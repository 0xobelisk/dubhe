import { RawKey, AccAddress } from '@initia/initia.js';
import { getKeyPair } from './keypair';
import { generateMnemonic } from './crypto';
import type { AccountMangerParams, DerivePathParams } from '../../types';

export class InitiaAccountManager {
  private mnemonics: string;
  private secretKey: string;
  public currentKeyPair: RawKey;
  public currentAddress: string;

  /**
   * Support the following ways to init the InitiaToolkit:
   * 1. mnemonics
   * 2. secretKey (base64 or hex)
   * If none of them is provided, will generate a random mnemonics with 24 words.
   *
   * @param mnemonics, 12 or 24 mnemonics words, separated by space
   * @param secretKey, base64 or hex string, when mnemonics is provided, secretKey will be ignored
   */
  constructor({ mnemonics, secretKey }: AccountMangerParams = {}) {
    // If the mnemonics or secretKey is provided, use it
    // Otherwise, generate a random mnemonics with 24 words
    this.mnemonics = mnemonics || '';
    this.secretKey = secretKey || '';
    if (!this.mnemonics && !this.secretKey) {
      this.mnemonics = generateMnemonic(24);
    }
    this.currentKeyPair = this.secretKey
      ? RawKey.fromHex(secretKey!)
      : getKeyPair(this.mnemonics);

    this.currentAddress = this.currentKeyPair.accAddress;
  }

  /**
   * if derivePathParams is not provided or mnemonics is empty, it will return the currentKeyPair.
   * else:
   * it will generate keyPair from the mnemonic with the given derivePathParams.
   */
  getKeyPair(derivePathParams?: DerivePathParams) {
    if (!derivePathParams || !this.mnemonics) return this.currentKeyPair;
    return getKeyPair(this.mnemonics, derivePathParams);
  }

  /**
   * if derivePathParams is not provided or mnemonics is empty, it will return the currentAddress.
   * else:
   * it will generate address from the mnemonic with the given derivePathParams.
   */
  getAddress(derivePathParams?: DerivePathParams): AccAddress {
    if (!derivePathParams || !this.mnemonics) return this.currentAddress;
    return getKeyPair(this.mnemonics, derivePathParams).accAddress;
  }

  /**
   * Switch the current account with the given derivePathParams.
   * This is only useful when the mnemonics is provided. For secretKey mode, it will always use the same account.
   */
  switchAccount(derivePathParams: DerivePathParams) {
    if (this.mnemonics) {
      this.currentKeyPair = getKeyPair(this.mnemonics, derivePathParams);
      this.currentAddress = this.currentKeyPair.accAddress;
    }
  }
}
