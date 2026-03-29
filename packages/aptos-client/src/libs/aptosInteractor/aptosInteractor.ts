import {
  AccountAddressInput,
  AccountAuthenticator,
  AnyRawTransaction,
  Aptos,
  AptosConfig,
  HexInput,
  InputGenerateTransactionOptions,
  InputGenerateTransactionPayloadData,
  WaitForTransactionOptions,
  Account,
  Network,
  PendingTransactionResponse,
  MoveStructId,
  LedgerVersionArg,
  MoveModuleBytecode,
  PaginationArgs,
  InputViewFunctionData,
  MoveValue,
  SimpleTransaction
} from '@aptos-labs/ts-sdk';
import { getDefaultURL } from './defaultConfig';
import { delay } from './util';
import { NetworkType } from 'src/types';

/**
 * `SuiTransactionSender` is used to send a transaction with a given gas coin.
 * It always uses the gas coin to pay for the gas,
 * and update the gas coin after the transaction.
 */
export class AptosInteractor {
  public readonly clients: Aptos[];
  public currentClient: Aptos;
  public network: NetworkType;

  constructor(fullNodeUrls: string[], network: NetworkType, indexerUrl?: string) {
    if (fullNodeUrls.length === 0) throw new Error('fullNodeUrls must not be empty');
    this.clients = fullNodeUrls.map((url) => {
      const config = getDefaultURL(network);
      return new Aptos(
        new AptosConfig({
          fullnode: url,
          network: config.network ?? Network.CUSTOM,
          indexer: indexerUrl ?? config.indexer,
          faucet: config.faucet,
          pepper: config.pepper,
          prover: config.prover
        })
      );
    });
    this.currentClient = this.clients[0];
    // this.currentClient = AptosConfig

    this.network = network;

    // // if (Object.values(MovementNetwork).includes(network as MovementNetwork)) {
    // // } else if (Object.values(Network).includes(network as Network)) {
    // // }
    // if (
    //   network !== undefined &&
    //   network !== Network.LOCAL &&
    //   network !== MovementNetwork.LOCAL
    // ) {
    //   this.indexerClient = new IndexerClient(NetworkNameToIndexerAPI[network]);
    // }
  }

  switchToNextClient() {
    const currentClientIdx = this.clients.indexOf(this.currentClient);
    this.currentClient = this.clients[(currentClientIdx + 1) % this.clients.length];
  }

  async buildTransaction({
    sender,
    data,
    options,
    withFeePayer
  }: {
    sender: AccountAddressInput;
    data: InputGenerateTransactionPayloadData;
    options?: InputGenerateTransactionOptions;
    withFeePayer?: boolean;
  }): Promise<SimpleTransaction> {
    return this.currentClient.transaction.build.simple({
      sender,
      data,
      options,
      withFeePayer
    });
  }

  async signTransaction(signer: Account, transaction: AnyRawTransaction) {
    for (const client of this.clients) {
      try {
        const senderAuthenticator = client.transaction.sign({
          signer,
          transaction
        });
        return senderAuthenticator;
      } catch (err) {
        console.warn(`Failed to sign transaction with fullnode ${client.config.fullnode}: ${err}`);
        await delay(2000);
      }
    }
    throw new Error('Failed to sign transaction with all fullnodes');
  }

  async submitSimpleTransaction(
    transaction: AnyRawTransaction,
    senderAuthenticator: AccountAuthenticator,
    feePayerAuthenticator?: AccountAuthenticator
  ) {
    for (const client of this.clients) {
      try {
        const pendingTxn = await client.transaction.submit.simple({
          transaction,
          senderAuthenticator,
          feePayerAuthenticator
        });
        return pendingTxn;
      } catch (err) {
        console.warn(
          `Failed to submit transaction with fullnode ${client.config.fullnode}: ${err}`
        );
        await delay(2000);
      }
    }
    throw new Error('Failed to submit transaction with all fullnodes');
  }

  async waitForTransaction(transactionHash: HexInput, options?: WaitForTransactionOptions) {
    for (const client of this.clients) {
      try {
        const executedTransaction = await client.waitForTransaction({
          transactionHash,
          options
        });
        return executedTransaction;
      } catch (err) {
        console.warn(
          `Failed to wait for transaction: ${transactionHash} with fullnode ${client.config.fullnode}: ${err}`
        );
        await delay(2000);
      }
    }
    throw new Error('Failed to wait for transaction with all fullnodes');
  }

  async sendTxWithPayload(
    signer: Account,
    sender: AccountAddressInput,
    data: InputGenerateTransactionPayloadData,
    options?: InputGenerateTransactionOptions,
    withFeePayer?: boolean,
    feePayerAuthenticator?: AccountAuthenticator
  ): Promise<PendingTransactionResponse> {
    for (const client of this.clients) {
      try {
        const transaction = await client.transaction.build.simple({
          sender,
          data,
          options,
          withFeePayer
        });
        const senderAuthenticator = client.transaction.sign({
          signer,
          transaction
        });
        const committedTransaction = await client.transaction.submit.simple({
          transaction,
          senderAuthenticator,
          feePayerAuthenticator
        });
        return committedTransaction;
      } catch (err) {
        console.warn(`Failed to send transaction with fullnode ${client.config.fullnode}: ${err}`);
        await delay(2000);
      }
    }
    throw new Error('Failed to send transaction with all fullnodes');
  }

  async signAndSubmitTransaction({
    sender,
    transaction
  }: {
    sender: Account;
    transaction: AnyRawTransaction;
  }): Promise<PendingTransactionResponse> {
    for (const client of this.clients) {
      try {
        const committedTransaction = await client.transaction.signAndSubmitTransaction({
          signer: sender,
          transaction: transaction
        });
        return committedTransaction;
      } catch (err) {
        console.warn(`Failed to send transaction with fullnode ${client.config.fullnode}: ${err}`);
        await delay(2000);
      }
    }
    throw new Error('Failed to send transaction with all fullnodes');
  }

  async getAccountResources(accountAddress: string) {
    for (const client of this.clients) {
      try {
        return client.getAccountResources({
          accountAddress
        });
      } catch (err) {
        console.warn(
          `Failed to get AccountResources with fullnode ${client.config.fullnode}: ${err}`
        );
        await delay(2000);
      }
    }
    throw new Error('Failed to get AccountResources with all fullnodes');
  }

  async getAccountResource(
    accountAddress: AccountAddressInput,
    resourceType: MoveStructId,
    options?: LedgerVersionArg
  ) {
    for (const client of this.clients) {
      try {
        return client.getAccountResource({
          accountAddress,
          resourceType,
          options
        });
      } catch (err) {
        console.warn(
          `Failed to get AccountResource with fullnode ${client.config.fullnode}: ${err}`
        );
        await delay(2000);
      }
    }
    throw new Error('Failed to get AccountResource with all fullnodes');
  }

  async getAccountModule(
    accountAddress: AccountAddressInput,
    moduleName: string,
    options?: LedgerVersionArg
  ): Promise<MoveModuleBytecode> {
    for (const client of this.clients) {
      try {
        return client.getAccountModule({
          accountAddress,
          moduleName,
          options
        });
      } catch (err) {
        console.warn(`Failed to get AccountModule with fullnode ${client.config.fullnode}: ${err}`);
        await delay(2000);
      }
    }
    throw new Error('Failed to get AccountModule with all fullnodes');
  }

  async getAccountModules(
    accountAddress: AccountAddressInput,
    options?: PaginationArgs & LedgerVersionArg
  ): Promise<MoveModuleBytecode[]> {
    for (const client of this.clients) {
      try {
        return client.getAccountModules({
          accountAddress,
          options
        });
      } catch (err) {
        console.warn(
          `Failed to get AccountModules with fullnode ${client.config.fullnode}: ${err}`
        );
        await delay(2000);
      }
    }
    throw new Error('Failed to get AccountModules with all fullnodes');
  }

  async view({
    payload,
    options
  }: {
    payload: InputViewFunctionData;
    options?: LedgerVersionArg;
  }): Promise<MoveValue[]> {
    for (const client of this.clients) {
      try {
        return client.view({
          payload,
          options
        });
      } catch (err) {
        console.warn(`Failed to view with fullnode ${client.config.fullnode}: ${err}`);
        await delay(2000);
      }
    }
    throw new Error('Failed to view with all fullnodes');
  }

  async requestFaucet(
    accountAddress: AccountAddressInput,
    amount: number,
    options?: WaitForTransactionOptions
  ) {
    for (const client of this.clients) {
      try {
        return await client.fundAccount({
          accountAddress,
          amount,
          options
        });
      } catch (err) {
        console.warn(`Failed to fund token with fullnode ${client.config.fullnode}: ${err}`);
        await delay(2000);
      }
    }
    throw new Error('Failed to fund token with all fullnodes');
  }

  async publishPackageTransaction({
    account,
    metadataBytes,
    moduleBytecode,
    options
  }: {
    account: AccountAddressInput;
    metadataBytes: HexInput;
    moduleBytecode: HexInput[];
    options?: InputGenerateTransactionOptions;
  }) {
    for (const client of this.clients) {
      try {
        return client.publishPackageTransaction({
          account,
          metadataBytes,
          moduleBytecode,
          options
        });
      } catch (err) {
        console.warn(`Failed to publish package with fullnode ${client.config.fullnode}: ${err}`);
        await delay(2000);
      }
    }
    throw new Error('Failed to publish package with all fullnodes');
  }
}
