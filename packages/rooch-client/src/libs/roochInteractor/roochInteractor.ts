import {
  Args,
  Bytes,
  CallFunctionArgs,
  ModuleABIView,
  RoochClient,
  Secp256k1Keypair,
  Transaction,
  TypeArgs,
  TypeTag,
  NetworkType,
  GetStatesParams,
  ObjectStateView,
  ListStatesParams,
  PaginatedStateKVViews,
  ExecuteTransactionResponseView,
  address,
  GetEventsByEventHandleParams,
  PaginatedEventViews
} from '@roochnetwork/rooch-sdk';
import { delay } from './util';

/**
 * `RoochTransaction` is used to send transaction with a given gas coin.
 * It always uses the gas coin to pay for the gas,
 * and update the gas coin after the transaction.
 */
export class RoochInteractor {
  public readonly clients: RoochClient[];
  public currentClient: RoochClient;
  public readonly fullNodes: string[];
  public currentFullNode: string;
  public network?: NetworkType;

  constructor(fullNodeUrls: string[], network?: NetworkType) {
    if (fullNodeUrls.length === 0) throw new Error('fullNodeUrls must not be empty');
    this.clients = fullNodeUrls.map((url) => new RoochClient({ url }));
    this.currentClient = this.clients[0];
    this.fullNodes = fullNodeUrls;
    this.currentFullNode = fullNodeUrls[0];

    this.network = network;
  }

  switchToNextProvider() {
    const currentClientIdx = this.clients.indexOf(this.currentClient);
    this.currentClient = this.clients[(currentClientIdx + 1) % this.clients.length];
    this.currentFullNode = this.fullNodes[(currentClientIdx + 1) % this.clients.length];
  }

  async createSession(
    sessionArgs: {
      appName: string;
      appUrl: string;
      scopes: string[];
    },
    signer: Secp256k1Keypair
  ) {
    for (const client of this.clients) {
      try {
        const session = await client.createSession({
          sessionArgs,
          signer
        });
        return session;
      } catch (err) {
        console.warn(`Failed to create session: ${err}`);
        await delay(2000);
      }
    }
    throw new Error('Failed to create session with all fullnodes');
  }

  async signAndExecuteTransaction(
    transaction: Transaction | Bytes,
    signer: Secp256k1Keypair,
    option: {
      withOutput: boolean;
    }
  ): Promise<any> {
    for (const client of this.clients) {
      try {
        const txnResponse = await client.signAndExecuteTransaction({
          transaction,
          signer,
          option
        });
        return txnResponse;
      } catch (err) {
        console.warn(`Failed to send transaction: ${err}`);
        await delay(2000);
      }
    }
    throw new Error('Failed to send transaction with all fullnodes');
  }

  async executeViewFunction(
    contractAddress: string,
    moduleName: string,
    funcName: string,
    typeArguments: TypeTag[] = [],
    args: Args[] = []
  ) {
    for (const client of this.clients) {
      try {
        const input: CallFunctionArgs = {
          address: contractAddress,
          module: moduleName,
          function: funcName,
          typeArgs: typeArguments,
          args
        };
        const result = await client.executeViewFunction(input);
        return result;
      } catch (err) {
        await delay(2000);
        console.warn(`Failed to execute view function: ${err}`);
      }
    }
    throw new Error('Failed to execute view function with all fullnodes');
  }

  async getModuleAbi(accountAddress: string, moduleName: string): Promise<ModuleABIView> {
    for (const client of this.clients) {
      try {
        const result = await client.getModuleAbi({
          moduleAddr: accountAddress,
          moduleName
        });
        return result;
      } catch (err) {
        await delay(2000);
        console.warn(`Failed to get ModuleAbi ${accountAddress} ${moduleName}: ${err}`);
      }
    }
    throw new Error(`Failed to get ModuleAbi ${accountAddress} ${moduleName} with all fullnodes`);
  }

  async getModuleAbis(accountAddress: string, modules: string[]): Promise<ModuleABIView[]> {
    for (const client of this.clients) {
      try {
        const result: ModuleABIView[] = [];
        for (const moduleName of modules) {
          const moduleAbi = await client.getModuleAbi({
            moduleAddr: accountAddress,
            moduleName
          });
          result.push(moduleAbi);
        }
        return result;
      } catch (err) {
        await delay(2000);
        console.warn(`Failed to get ModuleAbi ${accountAddress} ${modules.join(',')}: ${err}`);
      }
    }
    throw new Error(
      `Failed to get ModuleAbi ${accountAddress} ${modules.join(',')} with all fullnodes`
    );
  }

  async getBalance(address: string, coinType: string) {
    for (const client of this.clients) {
      try {
        const result = await client.getBalance({
          owner: address,
          coinType
        });
        return result;
      } catch (err) {
        await delay(2000);
        console.warn(`Failed to get balance: ${err}`);
      }
    }
    throw new Error(`Failed to get balance with all fullnodes`);
  }

  async getRpcApiVersion(): Promise<string | undefined> {
    for (const client of this.clients) {
      try {
        const result = await client.getRpcApiVersion();
        return result;
      } catch (err) {
        await delay(2000);
        console.warn(`Failed to get RPC API version: ${err}`);
      }
    }
    throw new Error('Failed to get RPC API version with all fullnodes');
  }

  async getChainId(): Promise<bigint> {
    for (const client of this.clients) {
      try {
        const result = await client.getChainId();
        return result;
      } catch (err) {
        await delay(2000);
        console.warn(`Failed to get chain ID: ${err}`);
      }
    }
    throw new Error('Failed to get chain ID with all fullnodes');
  }

  async getStates(params: GetStatesParams): Promise<ObjectStateView[]> {
    for (const client of this.clients) {
      try {
        const result = await client.getStates(params);
        return result;
      } catch (err) {
        await delay(2000);
        console.warn(`Failed to get states: ${err}`);
      }
    }
    throw new Error('Failed to get states with all fullnodes');
  }

  async listStates(params: ListStatesParams): Promise<PaginatedStateKVViews> {
    for (const client of this.clients) {
      try {
        const result = await client.listStates(params);
        return result;
      } catch (err) {
        await delay(2000);
        console.warn(`Failed to list states: ${err}`);
      }
    }
    throw new Error('Failed to list states with all fullnodes');
  }

  async getEvents(input: GetEventsByEventHandleParams): Promise<PaginatedEventViews> {
    for (const client of this.clients) {
      try {
        const result = await client.getEvents(input);
        return result;
      } catch (err) {
        await delay(2000);
        console.warn(`Failed to get events: ${err}`);
      }
    }
    throw new Error('Failed to get events with all fullnodes');
  }

  async transfer(input: {
    signer: Secp256k1Keypair;
    recipient: address;
    amount: number | bigint;
    coinType: TypeArgs;
  }): Promise<ExecuteTransactionResponseView> {
    for (const client of this.clients) {
      try {
        const result = await client.transfer(input);
        return result;
      } catch (err) {
        await delay(2000);
        console.warn(`Failed to transfer: ${err}`);
      }
    }
    throw new Error('Failed to transfer with all fullnodes');
  }

  async transferObject(input: {
    signer: Secp256k1Keypair;
    recipient: address;
    objectId: string;
    objectType: TypeArgs;
  }): Promise<ExecuteTransactionResponseView> {
    for (const client of this.clients) {
      try {
        const result = await client.transferObject(input);
        return result;
      } catch (err) {
        await delay(2000);
        console.warn(`Failed to transfer object: ${err}`);
      }
    }
    throw new Error('Failed to transfer object with all fullnodes');
  }
}
