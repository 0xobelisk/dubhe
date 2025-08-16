import { AccAddress } from '@initia/initia.js';
import {
  MoveModule,
  MoveFunctionGenericTypeParam,
} from '../libs/initiaContractFactory/types';
export type {
  MoveModule,
  MoveFunctionGenericTypeParam,
} from '../libs/initiaContractFactory/types';

export type DubheParams = {
  mnemonics?: string;
  secretKey?: string;
  fullnodeUrls?: string[];
  faucetUrl?: string;
  networkType?: NetworkType;
  packageId?: string;
  chainId?: string;
  metadata?: MoveModule[];
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

// export type MoveModuleValueType = {
//   address: string;
//   name: string;
//   friends: MoveModuleId[];
//   structs: MoveStruct[];
//   exposed_functions: MoveFunction[];
// };

export type MoveModuleFuncType = {
  contractAddress: string;
  moduleName: string;
  funcName: string;
  isEntry: boolean;
  typeParams: MoveFunctionGenericTypeParam[];
  params: string[];
  return: string[];
};

export interface MessageMeta {
  readonly meta: MoveModuleFuncType;
}

export interface ContractQuery extends MessageMeta {
  (): Promise<any>;
  ({
    params,
    typeArguments,
  }: {
    params?: string[];
    typeArguments?: string[];
  }): Promise<any>;
}

export interface ContractTx extends MessageMeta {
  (): Promise<any>;
  ({
    sender,
    params,
    typeArguments,
    isRaw,
  }: {
    sender?: AccAddress | string;
    params?: any[];
    typeArguments?: string[];
    isRaw?: boolean;
  }): Promise<any>;
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
};

export type DerivePathParams = {
  accountIndex?: number;
  // isExternal?: boolean;
  addressIndex?: number;
  coinType?: number;
  eth?: boolean;
};

export type NetworkType = 'mainnet' | 'testnet' | 'localnet';

/**
 * These are the basics types that can be used in the APT
 */
export type MoveBasicTypes =
  | 'address'
  | 'bool'
  | 'u8'
  | 'u16'
  | 'u32'
  | 'u64'
  | 'u128'
  | 'u256';

export type MoveInputTypes = 'object' | MoveBasicTypes;
