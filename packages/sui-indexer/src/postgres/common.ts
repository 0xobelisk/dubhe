import { Hex } from 'viem';

// only two keys for now, to reduce complexity of creating indexes on SQL tables
// TODO: make tableId optional to enable filtering just on keys (any table)
//       this is blocked on reworking data storage so we can more easily query data across tables
export type SyncFilter = {
  /**
   * Filter by the `bytes32` table ID.
   */
  tableId: Hex;
  /**
   * Optionally filter by the `bytes32` value of the key in the first position (index zero of the record's key tuple).
   */
  key0?: Hex;
  /**
   * Optionally filter by the `bytes32` value of the key in the second position (index one of the record's key tuple).
   */
  key1?: Hex;
};

export type QueryAdapter = {
  findAll: (opts: { chainId: number; address?: Hex; filters?: readonly SyncFilter[] }) => Promise<{
    readonly blockNumber: bigint | null;
    readonly tables: readonly any[];
  }>;
  getLogs: (opts: {
    readonly chainId: number;
    readonly address?: Hex;
    readonly filters?: readonly SyncFilter[];
  }) => Promise<any>;
};
