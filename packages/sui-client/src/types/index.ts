import type { Infer } from 'superstruct';
import { any, record, string } from 'superstruct';
import type { BcsType, SerializedBcs } from '@mysten/bcs';
import type { TransactionArgument } from '@mysten/sui/transactions';
import type {
  Transaction,
  TransactionObjectArgument,
  TransactionResult,
  ObjectRef,
  Argument,
  Inputs,
} from '@mysten/sui/transactions';
import type {
  SuiMoveNormalizedModules,
  DevInspectResults,
  SuiTransactionBlockResponse,
  DisplayFieldsResponse,
  SuiMoveNormalizedType,
  MoveStruct,
  SuiMoveNormalizedEnum,
  SuiMoveNormalizedStruct,
} from '@mysten/sui/client';
import { SuiTx } from '../libs/suiTxBuilder';

import { SuiMoveMoudleFuncType } from '../libs/suiContractFactory/types';

export const ObjectContentFields = record(string(), any());
export type ObjectContentFields = Infer<typeof ObjectContentFields>;

export type DubheObjectData = {
  objectId: string;
  objectType: string;
  objectVersion: number;
  objectDisplay: DisplayFieldsResponse;
  objectFields: ObjectContentFields;
};

export type DubheObjectContent = {
  dataType: 'moveObject';
  fields: MoveStruct;
  hasPublicTransfer: boolean;
  type: string;
};

export type DubheParams = {
  mnemonics?: string;
  secretKey?: string;
  fullnodeUrls?: string[];
  faucetUrl?: string;
  networkType?: NetworkType;
  packageId?: string;
  metadata?: SuiMoveNormalizedModules;
};

export type SchemaFieldType = {
  schemas: {
    type: string;
    fields: {
      id: {
        id: string;
      };
      size: string;
    };
  };
};

export type SchemaValueType = {
  id: {
    id: string;
  };
  name: string;
  value: {
    type: string;
    fields: SchemaFieldType;
  };
};

export type SchemaContentType = {
  type: string;
  fields: SchemaValueType;
  hasPublicTransfer: boolean;
  dataType: 'moveObject';
};

export interface MessageMeta {
  readonly meta: SuiMoveMoudleFuncType;
}

export interface ContractQuery extends MessageMeta {
  ({
    tx,
    params,
    typeArguments,
    isRaw,
  }: {
    tx: Transaction;
    params?: (TransactionArgument | SerializedBcs<any>)[];
    typeArguments?: string[];
    isRaw?: boolean;
  }): Promise<DevInspectResults | TransactionResult>;
}

export interface ContractTx extends MessageMeta {
  ({
    tx,
    params,
    typeArguments,
    isRaw,
    onSuccess,
    onError,
  }: {
    tx: Transaction;
    params?: (TransactionArgument | SerializedBcs<any>)[];
    typeArguments?: string[];
    isRaw?: boolean;
    onSuccess?: (result: SuiTransactionBlockResponse) => void | Promise<void>;
    onError?: (error: Error) => void | Promise<void>;
  }): Promise<SuiTransactionBlockResponse | TransactionResult>;
}

export type MapMessageTx = Record<string, ContractTx>;
export type MapMessageQuery = Record<string, ContractQuery>;

export type MapMoudleFuncTx = Record<string, MapMessageTx>;
export type MapMoudleFuncQuery = Record<string, MapMessageQuery>;

// export type MoveStructValueType = {
//   fields: {
//     type: SuiMoveNormalizedType;
//     name: string;
//   }[];
//   abilities: {
//     abilities: string[];
//   };
//   typeParameters: {
//     constraints: {
//       abilities: string[];
//     };
//     isPhantom: boolean;
//   }[];
// };
export type MoveStructType = {
  objectId: string;
  objectType: SuiMoveNormalizedStruct;
  objectName: string;
};

export type MoveEnumType = {
  objectId: string;
  objectType: SuiMoveNormalizedEnum;
  objectName: string;
};

export type MapObjectStruct = Record<string, BcsType<any, any>>;

export type MapMoudleFuncTest = Record<string, Record<string, string>>;
export type MapMoudleFuncQueryTest = Record<string, Record<string, string>>;

export type AccountMangerParams = {
  mnemonics?: string;
  secretKey?: string;
};

export type DerivePathParams = {
  accountIndex?: number;
  isExternal?: boolean;
  addressIndex?: number;
};

export type NetworkType = 'testnet' | 'mainnet' | 'devnet' | 'localnet';
export type FaucetNetworkType = 'testnet' | 'devnet' | 'localnet';

export type SuiKitParams = {
  mnemonics?: string;
  secretKey?: string;
  fullnodeUrls?: string[];
  faucetUrl?: string;
  networkType?: NetworkType;
};

export type ObjectData = {
  objectId: string;
  objectType: string;
  objectVersion: number;
  objectDigest: string;
  initialSharedVersion?: number;
  objectDisplay: DisplayFieldsResponse;
  objectFields: ObjectContentFields;
};
type TransactionBlockType = InstanceType<typeof Transaction>;

export type PureCallArg = {
  Pure: number[];
};

/**
 * An object argument.
 */
type ObjectArg =
  | { ImmOrOwnedObject: SuiObjectRef }
  | { SharedObject: SharedObjectRef }
  | { Receiving: SuiObjectRef };

export type ObjectCallArg = {
  Object: ObjectArg;
};

export type TransactionType = Parameters<TransactionBlockType['add']>;

export type TransactionPureArgument = Extract<
  Argument,
  {
    $kind: 'Input';
    type?: 'pure';
  }
>;

export type ObjectFieldType = {
  id: {
    id: string;
  };
  name: string;
  value: string;
};

export type EntityData = {
  objectId: string;
  index: string;
  key: string;
};

type SharedObjectRef = {
  /** Hex code as string representing the object id */
  objectId: string;

  /** The version the object was shared at */
  initialSharedVersion: number | string;

  /** Whether reference is mutable */
  mutable: boolean;
};

type SuiObjectRef = {
  /** Base64 string representing the object digest */
  objectId: string;
  /** Object version */
  version: number | string;
  /** Hex code as string representing the object id */
  digest: string;
};

export type SuiTxArg = TransactionArgument | SerializedBcs<any>;
export type SuiAddressArg = Argument | SerializedBcs<any> | string;
export type SuiAmountsArg = SuiTxArg | number | bigint;

export type SuiObjectArg =
  | TransactionObjectArgument
  | string
  | Parameters<typeof Inputs.ObjectRef>[0]
  | Parameters<typeof Inputs.SharedObjectRef>[0]
  | ObjectCallArg;

export type SuiVecTxArg =
  | { value: SuiTxArg[]; vecType: SuiInputTypes }
  | SuiTxArg[];

export type DryTxReturnValues = Array<[Uint8Array, string]>;
/**
 * These are the basics types that can be used in the SUI
 */
export type SuiBasicTypes =
  | 'address'
  | 'bool'
  | 'u8'
  | 'u16'
  | 'u32'
  | 'u64'
  | 'u128'
  | 'u256';

export type SuiInputTypes = 'object' | SuiBasicTypes;

export type SuiReturnValues = {
  returnValues: [number[], string][];
}[];

export type DynamicFieldContentType = {
  type: string;
  fields: Record<string, any>;
  hasPublicTransfer: boolean;
  dataType: string;
};

export type ObjectContent = {
  type: string;
  fields: Record<string, any>;
  hasPublicTransfer: boolean;
  dataType: string;
};

export type SuiDubheReturnType<T extends boolean> = T extends true
  ? SuiTransactionBlockResponse
  : SuiTx;
