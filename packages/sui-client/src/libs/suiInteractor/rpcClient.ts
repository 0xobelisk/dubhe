import { SuiClient } from '@mysten/sui/client';
import type {
  DevInspectTransactionBlockParams,
  ExecuteTransactionBlockParams,
  GetCoinsParams,
  GetNormalizedMoveFunctionParams,
  GetNormalizedMoveModulesByPackageParams,
  GetObjectParams,
  GetOwnedObjectsParams,
  GetTransactionBlockParams,
  MultiGetObjectsParams,
  PaginatedCoins,
  PaginatedObjectsResponse,
  SuiObjectResponse
} from '@mysten/sui/client';
import { isTransaction, type Transaction } from '@mysten/sui/transactions';
import {
  fromBase58,
  fromBase64,
  isValidSuiObjectId,
  isValidTransactionDigest,
  normalizeStructTag,
  normalizeSuiObjectId,
  SUI_TYPE_ARG,
  toBase64,
  toHex
} from '@mysten/sui/utils';
import { getDefaultConfig } from './defaultConfig';
import { loadGrpcMetadata, normalizeFunction } from './grpcMetadata';
import { legacyObjectType, normalizeObject, objectFields } from './grpcObjects';
import { inspectResult, transactionFields, transactionResult } from './grpcTransactions';
import { delay } from './util';

const publicNetworks = ['mainnet', 'testnet'] as const;
type PublicNetwork = (typeof publicNetworks)[number];
const publicEndpoints = {
  mainnet: new URL(getDefaultConfig('mainnet').fullNode),
  testnet: new URL(getDefaultConfig('testnet').fullNode)
};

function objectId(id: string): string {
  const normalized = normalizeSuiObjectId(id);
  if (!id || !isValidSuiObjectId(normalized)) throw new Error(`Invalid Sui object ID ${id}`);
  return normalized;
}

/** Expose the established SDK types while routing public-node requests to current Sui APIs. */
class PublicSuiClient extends SuiClient {
  private grpcConnection?: ReturnType<PublicSuiClient['connectGrpc']>;
  private readonly graphqlEndpoint: string;

  constructor(fullNodeUrl: string, private readonly publicNetwork: PublicNetwork) {
    super({ url: fullNodeUrl, network: publicNetwork });
    this.graphqlEndpoint = `https://graphql.${publicNetwork}.sui.io/graphql`;
  }

  private async connectGrpc() {
    const { SuiGrpcClient, GrpcTypes, GrpcStatusCode, RpcError } = await import(
      '@mysten/sui-v2/grpc'
    );
    return {
      client: new SuiGrpcClient({
        network: this.publicNetwork,
        baseUrl: publicEndpoints[this.publicNetwork].origin
      }),
      proto: GrpcTypes,
      status: GrpcStatusCode,
      RpcError
    };
  }

  private getGrpcConnection() {
    return (this.grpcConnection ??= this.connectGrpc());
  }

  private async getServiceInfo(signal?: AbortSignal) {
    const { client } = await this.getGrpcConnection();
    const { response } = await client.ledgerService.getServiceInfo({}, { abort: signal });
    return response;
  }

  override async getChainIdentifier({ signal }: { signal?: AbortSignal } = {}) {
    const { chainId } = await this.getServiceInfo(signal);
    if (!chainId) {
      throw new Error('Sui gRPC service info is missing the genesis checkpoint digest');
    }
    const digest = fromBase58(chainId);
    if (digest.length !== 32) {
      throw new Error('Sui gRPC service info returned an invalid genesis checkpoint digest');
    }
    // The legacy SDK and Move.toml use the first four bytes of the genesis digest.
    return toHex(digest.subarray(0, 4));
  }

  override async getLatestCheckpointSequenceNumber({ signal }: { signal?: AbortSignal } = {}) {
    const { checkpointHeight } = await this.getServiceInfo(signal);
    if (checkpointHeight === undefined) {
      throw new Error('Sui gRPC service info is missing the checkpoint height');
    }
    return checkpointHeight.toString();
  }

  override async getReferenceGasPrice({ signal }: { signal?: AbortSignal } = {}) {
    const { client } = await this.getGrpcConnection();
    const { response } = await client.ledgerService.getEpoch(
      { readMask: { paths: ['reference_gas_price'] } },
      { abort: signal }
    );
    const gasPrice = response.epoch?.referenceGasPrice;
    if (gasPrice === undefined) {
      throw new Error('Sui gRPC epoch is missing the reference gas price');
    }
    return gasPrice;
  }

  override async getNormalizedMoveModulesByPackage({
    package: packageId,
    signal
  }: GetNormalizedMoveModulesByPackageParams) {
    const { client, proto } = await this.getGrpcConnection();
    const resolved = await client.mvr.resolvePackage({ package: packageId, signal });
    return loadGrpcMetadata(
      client,
      proto,
      this.graphqlEndpoint,
      objectId(resolved.package),
      signal
    );
  }

  override async getNormalizedMoveFunction(input: GetNormalizedMoveFunctionParams) {
    const { client, proto } = await this.getGrpcConnection();
    const resolved = await client.mvr.resolvePackage({
      package: input.package,
      signal: input.signal
    });
    const { response } = await client.movePackageService.getFunction(
      {
        packageId: objectId(resolved.package),
        moduleName: input.module,
        name: input.function
      },
      { abort: input.signal }
    );
    if (!response.function)
      throw new Error(`Sui gRPC is missing Move function ${input.module}::${input.function}`);
    return normalizeFunction(response.function, proto);
  }

  override async getObject(input: GetObjectParams): Promise<SuiObjectResponse> {
    const [result] = await this.multiGetObjects({
      ids: [input.id],
      options: input.options,
      signal: input.signal
    });
    return result;
  }

  override async multiGetObjects({
    ids,
    options: requestedOptions,
    signal
  }: MultiGetObjectsParams): Promise<SuiObjectResponse[]> {
    const options = requestedOptions ?? {};
    const normalized = ids.map(objectId);
    if (new Set(normalized).size !== normalized.length)
      throw new Error('Duplicate object IDs in batch call');
    if (normalized.length === 0) return [];
    const { client, proto, status } = await this.getGrpcConnection();
    const results: SuiObjectResponse[] = [];
    for (let offset = 0; offset < normalized.length; offset += 50) {
      const batch = normalized.slice(offset, offset + 50);
      const { response } = await client.ledgerService.batchGetObjects(
        {
          requests: batch.map((id) => ({ objectId: id })),
          readMask: { paths: objectFields(options) }
        },
        { abort: signal }
      );
      if (response.objects.length !== batch.length)
        throw new Error('Sui gRPC returned an incomplete object batch');
      results.push(
        ...(await Promise.all(
          response.objects.map(async ({ result }, index): Promise<SuiObjectResponse> => {
            if (result.oneofKind === 'object') {
              return {
                data: await normalizeObject(
                  result.object,
                  options,
                  proto,
                  this.graphqlEndpoint,
                  signal
                )
              };
            }
            if (result.oneofKind === 'error' && result.error.code === status.NOT_FOUND) {
              return { error: { code: 'notExists', object_id: batch[index] } };
            }
            throw new Error(
              result.oneofKind === 'error' ? result.error.message : 'Missing Sui gRPC object result'
            );
          })
        ))
      );
    }
    return results;
  }

  override async getOwnedObjects(input: GetOwnedObjectsParams): Promise<PaginatedObjectsResponse> {
    if (input.filter && !('StructType' in input.filter)) {
      throw new Error('Sui gRPC owned-object queries support the StructType filter');
    }
    const { client, proto } = await this.getGrpcConnection();
    const options = input.options ?? {};
    const { response } = await client.stateService.listOwnedObjects(
      {
        owner: objectId(input.owner),
        objectType: input.filter?.StructType,
        pageSize: input.limit ?? undefined,
        pageToken: input.cursor ? fromBase64(input.cursor) : undefined,
        readMask: { paths: objectFields(options) }
      },
      { abort: input.signal }
    );
    const nextCursor = response.nextPageToken?.length ? toBase64(response.nextPageToken) : null;
    return {
      data: await Promise.all(
        response.objects.map(async (object) => ({
          data: await normalizeObject(object, options, proto, this.graphqlEndpoint, input.signal)
        }))
      ),
      nextCursor,
      hasNextPage: nextCursor !== null
    };
  }

  override async getCoins(input: GetCoinsParams): Promise<PaginatedCoins> {
    const { client } = await this.getGrpcConnection();
    const coinType = normalizeStructTag(input.coinType ?? SUI_TYPE_ARG);
    const { response } = await client.stateService.listOwnedObjects(
      {
        owner: objectId(input.owner),
        objectType: `0x2::coin::Coin<${coinType}>`,
        pageSize: input.limit ?? undefined,
        pageToken: input.cursor ? fromBase64(input.cursor) : undefined,
        readMask: { paths: ['object_id', 'version', 'digest', 'balance', 'previous_transaction'] }
      },
      { abort: input.signal }
    );
    const nextCursor = response.nextPageToken?.length ? toBase64(response.nextPageToken) : null;
    return {
      data: response.objects.map(({ objectId, digest, version, balance, previousTransaction }) => {
        if (
          !objectId ||
          !digest ||
          version === undefined ||
          balance === undefined ||
          !previousTransaction
        ) {
          throw new Error('Sui gRPC returned an incomplete coin');
        }
        return {
          coinObjectId: objectId,
          digest,
          coinType: legacyObjectType(coinType),
          version: version.toString(),
          balance: balance.toString(),
          previousTransaction
        };
      }),
      nextCursor,
      hasNextPage: nextCursor !== null
    };
  }

  private async modernTransaction(transaction: Transaction) {
    const { Transaction } = await import('@mysten/sui-v2/transactions');
    const snapshot = await transaction.toJSON({
      client: this,
      supportedIntents: ['CoinWithBalance']
    });
    return Transaction.from(snapshot);
  }

  async buildTransaction(transaction: Transaction): Promise<Uint8Array> {
    const { client } = await this.getGrpcConnection();
    return (await this.modernTransaction(transaction)).build({ client });
  }

  override async devInspectTransactionBlock(input: DevInspectTransactionBlockParams) {
    if (input.epoch !== undefined && input.epoch !== null) {
      throw new Error('The public Sui gRPC simulator uses the current epoch');
    }
    const { client, proto } = await this.getGrpcConnection();
    const { Transaction } = await import('@mysten/sui-v2/transactions');
    const block = input.transactionBlock;
    const tx = isTransaction(block)
      ? await this.modernTransaction(block)
      : Transaction.fromKind(block);
    tx.setSender(input.sender);
    if (input.gasPrice !== undefined && input.gasPrice !== null) tx.setGasPrice(input.gasPrice);
    const result = await client.simulateTransaction({
      transaction: tx,
      checksEnabled: false,
      doGasSelection: false,
      include: { effects: true, events: true, commandResults: true, protoJson: true },
      signal: input.signal
    });
    return inspectResult(proto.SimulateTransactionResponse.fromJson(result.protoJson), proto);
  }

  override async executeTransactionBlock(input: ExecuteTransactionBlockParams) {
    const paths = transactionFields(input.options ?? undefined);
    const { client, proto } = await this.getGrpcConnection();
    const { response } = await client.transactionExecutionService.executeTransaction(
      {
        transaction: {
          bcs: {
            value:
              typeof input.transactionBlock === 'string'
                ? fromBase64(input.transactionBlock)
                : input.transactionBlock
          }
        },
        signatures: (Array.isArray(input.signature) ? input.signature : [input.signature]).map(
          (signature) => ({
            bcs: { value: fromBase64(signature) },
            signature: { oneofKind: undefined }
          })
        ),
        readMask: { paths }
      },
      { abort: input.signal }
    );
    return transactionResult(response.transaction, proto, input.options ?? undefined);
  }

  override async getTransactionBlock(input: GetTransactionBlockParams) {
    if (!isValidTransactionDigest(input.digest)) throw new Error('Invalid Sui transaction digest');
    const paths = transactionFields(input.options ?? undefined);
    const { client, proto } = await this.getGrpcConnection();
    const { response } = await client.ledgerService.getTransaction(
      {
        digest: input.digest,
        readMask: { paths }
      },
      { abort: input.signal }
    );
    return transactionResult(response.transaction, proto, input.options ?? undefined);
  }

  override async waitForTransaction({
    timeout = 60_000,
    pollInterval = 2_000,
    signal,
    ...input
  }: Parameters<SuiClient['waitForTransaction']>[0]) {
    const deadline = AbortSignal.timeout(timeout);
    const waitSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
    const { RpcError } = await this.getGrpcConnection();
    while (!waitSignal.aborted) {
      try {
        const tx = await this.getTransactionBlock({ ...input, signal: waitSignal });
        if (tx.checkpoint != null) return tx;
      } catch (error) {
        if (
          !(error instanceof RpcError) ||
          !['NOT_FOUND', 'UNAVAILABLE', 'INTERNAL'].includes(error.code)
        )
          throw error;
      }
      await delay(pollInterval, waitSignal);
    }
    waitSignal.throwIfAborted();
    throw new Error('Sui transaction confirmation ended without a checkpoint');
  }
}

function getPublicNetwork(fullNodeUrl: string): PublicNetwork | undefined {
  try {
    const { href } = new URL(fullNodeUrl);
    return publicNetworks.find((network) => publicEndpoints[network].href === href);
  } catch {
    return undefined;
  }
}

export function createSuiRpcClient(fullNodeUrl: string): SuiClient {
  const network = getPublicNetwork(fullNodeUrl);
  return network ? new PublicSuiClient(fullNodeUrl, network) : new SuiClient({ url: fullNodeUrl });
}

export function buildSuiTransaction(
  transaction: Transaction,
  client: SuiClient
): Promise<Uint8Array> {
  return client instanceof PublicSuiClient
    ? client.buildTransaction(transaction)
    : transaction.build({ client });
}
