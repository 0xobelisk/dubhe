import {
  LCDClient,
  PaginationOptions,
  APIParams,
  Module,
  Pagination,
  MsgExecute,
  AccAddress,
  Key,
  Wallet,
  Tx,
  SyncTxBroadcastResult,
  Coins,
  Coin,
  MsgSend,
  Msg
} from '@initia/initia.js';
import { delay } from './util';
import { NetworkType } from '../../types';

/**
 * `SuiTransactionSender` is used to send transaction with a given gas coin.
 * It always uses the gas coin to pay for the gas,
 * and update the gas coin after the transaction.
 */
export class InitiaInteractor {
  public readonly clients: LCDClient[];
  public currentClient: LCDClient;
  public readonly fullNodes: string[];
  public currentFullNode: string;
  public chainId: string;
  public network?: NetworkType;

  constructor(fullNodeUrls: string[], chainId: string) {
    if (fullNodeUrls.length === 0) throw new Error('fullNodeUrls must not be empty');
    this.clients = fullNodeUrls.map(
      (url) =>
        new LCDClient(url, {
          chainId,
          gasPrices: '0.15uinit', // default gas prices
          gasAdjustment: '2.0' // default gas adjustment for fee estimation
        })
    );
    this.currentClient = this.clients[0];
    this.fullNodes = fullNodeUrls;
    this.currentFullNode = fullNodeUrls[0];
    this.chainId = chainId;
  }

  switchToNextClient() {
    const currentClientIdx = this.clients.indexOf(this.currentClient);
    this.currentClient = this.clients[(currentClientIdx + 1) % this.clients.length];
    this.currentFullNode = this.fullNodes[(currentClientIdx + 1) % this.clients.length];
  }

  async getModules(
    address: string,
    params?: Partial<PaginationOptions & APIParams>
  ): Promise<[Module[], Pagination]> {
    for (const client of this.clients) {
      try {
        const modules = await client.move.modules(address, params);
        return modules;
      } catch (err) {
        console.warn(`Failed to get modules: ${err}`);
        await delay(2000);
      }
    }
    throw new Error('Failed to get modules with all fullnodes');
  }

  async viewFunction(
    address: string,
    moduleName: string,
    funcName: string,
    typeArguments?: string[],
    params?: string[]
  ): Promise<any> {
    for (const client of this.clients) {
      try {
        const result = await client.move.viewFunction(
          address,
          moduleName,
          funcName,
          typeArguments,
          params
        );
        return result;
      } catch (err) {
        console.warn(`Failed to view function: ${err}`);
        await delay(2000);
      }
    }
    throw new Error('Failed to view function with all fullnodes');
  }

  moveCall(
    sender: AccAddress,
    moduleAddress: AccAddress,
    moduleName: string,
    funcName: string,
    typeArguments?: string[],
    params?: string[]
  ): MsgExecute {
    return new MsgExecute(sender, moduleAddress, moduleName, funcName, typeArguments, params);
  }

  async createAndSignTx(sender: Key, msgs: MsgExecute[]): Promise<Tx> {
    for (const client of this.clients) {
      try {
        const wallet = new Wallet(client, sender);
        const tx = await wallet.createAndSignTx({ msgs });
        return tx;
      } catch (err) {
        console.warn(`Failed to create and sign tx: ${err}`);
        await delay(2000);
      }
    }
    throw new Error('Failed to create and sign tx with all fullnodes');
  }

  async broadcastSyncTx(tx: Tx): Promise<SyncTxBroadcastResult> {
    for (const client of this.clients) {
      try {
        const result = await client.tx.broadcastSync(tx);
        return result;
      } catch (err) {
        console.warn(`Failed to broadcast tx: ${err}`);
        await delay(2000);
      }
    }
    throw new Error('Failed to broadcast tx with all fullnodes');
  }

  async sendTxWithPayload(signer: Key, payload: Msg[]): Promise<SyncTxBroadcastResult> {
    for (const client of this.clients) {
      try {
        const wallet = new Wallet(client, signer);
        if (!AccAddress.validate(signer.accAddress)) {
          throw new Error(`Invalid signer address: ${signer.accAddress}`);
        }

        const tx = await wallet.createAndSignTx({ msgs: payload });
        const result = await client.tx.broadcast(tx);
        return result;
      } catch (err: any) {
        console.warn(`Failed to send transaction with fullnode ${client.URL}: ${err}`);
        if (err.response?.data?.message) {
          throw new Error(err.response.data.message);
        }
        await delay(2000);
      }
    }
    throw new Error('Failed to send transaction with all fullnodes');
  }

  async balance(address: AccAddress | string): Promise<[Coins, Pagination]> {
    for (const client of this.clients) {
      try {
        const balance = await client.bank.balance(address);
        return balance;
      } catch (err) {
        console.warn(`Failed to get balance with fullnode ${client.URL}: ${err}`);
        await delay(2000);
      }
    }
    throw new Error('Failed to get balance with all fullnodes');
  }

  async balanceByDenom(address: AccAddress | string, denom: string): Promise<Coin> {
    for (const client of this.clients) {
      try {
        const balance = await client.bank.balanceByDenom(address, denom);
        return balance;
      } catch (err) {
        console.warn(`Failed to get balance by denom with fullnode ${client.URL}: ${err}`);
        await delay(2000);
      }
    }
    throw new Error('Failed to get balance with all fullnodes');
  }

  async transfer(sender: Key, recipient: AccAddress, amount: Coins.Input) {
    for (const client of this.clients) {
      try {
        const wallet = new Wallet(client, sender);
        const tx = await wallet.createAndSignTx({
          msgs: [new MsgSend(sender.accAddress, recipient, amount)]
        });
        const result = await client.tx.broadcast(tx);
        return result;
      } catch (err) {
        console.warn(`Failed to transfer: ${client.URL} ${err}`);
        await delay(2000);
      }
    }
    throw new Error('Failed to transfer with all fullnodes');
  }
}
