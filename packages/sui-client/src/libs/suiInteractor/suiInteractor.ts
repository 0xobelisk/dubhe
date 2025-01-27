import { SuiClient } from '@mysten/sui/client';
import type {
  SuiTransactionBlockResponseOptions,
  SuiTransactionBlockResponse,
  SuiObjectDataOptions,
  SuiObjectData,
} from '@mysten/sui/client';
import type * as RpcTypes from '@mysten/sui/dist/cjs/client/types/generated';
import { requestSuiFromFaucetV0, getFaucetHost } from '@mysten/sui/faucet';
import { FaucetNetworkType, NetworkType, ObjectData } from '../../types';
import { SuiOwnedObject, SuiSharedObject } from '../suiModel';
import { delay } from './util';

/**
 * `SuiTransactionSender` is used to send transaction with a given gas coin.
 * It always uses the gas coin to pay for the gas,
 * and update the gas coin after the transaction.
 */
export class SuiInteractor {
  public readonly clients: SuiClient[];
  public currentClient: SuiClient;
  public readonly fullNodes: string[];
  public currentFullNode: string;

  public network?: NetworkType;

  constructor(fullNodeUrls: string[], network?: NetworkType) {
    if (fullNodeUrls.length === 0)
      throw new Error('fullNodeUrls must not be empty');
    this.fullNodes = fullNodeUrls;
    this.clients = fullNodeUrls.map((url) => new SuiClient({ url }));
    this.currentFullNode = fullNodeUrls[0];
    this.currentClient = this.clients[0];
    this.network = network;
  }

  switchToNextClient() {
    const currentClientIdx = this.clients.indexOf(this.currentClient);
    this.currentClient =
      this.clients[(currentClientIdx + 1) % this.clients.length];
    this.currentFullNode =
      this.fullNodes[(currentClientIdx + 1) % this.clients.length];
  }

  async sendTx(
    transactionBlock: Uint8Array | string,
    signature: string | string[]
  ): Promise<SuiTransactionBlockResponse> {
    const txResOptions: SuiTransactionBlockResponseOptions = {
      showEvents: true,
      showEffects: true,
      showObjectChanges: true,
      showBalanceChanges: true,
    };

    // const currentProviderIdx = this.providers.indexOf(this.currentProvider);
    // const providers = [
    //   ...this.providers.slice(currentProviderIdx, this.providers.length),
    //   ...this.providers.slice(0, currentProviderIdx),
    // ]

    for (const clientIdx in this.clients) {
      try {
        return await this.clients[clientIdx].executeTransactionBlock({
          transactionBlock,
          signature,
          options: txResOptions,
        });
      } catch (err) {
        console.warn(
          `Failed to send transaction with fullnode ${this.fullNodes[clientIdx]}: ${err}`
        );
        await delay(2000);
      }
    }
    throw new Error('Failed to send transaction with all fullnodes');
  }

  async waitForTransaction({
    digest,
    timeout = 60 * 1000,
    pollInterval = 2 * 1000,
  }: {
    digest: string;
    timeout?: number;
    pollInterval?: number;
  }) {
    for (const clientIdx in this.clients) {
      try {
        const txResOptions: SuiTransactionBlockResponseOptions = {
          showEvents: true,
          showEffects: true,
          showObjectChanges: true,
          showBalanceChanges: true,
        };

        return await this.clients[clientIdx].waitForTransaction({
          digest,
          timeout,
          pollInterval,
          options: txResOptions,
        });
      } catch (err) {
        console.warn(
          `Failed to wait for transaction with fullnode ${this.fullNodes[clientIdx]}: ${err}`
        );
        await delay(2000);
      }
    }
    throw new Error('Failed to wait for transaction with all fullnodes');
  }

  async getObjects(
    ids: string[],
    options?: SuiObjectDataOptions
  ): Promise<SuiObjectData[]> {
    const opts: SuiObjectDataOptions = options ?? {
      showContent: true,
      showDisplay: true,
      showType: true,
      showOwner: true,
    };

    for (const clientIdx in this.clients) {
      try {
        const objects = await this.clients[clientIdx].multiGetObjects({
          ids,
          options: opts,
        });
        const parsedObjects = objects
          .map((object) => {
            return object.data;
          })
          .filter((object) => object !== null && object !== undefined);
        return parsedObjects as SuiObjectData[];
      } catch (err) {
        await delay(2000);
        console.warn(
          `Failed to get objects with fullnode ${this.fullNodes[clientIdx]}: ${err}`
        );
      }
    }
    throw new Error('Failed to get objects with all fullnodes');
  }

  async getObject(id: string) {
    const objects = await this.getObjects([id]);
    return objects[0];
  }

  async getDynamicFieldObject(
    parentId: string,
    name: RpcTypes.DynamicFieldName
  ) {
    for (const clientIdx in this.clients) {
      try {
        return await this.clients[clientIdx].getDynamicFieldObject({
          parentId,
          name,
        });
      } catch (err) {
        await delay(2000);
        console.warn(
          `Failed to get DynamicFieldObject with fullnode ${this.fullNodes[clientIdx]}: ${err}`
        );
      }
    }
    throw new Error('Failed to get DynamicFieldObject with all fullnodes');
  }

  async getDynamicFields(parentId: string, cursor?: string, limit?: number) {
    for (const clientIdx in this.clients) {
      try {
        return await this.clients[clientIdx].getDynamicFields({
          parentId,
          cursor,
          limit,
        });
      } catch (err) {
        await delay(2000);
        console.warn(
          `Failed to get DynamicFields with fullnode ${this.fullNodes[clientIdx]}: ${err}`
        );
      }
    }
    throw new Error('Failed to get DynamicFields with all fullnodes');
  }

  async getTxDetails(digest: string) {
    for (const clientIdx in this.clients) {
      try {
        const txResOptions: SuiTransactionBlockResponseOptions = {
          showEvents: true,
          showEffects: true,
          showObjectChanges: true,
          showBalanceChanges: true,
        };

        return await this.clients[clientIdx].getTransactionBlock({
          digest,
          options: txResOptions,
        });
      } catch (err) {
        await delay(2000);
        console.warn(
          `Failed to get TransactionBlocks with fullnode ${this.fullNodes[clientIdx]}: ${err}`
        );
      }
    }
    throw new Error('Failed to get TransactionBlocks with all fullnodes');
  }

  async getOwnedObjects(owner: string, cursor?: string, limit?: number) {
    for (const clientIdx in this.clients) {
      try {
        return await this.clients[clientIdx].getOwnedObjects({
          owner,
          cursor,
          limit,
        });
      } catch (err) {
        await delay(2000);
        console.warn(
          `Failed to get OwnedObjects with fullnode ${this.fullNodes[clientIdx]}: ${err}`
        );
      }
    }
    throw new Error('Failed to get OwnedObjects with all fullnodes');
  }

  async getNormalizedMoveModulesByPackage(packageId: string) {
    for (const clientIdx in this.clients) {
      try {
        return await this.clients[clientIdx].getNormalizedMoveModulesByPackage({
          package: packageId,
        });
      } catch (err) {
        await delay(2000);
        console.warn(
          `Failed to get NormalizedMoveModules with fullnode ${this.fullNodes[clientIdx]}: ${err}`
        );
      }
    }
    throw new Error('Failed to get NormalizedMoveModules with all fullnodes');
  }

  /**
   * @description Update objects in a batch
   * @param suiObjects
   */
  async updateObjects(suiObjects: (SuiOwnedObject | SuiSharedObject)[]) {
    const objectIds = suiObjects.map((obj) => obj.objectId);
    const objects = await this.getObjects(objectIds);
    for (const object of objects) {
      const suiObject = suiObjects.find(
        (obj) => obj.objectId === object?.objectId
      );
      if (suiObject instanceof SuiSharedObject) {
        if (
          object.owner &&
          typeof object.owner === 'object' &&
          'Shared' in object.owner
        ) {
          suiObject.initialSharedVersion =
            object.owner.Shared.initial_shared_version;
        } else {
          suiObject.initialSharedVersion = undefined;
        }
      } else if (suiObject instanceof SuiOwnedObject) {
        suiObject.version = object?.version;
        suiObject.digest = object?.digest;
      }
    }
  }

  /**
   * @description Select coins that add up to the given amount.
   * @param addr the address of the owner
   * @param amount the amount that is needed for the coin
   * @param coinType the coin type, default is '0x2::SUI::SUI'
   */
  async selectCoins(
    addr: string,
    amount: number,
    coinType: string = '0x2::SUI::SUI'
  ) {
    const selectedCoins: {
      objectId: string;
      digest: string;
      version: string;
      balance: string;
    }[] = [];
    let totalAmount = 0;
    let hasNext = true,
      nextCursor: string | null | undefined = null;
    while (hasNext && totalAmount < amount) {
      const coins = await this.currentClient.getCoins({
        owner: addr,
        coinType: coinType,
        cursor: nextCursor,
      });
      // Sort the coins by balance in descending order
      coins.data.sort((a, b) => parseInt(b.balance) - parseInt(a.balance));
      for (const coinData of coins.data) {
        selectedCoins.push({
          objectId: coinData.coinObjectId,
          digest: coinData.digest,
          version: coinData.version,
          balance: coinData.balance,
        });
        totalAmount = totalAmount + parseInt(coinData.balance);
        if (totalAmount >= amount) {
          break;
        }
      }

      nextCursor = coins.nextCursor;
      hasNext = coins.hasNextPage;
    }

    if (!selectedCoins.length) {
      throw new Error('No valid coins found for the transaction.');
    }
    return selectedCoins;
  }

  /**
   * @description Select owned objects with objectType.
   * @param addr the address of the owner
   * @param objectType the coin type, default is '0x2::SUI::SUI'
   */
  async selectObjects(addr: string, objectType: string) {
    const selectedObjects = [];
    let hasNext = true,
      nextCursor: string | null | undefined = null;
    while (hasNext) {
      const ownedObjects = await this.currentClient.getOwnedObjects({
        owner: addr,
        cursor: nextCursor,
      });

      for (const objectData of ownedObjects.data) {
        const objectDetail = await this.getObject(objectData.data!.objectId);
        if (objectDetail.type === objectType) {
          selectedObjects.push(objectDetail);
        }
      }

      nextCursor = ownedObjects.nextCursor;
      hasNext = ownedObjects.hasNextPage;
    }

    if (!selectedObjects.length) {
      throw new Error('Not own this object found for the transaction.');
    }
    return selectedObjects;
  }

  async requestFaucet(address: string, network: FaucetNetworkType) {
    await requestSuiFromFaucetV0({
      host: getFaucetHost(network),
      recipient: address,
    });
  }
}
