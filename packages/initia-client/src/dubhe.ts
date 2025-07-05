import {
  AccAddress,
  Coin,
  Coins,
  Key,
  Msg,
  MsgExecute,
  MsgPublish,
  WaitTxBroadcastResult,
  Wallet,
} from '@initia/initia.js';
import { InitiaAccountManager } from './libs/initiaAccountManager';
import { getDefaultURL, InitiaInteractor } from './libs/initiaInteractor';
import { InitiaContractFactory } from './libs/initiaContractFactory';
import {
  DubheParams,
  DerivePathParams,
  ContractQuery,
  ContractTx,
  MapModuleFuncQuery,
  MapModuleFuncTx,
  MoveModuleFuncType,
  MoveModule,
} from './types';
import { getKeyPair } from './libs/initiaAccountManager/keypair';
import { Alice } from './libs/initiaAccountManager/dev-account';

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
  fn: (params?: string[], typeArguments?: string[]) => Promise<any>
): ContractQuery {
  return withMeta(
    meta,
    async ({
      params,
      typeArguments,
    }: {
      params?: string[];
      typeArguments?: string[];
    } = {}): Promise<any> => {
      const result = await fn(params, typeArguments);
      return result;
    }
  );
}

function createTx(
  meta: MoveModuleFuncType,
  fn: (
    sender?: AccAddress | string,
    params?: string[],
    typeArguments?: string[],
    isRaw?: boolean
  ) => Promise<any>
): ContractTx {
  return withMeta(
    meta,
    async ({
      sender,
      params,
      typeArguments,
      isRaw,
    }: {
      sender?: AccAddress | string;
      params?: string[];
      typeArguments?: string[];
      isRaw?: boolean;
    } = {}): Promise<any> => {
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
  public accountManager: InitiaAccountManager;
  public initiaInteractor: InitiaInteractor;
  // public wallet: Wallet;
  public contractFactory: InitiaContractFactory;
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
    chainId,
    metadata,
  }: DubheParams = {}) {
    // Init the account manager
    this.accountManager = new InitiaAccountManager({ mnemonics, secretKey });
    // Init the rpc provider
    fullnodeUrls = fullnodeUrls || [
      getDefaultURL(networkType ?? 'mainnet').rest,
    ];
    chainId = chainId ?? getDefaultURL(networkType ?? 'mainnet').chainId;
    this.initiaInteractor = new InitiaInteractor(fullnodeUrls, chainId);
    this.packageId = packageId;
    if (metadata !== undefined) {
      this.metadata = metadata as MoveModule[];
      Object.values(metadata as MoveModule[]).forEach((metadataRes) => {
        let contractAddress = metadataRes.address;
        let moduleName = metadataRes.name;
        Object.values(metadataRes.exposed_functions).forEach((value) => {
          const meta: MoveModuleFuncType = {
            contractAddress,
            moduleName,
            funcName: value.name,
            isEntry: value.is_entry,
            typeParams: value.generic_type_params,
            params: value.params,
            return: value.return,
          };

          // if (value.is_view) {
          if (isUndefined(this.#query[moduleName])) {
            this.#query[moduleName] = {};
          }
          if (isUndefined(this.#query[moduleName][value.name])) {
            this.#query[moduleName][value.name] = createQuery(
              meta,
              (p, type_p) => this.#read(meta, p, type_p)
            );
          }
          // }

          // if (value.is_entry) {
          if (isUndefined(this.#tx[moduleName])) {
            this.#tx[moduleName] = {};
          }
          if (isUndefined(this.#tx[moduleName][value.name])) {
            this.#tx[moduleName][value.name] = createTx(
              meta,
              (s, p, type_p, isRaw) => this.#exec(meta, s, p, type_p, isRaw)
            );
          }
          // }
        });
      });
    }
    this.contractFactory = new InitiaContractFactory({
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
    sender?: AccAddress | string,
    params?: string[],
    typeArguments?: string[],
    isRaw?: boolean
  ) => {
    if (sender === undefined) {
      sender = this.accountManager.currentAddress;
    }

    const msgs = this.generateMoveCallPayload(
      sender,
      meta.contractAddress,
      meta.moduleName,
      meta.funcName,
      typeArguments,
      params
    );

    if (isRaw === true) {
      return msgs;
    }

    return await this.signAndSendTxnWithPayload([msgs], sender);
  };

  #read = async (
    meta: MoveModuleFuncType,
    params?: string[],
    typeArguments?: string[]
  ) => {
    return this.initiaInteractor.viewFunction(
      meta.contractAddress,
      meta.moduleName,
      meta.funcName,
      typeArguments,
      params
    );
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

  async signAndSendTxnWithPayload(
    payloads: MsgPublish[] | MsgExecute[],
    sender?: AccAddress | string,
    derivePathParams?: DerivePathParams
  ) {
    const signer = this.getSigner(derivePathParams);
    if (sender === undefined) {
      sender = signer.accAddress;
    }

    if (sender.toString().match(/^(0x)?[0-9a-fA-F]{40}$/)) {
      sender = AccAddress.fromHex(sender.toString());
    }

    if (sender) {
      payloads.forEach((p) => {
        p.sender = sender as AccAddress;
      });
    }

    return this.initiaInteractor.sendTxWithPayload(signer, payloads);
  }

  generateMoveCallPayload(
    sender: AccAddress,
    moduleAddress: AccAddress,
    moduleName: string,
    funcName: string,
    typeArguments?: string[],
    params?: string[]
  ): MsgExecute {
    return this.initiaInteractor.moveCall(
      sender,
      moduleAddress,
      moduleName,
      funcName,
      typeArguments,
      params
    );
  }

  /**
   * @description Get the address of the account for the given derivePathParams
   * @param derivePathParams, such as { accountIndex: 2, isExternal: false, addressIndex: 10 }, comply with the BIP44 standard
   */
  getAddress(derivePathParams?: DerivePathParams) {
    return this.accountManager.getAddress(derivePathParams);
  }

  getHexAddress(derivePathParams?: DerivePathParams) {
    return AccAddress.toHex(this.getAddress(derivePathParams));
  }

  currentAddress() {
    return this.accountManager.currentAddress;
  }

  client() {
    return this.initiaInteractor.currentClient;
  }

  getPackageId() {
    return this.contractFactory.packageId;
  }

  getMetadata(): MoveModule[] | undefined {
    return this.contractFactory.metadata;
  }

  async getChainId(): Promise<string> {
    return this.initiaInteractor.chainId;
  }

  async getBalances(accountAddress?: string) {
    if (accountAddress === undefined) {
      accountAddress = this.getAddress();
    }
    return this.initiaInteractor.balance(accountAddress);
  }

  async getBalance(accountAddress?: string, coinType?: string) {
    if (accountAddress === undefined) {
      accountAddress = this.getAddress();
    }
    if (coinType === undefined) {
      coinType = 'uinit';
    }

    const resource = await this.initiaInteractor.balanceByDenom(
      accountAddress,
      coinType
    );
    return resource;
  }

  async requestFaucet(
    address?: AccAddress | string,
    amount?: number,
    network?: 'testnet' | 'localnet',
    derivePathParams?: DerivePathParams
  ) {
    if (address === undefined) {
      address = this.accountManager.getAddress(derivePathParams);
    }

    if (amount === undefined) {
      amount = 10000000;
    }

    if (amount > 1000000000) {
      throw new Error('request amount is too large');
    }

    try {
      const faucetKeyPair = Alice();
      const networkInteractor = new InitiaInteractor(
        [getDefaultURL(network ?? 'localnet').rest],
        getDefaultURL(network ?? 'localnet').chainId
      );
      return await networkInteractor.transfer(
        faucetKeyPair,
        address,
        amount.toString() + 'uinit'
      );
    } catch (err) {
      console.warn(`Failed to request faucet: ${err}`);
      throw err;
    }
  }
}

// async signAndExecuteTransaction(
//   transaction: Transaction,
//   signer?: Secp256k1Keypair,
//   derivePathParams?: DerivePathParams
// ) {
//   if (signer === undefined) {
//     signer = this.getSigner(derivePathParams);
//   }

//   return this.roochInteractor.signAndExecuteTransaction(transaction, signer, {
//     withOutput: true,
//   });
// }

// async signAndSendTransaction(
//   tx: Transaction,
//   derivePathParams?: DerivePathParams
// ) {
//   const sender = this.getSigner(derivePathParams);
//   return this.signAndExecuteTransaction(tx, sender);
// }

// async createSession(
//   sessionArgs: {
//     appName: string;
//     appUrl: string;
//     scopes: string[];
//   },
//   signer?: Secp256k1Keypair,
//   derivePathParams?: DerivePathParams
// ) {
//   if (signer === undefined) {
//     signer = this.getSigner(derivePathParams);
//   }
//   return this.roochInteractor.createSession(sessionArgs, signer);
// }

// async moveCall(callParams: {
//   target: string;
//   params?: Args[];
//   typeArguments?: TypeTag[];
//   signer?: Secp256k1Keypair;
//   derivePathParams?: DerivePathParams;
// }) {
//   const {
//     target,
//     params = [],
//     typeArguments = [],
//     signer,
//     derivePathParams,
//   } = callParams;

//   const effectiveSigner = signer ?? this.getSigner(derivePathParams);
//   console.log('effectiveSigner', effectiveSigner.getRoochAddress().toStr());
//   const tx = new Transaction();
//   tx.callFunction({
//     target,
//     args: params,
//     typeArgs: typeArguments,
//   });
//   return this.signAndExecuteTransaction(
//     tx,
//     effectiveSigner,
//     derivePathParams
//   );
// }

// async publishPackage(callParams: {
//   packageBytes: Uint8Array;
//   signer?: Secp256k1Keypair;
//   derivePathParams?: DerivePathParams;
// }) {
//   const { packageBytes, signer, derivePathParams } = callParams;
//   return this.moveCall({
//     target: `0x2::module_store::publish_package_entry`,
//     params: [Args.vec('u8', Array.from(packageBytes))],
//     signer,
//     derivePathParams,
//   });
// }

// async getStates(params: GetStatesParams): Promise<ObjectStateView[]> {
//   return this.roochInteractor.getStates(params);
// }

// async listStates(params: ListStatesParams): Promise<PaginatedStateKVViews> {
//   return this.roochInteractor.listStates(params);
// }

// async getEvents(
//   input: GetEventsByEventHandleParams
// ): Promise<PaginatedEventViews> {
//   return this.roochInteractor.getEvents(input);
// }

// async transfer(
//   input: {
//     recipient: address;
//     amount: number | bigint;
//     coinType: TypeArgs;
//   },
//   signer?: Secp256k1Keypair,
//   derivePathParams?: DerivePathParams
// ): Promise<ExecuteTransactionResponseView> {
//   if (signer === undefined) {
//     signer = this.getSigner(derivePathParams);
//   }
//   return this.initiaInteractor.transfer({
//     ...input,
//     signer,
//   });
// }

// async transferObject(
//   input: {
//     recipient: address;
//     objectId: string;
//     objectType: TypeArgs;
//   },
//   signer?: Secp256k1Keypair,
//   derivePathParams?: DerivePathParams
// ): Promise<ExecuteTransactionResponseView> {
//   if (signer === undefined) {
//     signer = this.getSigner(derivePathParams);
//   }
//   return this.roochInteractor.transferObject({
//     ...input,
//     signer,
//   });
// }
