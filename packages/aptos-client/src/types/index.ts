import {
  AccountAddressInput,
  EntryFunctionArgumentTypes,
  InputGenerateTransactionPayloadData,
  MoveModule,
  MoveValue,
  PendingTransactionResponse,
  PrivateKeyVariants,
  SimpleEntryFunctionArgumentTypes,
  TypeArgument
} from '@aptos-labs/ts-sdk';

import { MoveModuleFuncType } from '../libs/aptosContractFactory/types';

export type DubheParams = {
  mnemonics?: string;
  secretKey?: string;
  fullnodeUrls?: string[];
  faucetUrl?: string;
  networkType?: NetworkType;
  packageId?: string;
  metadata?: MoveModule[];
  signatureType?: PrivateKeyVariants;
};

export type ComponentFieldType = {
  components: {
    type: string;
    fields: {
      id: {
        id: string;
      };
      size: string;
    };
  };
};

export type ComponentValueType = {
  id: {
    id: string;
  };
  name: string;
  value: {
    type: string;
    fields: ComponentFieldType;
  };
};

export type ComponentContentType = {
  type: string;
  fields: ComponentValueType;
  hasPublicTransfer: boolean;
  dataType: 'moveObject';
};

export interface MessageMeta {
  readonly meta: MoveModuleFuncType;
}

export interface ContractQuery extends MessageMeta {
  (): Promise<MoveValue[]>;
  ({
    params,
    typeArguments
  }: {
    params?: Array<EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes>;
    typeArguments?: Array<TypeArgument>;
  }): Promise<MoveValue[]>;
}

export interface ContractTx extends MessageMeta {
  (): Promise<PendingTransactionResponse | InputGenerateTransactionPayloadData>;
  ({
    sender,
    params,
    typeArguments,
    isRaw
  }: {
    sender?: AccountAddressInput;
    params?: Array<EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes>;
    typeArguments?: Array<TypeArgument>;
    isRaw?: boolean;
  }): Promise<PendingTransactionResponse | InputGenerateTransactionPayloadData>;
}

export type MapMessageTx = Record<string, ContractTx>;
export type MapMessageQuery = Record<string, ContractQuery>;

export type MapModuleFuncTx = Record<string, MapMessageTx>;
export type MapModuleFuncQuery = Record<string, MapMessageQuery>;

export type MapModuleFuncTest = Record<string, Record<string, string>>;
export type MapModuleFuncQueryTest = Record<string, Record<string, string>>;

export type AccountMangerParams = {
  mnemonics?: string;
  secretKey?: string;
  signatureType?: PrivateKeyVariants;
};

export type DerivePathParams = {
  accountIndex?: number;
  isExternal?: boolean;
  addressIndex?: number;
};

export type NetworkType =
  | 'mainnet'
  | 'testnet'
  | 'devnet'
  | 'localnet'
  | 'movementmainnet'
  | 'movementtestnet';

/**
 * These are the basics types that can be used in the APT
 */
export type MoveBasicTypes = 'address' | 'bool' | 'u8' | 'u16' | 'u32' | 'u64' | 'u128' | 'u256';

export type MoveInputTypes = 'object' | MoveBasicTypes;
