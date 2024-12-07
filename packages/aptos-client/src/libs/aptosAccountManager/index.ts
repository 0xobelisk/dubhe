import {
  Account,
  AccountAddress,
  Ed25519PrivateKey,
  PrivateKey,
  PrivateKeyVariants,
} from '@aptos-labs/ts-sdk';
import { getKeyPair } from './keypair';
import { generateMnemonic } from './crypto';
import type { AccountMangerParams, DerivePathParams } from '../../types';

export class AptosAccountManager {
  private mnemonics: string;
  private secretKey: string;
  public currentKeyPair: Account;
  public currentAddress: AccountAddress;

  /**
   * Support the following ways to init the SuiToolkit:
   * 1. mnemonics
   * 2. secretKey (base64 or hex)
   * If none of them is provided, will generate a random mnemonics with 24 words.
   *
   * @param mnemonics, 12 or 24 mnemonics words, separated by space
   * @param secretKey, base64 or hex string, when mnemonics is provided, secretKey will be ignored
   */
  constructor({
    mnemonics,
    secretKey,
    signatureType,
  }: AccountMangerParams = {}) {
    // If the mnemonics or secretKey is provided, use it
    // Otherwise, generate a random mnemonics with 24 words
    this.mnemonics = mnemonics || '';
    this.secretKey = secretKey || '';
    if (!this.mnemonics && !this.secretKey) {
      this.mnemonics = generateMnemonic(24);
    }

    // Init the current account
    /**
     * {
     *    address: "0xe8012714cd17606cee7188a2a365eef3fe760be598750678c8c5954eb548a591",
     *    publicKeyHex: "0xf56d8524faf79fbc0f48c13aeed3b0ce5dd376b4db93b8130a107c0a5e04ba04",
     *    privateKeyHex: `0x009c9f7c992a06cfafe916f125d8adb7a395fca243e264a8e56a4b3e6accf940
     *      d2b11e9ece3049ce60e3c7b4a1c58aebfa9298e29a30a58a67f1998646135204`
     *  }
     */
    this.currentKeyPair = this.secretKey
      ? Account.fromPrivateKey({
          privateKey: new Ed25519PrivateKey(
            PrivateKey.formatPrivateKey(
              this.secretKey,
              signatureType ?? PrivateKeyVariants.Ed25519
            )
          ),
        })
      : getKeyPair(this.mnemonics);

    this.currentAddress = this.currentKeyPair.accountAddress;
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
  getAddress(derivePathParams?: DerivePathParams): AccountAddress {
    if (!derivePathParams || !this.mnemonics) return this.currentAddress;
    return getKeyPair(this.mnemonics, derivePathParams).accountAddress;
  }

  /**
   * Switch the current account with the given derivePathParams.
   * This is only useful when the mnemonics is provided. For secretKey mode, it will always use the same account.
   */
  switchAccount(derivePathParams: DerivePathParams) {
    if (this.mnemonics) {
      this.currentKeyPair = getKeyPair(this.mnemonics, derivePathParams);
      this.currentAddress = this.currentKeyPair.accountAddress;
    }
  }
}
