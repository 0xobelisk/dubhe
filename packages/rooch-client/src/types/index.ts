import {
  AnnotatedFunctionResultView,
  ExecuteTransactionResponseView,
  ModuleABIView,
  TypeTag,
  NetworkType,
  MoveFunctionTypeParamView,
  Transaction,
} from '@roochnetwork/rooch-sdk';

export type DubheParams = {
  mnemonics?: string;
  secretKey?: string;
  fullnodeUrls?: string[];
  faucetUrl?: string;
  networkType?: NetworkType;
  packageId?: string;
  metadata?: ModuleABIView[];
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
  typeParams: MoveFunctionTypeParamView[];
  params: string[];
  return: string[];
};

export interface MessageMeta {
  readonly meta: MoveModuleFuncType;
}

export interface ContractQuery extends MessageMeta {
  (): Promise<AnnotatedFunctionResultView>;
  ({
    params,
    typeArguments,
  }: {
    params?: any[];
    typeArguments?: TypeTag[];
  }): Promise<AnnotatedFunctionResultView>;
}

export interface ContractTx extends MessageMeta {
  ({
    tx,
    sender,
    params,
    typeArguments,
    isRaw,
  }: {
    tx: Transaction;
    sender?: string;
    params?: any[];
    typeArguments?: TypeTag[];
    isRaw?: boolean;
  }): Promise<ExecuteTransactionResponseView>;
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
  isExternal?: boolean;
  addressIndex?: number;
};

// export type NetworkType = 'mainnet' | 'testnet' | 'devnet' | 'local';

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
