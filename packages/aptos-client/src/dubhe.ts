import {
  Network,
  HexInput,
  MoveValue,
  MoveModule,
  AccountAddressInput,
  InputGenerateTransactionPayloadData,
  InputGenerateTransactionOptions,
  AccountAuthenticator,
  SimpleTransaction,
  TypeArgument,
  EntryFunctionArgumentTypes,
  SimpleEntryFunctionArgumentTypes,
  MoveFunctionId,
  EntryFunctionABI,
  AnyRawTransaction,
  InputViewFunctionData,
  LedgerVersionArg,
  PendingTransactionResponse,
  WaitForTransactionOptions,
  ViewFunctionABI,
} from '@aptos-labs/ts-sdk';
import { AptosAccountManager } from './libs/aptosAccountManager';
// import { SuiTxBlock } from './libs/suiTxBuilder';
import { AptosInteractor, getDefaultURL } from './libs/aptosInteractor';
// import { SuiSharedObject, SuiOwnedObject } from './libs/suiModel';

import { AptosContractFactory } from './libs/aptosContractFactory';
import { MoveModuleFuncType } from './libs/aptosContractFactory/types';

import {
  DubheParams,
  DerivePathParams,
  ContractQuery,
  ContractTx,
  MapModuleFuncQuery,
  MapModuleFuncTx,
  NetworkType,
} from './types';
import { isValidNetworkType, NetworkConfig } from './libs/aptosInteractor';

export function isUndefined(value?: unknown): value is undefined {
  return value === undefined;
}

export function withMeta<T extends { meta: MoveModuleFuncType }>(
  meta: MoveModuleFuncType,
  creator: Omit<T, 'meta'>
): T {
  (creator as T).meta = meta;

  return creator as T;
}

function createQuery(
  meta: MoveModuleFuncType,
  fn: (
    params?: Array<
      EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
    >,
    typeArguments?: Array<TypeArgument>
  ) => Promise<MoveValue[]>
): ContractQuery {
  return withMeta(
    meta,
    async ({
      params,
      typeArguments,
    }: {
      params?: Array<
        EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
      >;
      typeArguments?: Array<TypeArgument>;
    } = {}): Promise<MoveValue[]> => {
      const result = await fn(params, typeArguments);
      return result;
    }
  );
}

function createTx(
  meta: MoveModuleFuncType,
  fn: (
    sender?: AccountAddressInput,
    params?: Array<
      EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
    >,
    typeArguments?: Array<TypeArgument>,
    isRaw?: boolean
  ) => Promise<PendingTransactionResponse | InputGenerateTransactionPayloadData>
): ContractTx {
  return withMeta(
    meta,
    async ({
      sender,
      params,
      typeArguments,
      isRaw,
    }: {
      sender?: AccountAddressInput;
      params?: Array<
        EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
      >;
      typeArguments?: Array<TypeArgument>;
      isRaw?: boolean;
    } = {}): Promise<
      PendingTransactionResponse | InputGenerateTransactionPayloadData
    > => {
      const result = await fn(sender, params, typeArguments, isRaw);
      return result;
    }
  );
}

/**
 * @class Dubhe
 * @description This class is used to aggregate the tools that used to interact with SUI network.
 */
export class Dubhe {
  public accountManager: AptosAccountManager;
  public aptosInteractor: AptosInteractor;
  public contractFactory: AptosContractFactory;
  public packageId: string | undefined;
  public metadata: MoveModule[] | undefined;

  readonly #query: MapModuleFuncQuery = {};
  readonly #tx: MapModuleFuncTx = {};
  /**
   * Support the following ways to init the DubheClient:
   * 1. mnemonics
   * 2. secretKey (base64 or hex)
   * If none of them is provided, will generate a random mnemonics with 24 words.
   *
   * @param mnemonics, 12 or 24 mnemonics words, separated by space
   * @param secretKey, base64 or hex string, when mnemonics is provided, secretKey will be ignored
   * @param networkType, 'testnet' | 'mainnet' | 'devnet' | 'localnet', default is 'devnet'
   * @param fullnodeUrl, the fullnode url, default is the preconfig fullnode url for the given network type
   * @param packageId
   */
  constructor({
    mnemonics,
    secretKey,
    networkType,
    fullnodeUrls,
    packageId,
    metadata,
    signatureType,
  }: DubheParams = {}) {
    if (networkType && !isValidNetworkType(networkType)) {
      throw new Error(
        `Invalid network type: ${networkType}. Valid values are: mainnet, testnet, devnet, localnet, movementmainnet, movementtestnet`
      );
    }
    // Init the account manager
    this.accountManager = new AptosAccountManager({
      mnemonics,
      secretKey,
      signatureType,
    });
    // Init the rpc provider
    fullnodeUrls = fullnodeUrls || [
      getDefaultURL(networkType ?? Network.TESTNET).fullNode,
    ];
    this.aptosInteractor = new AptosInteractor(
      fullnodeUrls,
      networkType ?? Network.TESTNET
    );

    this.packageId = packageId;
    if (metadata !== undefined) {
      this.metadata = metadata as MoveModule[];
      Object.values(metadata as MoveModule[]).forEach((metadataRes) => {
        const contractAddress = metadataRes.address;
        const moduleName = metadataRes.name;
        Object.values(metadataRes.exposed_functions).forEach((value) => {
          const meta: MoveModuleFuncType = {
            contractAddress,
            moduleName,
            funcName: value.name,
            visibility: value.visibility,
            isEntry: value.is_entry,
            isView: value.is_view,
            typeParameters: value.generic_type_params,
            parameters: value.params,
            return: value.return,
          };

          if (value.is_view) {
            if (isUndefined(this.#query[moduleName])) {
              this.#query[moduleName] = {};
            }
            if (isUndefined(this.#query[moduleName][value.name])) {
              this.#query[moduleName][value.name] = createQuery(
                meta,
                (params, typeArguments) =>
                  this.#read(meta, params, typeArguments)
              );
            }
          }

          if (value.is_entry) {
            if (isUndefined(this.#tx[moduleName])) {
              this.#tx[moduleName] = {};
            }
            if (isUndefined(this.#tx[moduleName][value.name])) {
              this.#tx[moduleName][value.name] = createTx(
                meta,
                (sender, params, typeArguments, isRaw) =>
                  this.#exec(meta, sender, params, typeArguments, isRaw)
              );
            }
          }
        });
      });
    }
    this.contractFactory = new AptosContractFactory({
      packageId,
      metadata,
    });
  }

  public get query(): MapModuleFuncQuery {
    return this.#query;
  }

  public get tx(): MapModuleFuncTx {
    return this.#tx;
  }

  #exec = async (
    meta: MoveModuleFuncType,
    sender?: AccountAddressInput,
    params?: Array<
      EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
    >,
    typeArguments?: Array<TypeArgument>,
    isRaw?: boolean
  ) => {
    if (typeArguments === undefined) {
      typeArguments = [];
    }

    if (params === undefined) {
      params = [];
    }

    const payload = await this.generateTransactionPayload({
      target: `${this.contractFactory.packageId}::${meta.moduleName}::${meta.funcName}`,
      typeArguments,
      params,
    });

    if (isRaw === true) {
      return payload;
    }
    return await this.signAndSendTxnWithPayload({
      payload,
      sender,
    });
  };

  #read = async (
    meta: MoveModuleFuncType,
    params?: Array<
      EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
    >,
    typeArguments?: Array<TypeArgument>
  ) => {
    // if (typeArguments === undefined) {
    //   typeArguments = [];
    // }

    if (params === undefined) {
      params = [];
    }

    const result = await this.viewFunction({
      contractAddress: this.contractFactory.packageId,
      moduleName: meta.moduleName,
      funcName: meta.funcName,
      params,
      typeArguments,
    });
    return result;
  };

  /**
   * if derivePathParams is not provided or mnemonics is empty, it will return the currentSigner.
   * else:
   * it will generate signer from the mnemonic with the given derivePathParams.
   * @param derivePathParams, such as { accountIndex: 2, isExternal: false, addressIndex: 10 }, comply with the BIP44 standard
   */
  getSigner(derivePathParams?: DerivePathParams) {
    const keyPair = this.accountManager.getKeyPair(derivePathParams);
    return keyPair;
  }

  /**
   * @description Switch the current account with the given derivePathParams
   * @param derivePathParams, such as { accountIndex: 2, isExternal: false, addressIndex: 10 }, comply with the BIP44 standard
   */
  switchAccount(derivePathParams: DerivePathParams) {
    this.accountManager.switchAccount(derivePathParams);
  }

  /**
   * @description Get the address of the account for the given derivePathParams
   * @param derivePathParams, such as { accountIndex: 2, isExternal: false, addressIndex: 10 }, comply with the BIP44 standard
   */
  getAddress(derivePathParams?: DerivePathParams) {
    return this.accountManager.getAddress(derivePathParams);
  }

  currentAddress() {
    return this.accountManager.currentAddress;
  }

  client() {
    return this.aptosInteractor.currentClient;
  }

  getPackageId() {
    return this.contractFactory.packageId;
  }

  getMetadata(): MoveModule[] | undefined {
    return this.contractFactory.metadata;
  }

  getNetworkType(): NetworkType {
    return this.aptosInteractor.network;
  }

  getNetworkConfig(): NetworkConfig {
    return getDefaultURL(this.aptosInteractor.network);
  }

  getTxExplorerUrl(txHash: string) {
    return this.getNetworkConfig().txExplorer.replace(':txHash', txHash);
  }

  getAccountExplorerUrl(address: string) {
    return this.getNetworkConfig().accountExplorer.replace(':address', address);
  }

  getExplorerUrl() {
    return this.getNetworkConfig().explorer;
  }

  /**
   * Request some APT from faucet
   * @Returns {Promise<boolean>}, true if the request is successful, false otherwise.
   */
  async requestFaucet(accountAddress?: AccountAddressInput, amount?: number) {
    if (accountAddress === undefined) {
      accountAddress = this.getAddress();
    }
    if (amount === undefined) {
      amount = 50000000;
    }
    let options: WaitForTransactionOptions | undefined;
    if (this.aptosInteractor.network === 'localnet') {
      options = {
        checkSuccess: false,
        waitForIndexer: false,
      };
    }
    return this.aptosInteractor.requestFaucet(accountAddress, amount, options);
  }

  async getBalance(
    accountAddress?: AccountAddressInput,
    coinType?: string
  ): Promise<string | number> {
    try {
      if (accountAddress === undefined) {
        accountAddress = this.getAddress();
      }
      if (coinType === undefined) {
        coinType = '0x1::aptos_coin::AptosCoin';
      } // tx.xx.xx(undef, undef, true)

      const resource = await this.aptosInteractor.getAccountResource(
        accountAddress,
        `0x1::coin::CoinStore<${coinType}>`
      );
      return parseInt((resource as any)['coin']['value']);
    } catch (_) {
      return 0;
    }
  }

  async signAndSendTxnWithPayload({
    payload,
    sender,
    derivePathParams,
    options,
    withFeePayer,
    feePayerAuthenticator,
  }: {
    payload: InputGenerateTransactionPayloadData;
    sender?: AccountAddressInput;
    derivePathParams?: DerivePathParams;
    options?: InputGenerateTransactionOptions;
    withFeePayer?: boolean;
    feePayerAuthenticator?: AccountAuthenticator;
  }): Promise<PendingTransactionResponse> {
    const signer = this.getSigner(derivePathParams);
    if (sender === undefined) {
      sender = signer.accountAddress;
    }

    return this.aptosInteractor.sendTxWithPayload(
      signer,
      sender,
      payload,
      options,
      withFeePayer,
      feePayerAuthenticator
    );
  }

  async generateTransactionPayload({
    target,
    typeArguments,
    params,
    abi,
  }: {
    target: MoveFunctionId;
    typeArguments?: Array<TypeArgument>;
    params: Array<
      EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
    >;
    abi?: EntryFunctionABI;
  }): Promise<InputGenerateTransactionPayloadData> {
    const payload: InputGenerateTransactionPayloadData = {
      function: target, // `${contractAddress}::${moduleName}::${funcName}`
      typeArguments,
      functionArguments: params,
    };

    if (abi && Object.keys(abi).length > 0) {
      (payload as any).abi = abi;
    }

    return payload;
  }
  async generateViewPayload({
    target,
    params,
    typeArguments,
    abi,
  }: {
    target: MoveFunctionId;
    params: Array<
      EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
    >;
    typeArguments?: Array<TypeArgument>;
    abi?: ViewFunctionABI;
  }): Promise<InputViewFunctionData> {
    const payload: InputViewFunctionData = {
      function: target,
      typeArguments,
      functionArguments: params,
    };

    if (abi && Object.keys(abi).length > 0) {
      (payload as any).abi = abi;
    }

    return payload;
  }

  async buildTransaction({
    sender,
    contractAddress,
    moduleName,
    funcName,
    typeArguments,
    params,
    options,
    withFeePayer,
  }: {
    sender: AccountAddressInput;
    contractAddress: string;
    moduleName: string;
    funcName: string;
    typeArguments: Array<TypeArgument>;
    params: Array<
      EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
    >;
    options?: InputGenerateTransactionOptions;
    withFeePayer?: boolean;
  }): Promise<SimpleTransaction> {
    const rawTxn = await this.aptosInteractor.buildTransaction({
      sender,
      data: {
        function: `${contractAddress}::${moduleName}::${funcName}`,
        typeArguments: typeArguments,
        functionArguments: params,
      },
      options,
      withFeePayer,
    });
    return rawTxn;
  }

  async waitForTransaction(
    transactionHash: string,
    options?: WaitForTransactionOptions
  ) {
    return this.aptosInteractor.waitForTransaction(transactionHash, options);
  }

  async signAndSubmitTransaction(
    transaction: AnyRawTransaction,
    derivePathParams?: DerivePathParams
  ) {
    const sender = this.getSigner(derivePathParams);
    return this.aptosInteractor.signAndSubmitTransaction({
      sender,
      transaction,
    });
  }

  async viewFunction({
    contractAddress,
    moduleName,
    funcName,
    params,
    typeArguments,
    options,
  }: {
    contractAddress: string;
    moduleName: string;
    funcName: string;
    params: Array<
      EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
    >;
    typeArguments?: Array<TypeArgument>;
    options?: LedgerVersionArg;
  }) {
    const payload: InputViewFunctionData = await this.generateViewPayload({
      target: `${contractAddress}::${moduleName}::${funcName}`,
      typeArguments,
      params,
    });
    return await this.aptosInteractor.view({
      payload,
      options,
    });
  }

  async moveCall({
    sender,
    contractAddress,
    moduleName,
    funcName,
    typeArguments,
    params,
    derivePathParams,
    options,
    withFeePayer,
    feePayerAuthenticator,
  }: {
    sender: AccountAddressInput;
    contractAddress: string;
    moduleName: string;
    funcName: string;
    typeArguments?: Array<TypeArgument>;
    params: Array<
      EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
    >;
    derivePathParams?: DerivePathParams;
    options?: InputGenerateTransactionOptions;
    withFeePayer?: boolean;
    feePayerAuthenticator?: AccountAuthenticator;
  }) {
    const payload = await this.generateTransactionPayload({
      target: `${contractAddress}::${moduleName}::${funcName}`,
      typeArguments,
      params,
    });
    return this.signAndSendTxnWithPayload({
      payload,
      sender,
      derivePathParams,
      options,
      withFeePayer,
      feePayerAuthenticator,
    });
  }

  async publishPackageTransaction(
    account: AccountAddressInput,
    metadataBytes: HexInput,
    moduleBytecode: HexInput[],
    options?: InputGenerateTransactionOptions
  ) {
    return this.aptosInteractor.publishPackageTransaction({
      account,
      metadataBytes,
      moduleBytecode,
      options,
    });
  }
}
