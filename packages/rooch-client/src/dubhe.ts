import {
  getRoochNodeUrl,
  Args,
  TypeTag,
  AnnotatedFunctionResultView,
  Secp256k1Keypair,
  ExecuteTransactionResponseView,
  ModuleABIView,
  BalanceInfoView,
  Transaction,
  GetStatesParams,
  ObjectStateView,
  ListStatesParams,
  PaginatedStateKVViews,
  GetEventsByEventHandleParams,
  PaginatedEventViews,
  address,
  TypeArgs
} from '@roochnetwork/rooch-sdk';
import { RoochAccountManager } from './libs/roochAccountManager';
import { RoochInteractor } from './libs/roochInteractor';
import { RoochContractFactory } from './libs/roochContractFactory';
import {
  DubheParams,
  DerivePathParams,
  ContractQuery,
  ContractTx,
  MapModuleFuncQuery,
  MapModuleFuncTx,
  MoveModuleFuncType
} from './types';

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
  fn: (params?: Args[], typeArguments?: TypeTag[]) => Promise<AnnotatedFunctionResultView>
): ContractQuery {
  return withMeta(
    meta,
    async ({
      params,
      typeArguments
    }: {
      params?: Args[];
      typeArguments?: TypeTag[];
    } = {}): Promise<AnnotatedFunctionResultView> => {
      const result = await fn(params, typeArguments);
      return result;
    }
  );
}

function createTx(
  meta: MoveModuleFuncType,
  fn: (
    tx: Transaction,
    signer?: Secp256k1Keypair,
    params?: Args[],
    typeArguments?: TypeTag[],
    isRaw?: boolean
  ) => Promise<ExecuteTransactionResponseView>
): ContractTx {
  return withMeta(
    meta,
    async ({
      tx,
      signer,
      params,
      typeArguments,
      isRaw
    }: {
      tx: Transaction;
      signer?: Secp256k1Keypair;
      params?: Args[];
      typeArguments?: TypeTag[];
      isRaw?: boolean;
    }): Promise<ExecuteTransactionResponseView> => {
      // const result = await fn(signer, params, typeArguments, isRaw);
      const result = await fn(tx, signer, params, typeArguments, isRaw);
      return result;
    }
  );
}

/**
 * @class Dubhe
 * @description This class is used to aggregate the tools that used to interact with SUI network.
 */
export class Dubhe {
  public accountManager: RoochAccountManager;
  public roochInteractor: RoochInteractor;
  public contractFactory: RoochContractFactory;
  public packageId: string | undefined;
  public metadata: ModuleABIView[] | undefined;

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
    metadata
  }: DubheParams = {}) {
    // Init the account manager
    this.accountManager = new RoochAccountManager({ mnemonics, secretKey });
    // Init the rpc provider
    fullnodeUrls = fullnodeUrls || [getRoochNodeUrl(networkType ?? 'mainnet')];
    this.roochInteractor = new RoochInteractor(fullnodeUrls);

    this.packageId = packageId;
    if (metadata !== undefined) {
      this.metadata = metadata as ModuleABIView[];
      Object.values(metadata as ModuleABIView[]).forEach((metadataRes) => {
        const contractAddress = metadataRes.address;
        const moduleName = metadataRes.name;
        Object.values(metadataRes.functions).forEach((value) => {
          const meta: MoveModuleFuncType = {
            contractAddress,
            moduleName,
            funcName: value.name,
            isEntry: value.is_entry,
            typeParams: value.type_params,
            params: value.params,
            return: value.return
          };

          // if (value.is_view) {
          if (isUndefined(this.#query[moduleName])) {
            this.#query[moduleName] = {};
          }
          if (isUndefined(this.#query[moduleName][value.name])) {
            this.#query[moduleName][value.name] = createQuery(meta, (p, type_p) =>
              this.#read(meta, p, type_p)
            );
          }
          // }

          // if (value.is_entry) {
          if (isUndefined(this.#tx[moduleName])) {
            this.#tx[moduleName] = {};
          }
          if (isUndefined(this.#tx[moduleName][value.name])) {
            this.#tx[moduleName][value.name] = createTx(meta, (tx, s, p, type_p, isRaw) =>
              this.#exec(meta, tx, s, p, type_p, isRaw)
            );
          }
          // }
        });
      });
    }
    this.contractFactory = new RoochContractFactory({
      packageId,
      metadata
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
    tx: Transaction,
    signer?: Secp256k1Keypair,
    params?: Args[],
    typeArguments?: TypeTag[],
    isRaw?: boolean
  ) => {
    if (isRaw === true) {
      return tx.callFunction({
        target: `${this.contractFactory.packageId}::${meta.moduleName}::${meta.funcName}`,
        args: params,
        typeArgs: typeArguments
      });
    }

    tx.callFunction({
      target: `${this.contractFactory.packageId}::${meta.moduleName}::${meta.funcName}`,
      args: params,
      typeArgs: typeArguments
    });
    return await this.signAndExecuteTransaction(tx, signer);
  };

  #read = async (meta: MoveModuleFuncType, params?: Args[], typeArguments?: TypeTag[]) => {
    return this.roochInteractor.executeViewFunction(
      meta.contractAddress,
      meta.moduleName,
      meta.funcName,
      typeArguments,
      params
    );
  };

  /**
   * if derivePathParams is not provided or mnemonics is empty, it will return the keypair.
   * else:
   * it will generate signer from the mnemonic with the given derivePathParams.
   * @param derivePathParams, such as { accountIndex: 2, isExternal: false, addressIndex: 10 }, comply with the BIP44 standard
   */
  getKeypair(derivePathParams?: DerivePathParams) {
    return this.accountManager.getKeyPair(derivePathParams);
  }

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
  getBech32Address(derivePathParams?: DerivePathParams) {
    return this.accountManager.getAddress(derivePathParams).toBech32Address();
  }

  getRoochAddress(derivePathParams?: DerivePathParams) {
    return this.accountManager.getAddress(derivePathParams);
  }

  getHexAddress(derivePathParams?: DerivePathParams) {
    return this.accountManager.getAddress(derivePathParams).toHexAddress();
  }

  getBitcoinAddress(derivePathParams?: DerivePathParams) {
    return this.accountManager.getBitcoinAddress(derivePathParams);
  }

  currentAddress() {
    return this.accountManager.currentAddress;
  }

  client() {
    return this.roochInteractor.currentClient;
  }

  getPackageId() {
    return this.contractFactory.packageId;
  }

  getMetadata(): ModuleABIView[] | undefined {
    return this.contractFactory.metadata;
  }

  getNetwork() {
    return this.roochInteractor.network;
  }

  getFullNodeUrl() {
    return this.roochInteractor.currentFullNode;
  }

  async getRpcApiVersion(): Promise<string | undefined> {
    return this.roochInteractor.getRpcApiVersion();
  }

  async getChainId(): Promise<bigint> {
    return this.roochInteractor.getChainId();
  }

  async getBalance(
    accountAddress?: string,
    coinType?: string,
    outputOnly?: boolean
  ): Promise<BalanceInfoView | string> {
    try {
      if (accountAddress === undefined) {
        accountAddress = this.getBech32Address();
      }
      if (coinType === undefined) {
        coinType = '0x3::gas_coin::RGas';
      }

      const resource = await this.roochInteractor.getBalance(accountAddress, coinType);

      return outputOnly ? resource : resource.balance;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Failed to get ${coinType} balance for address ${accountAddress}: ${errorMessage}`
      );
    }
  }

  async signAndExecuteTransaction(
    transaction: Transaction,
    signer?: Secp256k1Keypair,
    derivePathParams?: DerivePathParams
  ) {
    if (signer === undefined) {
      signer = this.getSigner(derivePathParams);
    }

    return this.roochInteractor.signAndExecuteTransaction(transaction, signer, {
      withOutput: true
    });
  }

  async signAndSendTransaction(tx: Transaction, derivePathParams?: DerivePathParams) {
    const sender = this.getSigner(derivePathParams);
    return this.signAndExecuteTransaction(tx, sender);
  }

  async createSession(
    sessionArgs: {
      appName: string;
      appUrl: string;
      scopes: string[];
    },
    signer?: Secp256k1Keypair,
    derivePathParams?: DerivePathParams
  ) {
    if (signer === undefined) {
      signer = this.getSigner(derivePathParams);
    }
    return this.roochInteractor.createSession(sessionArgs, signer);
  }

  async moveCall(callParams: {
    target: string;
    params?: Args[];
    typeArguments?: TypeTag[];
    signer?: Secp256k1Keypair;
    derivePathParams?: DerivePathParams;
  }) {
    const { target, params = [], typeArguments = [], signer, derivePathParams } = callParams;

    const effectiveSigner = signer ?? this.getSigner(derivePathParams);
    console.log('effectiveSigner', effectiveSigner.getRoochAddress().toStr());
    const tx = new Transaction();
    tx.callFunction({
      target,
      args: params,
      typeArgs: typeArguments
    });
    return this.signAndExecuteTransaction(tx, effectiveSigner, derivePathParams);
  }

  async publishPackage(callParams: {
    packageBytes: Uint8Array;
    signer?: Secp256k1Keypair;
    derivePathParams?: DerivePathParams;
  }) {
    const { packageBytes, signer, derivePathParams } = callParams;
    return this.moveCall({
      target: `0x2::module_store::publish_package_entry`,
      params: [Args.vec('u8', Array.from(packageBytes))],
      signer,
      derivePathParams
    });
  }

  async getStates(params: GetStatesParams): Promise<ObjectStateView[]> {
    return this.roochInteractor.getStates(params);
  }

  async listStates(params: ListStatesParams): Promise<PaginatedStateKVViews> {
    return this.roochInteractor.listStates(params);
  }

  async getEvents(input: GetEventsByEventHandleParams): Promise<PaginatedEventViews> {
    return this.roochInteractor.getEvents(input);
  }

  async transfer(
    input: {
      recipient: address;
      amount: number | bigint;
      coinType: TypeArgs;
    },
    signer?: Secp256k1Keypair,
    derivePathParams?: DerivePathParams
  ): Promise<ExecuteTransactionResponseView> {
    if (signer === undefined) {
      signer = this.getSigner(derivePathParams);
    }
    return this.roochInteractor.transfer({
      ...input,
      signer
    });
  }

  async transferObject(
    input: {
      recipient: address;
      objectId: string;
      objectType: TypeArgs;
    },
    signer?: Secp256k1Keypair,
    derivePathParams?: DerivePathParams
  ): Promise<ExecuteTransactionResponseView> {
    if (signer === undefined) {
      signer = this.getSigner(derivePathParams);
    }
    return this.roochInteractor.transferObject({
      ...input,
      signer
    });
  }
}
